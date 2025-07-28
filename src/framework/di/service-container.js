/**
 * TodoLang Dependency Injection Container
 *
 * Provides service registration, resolution, and lifecycle management
 * with support for singleton and factory patterns, plus circular dependency detection.
 */

class ServiceContainer {
    constructor() {
        this.services = new Map();
        this.instances = new Map();
        this.resolutionStack = new Set();
    }

    /**
     * Register a service with the container
     * @param {string} name - Service name/identifier
     * @param {F|Object} definition - Service constructor or factory function
     * @param {Object} options - Registration options
     */
    register(name, definition, options = {}) {
        if (typeof name !== 'string' || !name.trim()) {
            throw new Error('Service name must be a non-empty string');
        }

        if (typeof definition !== 'function' && typeof definition !== 'object') {
            throw new Error('Service definition must be a function or object');
        }

        const serviceConfig = {
            name,
            definition,
            lifecycle: options.lifecycle || 'singleton', // 'singleton' or 'factory'
            dependencies: options.dependencies || [],
            factory: options.factory || false,
            instance: null,
            resolved: false
        };

        // Validate lifecycle option
        if (!['singleton', 'factory'].includes(serviceConfig.lifecycle)) {
            throw new Error('Lifecycle must be either "singleton" or "factory"');
        }

        // Validate dependencies array
        if (!Array.isArray(serviceConfig.dependencies)) {
            throw new Error('Dependencies must be an array');
        }

        this.services.set(name, serviceConfig);
        return this;
    }

    /**
     * Register a singleton service
     * @param {string} name - Service name
     * @param {Function} constructor - Service constructor
     * @param {Array} dependencies - Service dependencies
     */
    registerSingleton(name, constructor, dependencies = []) {
        return this.register(name, constructor, {
            lifecycle: 'singleton',
            dependencies
        });
    }

    /**
     * Register a factory service
     * @param {string} name - Service name
     * @param {Function} factory - Factory function
     * @param {Array} dependencies - Service dependencies
     */
    registerFactory(name, factory, dependencies = []) {
        return this.register(name, factory, {
            lifecycle: 'factory',
            dependencies,
            factory: true
        });
    }

    /**
     * Register an instance directly
     * @param {string} name - Service name
     * @param {Object} instance - Service instance
     */
    registerInstance(name, instance) {
        if (typeof name !== 'string' || !name.trim()) {
            throw new Error('Service name must be a non-empty string');
        }

        const serviceConfig = {
            name,
            definition: null,
            lifecycle: 'singleton',
            dependencies: [],
            factory: false,
            instance,
            resolved: true
        };

        this.services.set(name, serviceConfig);
        this.instances.set(name, instance);
        return this;
    }

    /**
     * Resolve a service by name
     * @param {string} name - Service name to resolve
     * @returns {Object} - Resolved service instance
     */
    resolve(name) {
        if (typeof name !== 'string' || !name.trim()) {
            throw new Error('Service name must be a non-empty string');
        }

        // Check for circular dependency
        if (this.resolutionStack.has(name)) {
            const cycle = Array.from(this.resolutionStack).join(' -> ') + ' -> ' + name;
            throw new Error(`Circular dependency detected: ${cycle}`);
        }

        const serviceConfig = this.services.get(name);
        if (!serviceConfig) {
            throw new Error(`Service '${name}' is not registered`);
        }

        // Return existing singleton instance
        if (serviceConfig.lifecycle === 'singleton' && serviceConfig.resolved) {
            return serviceConfig.instance;
        }

        // Add to resolution stack for circular dependency detection
        this.resolutionStack.add(name);

        try {
            const instance = this._createInstance(serviceConfig);

            // Store singleton instance
            if (serviceConfig.lifecycle === 'singleton') {
                serviceConfig.instance = instance;
                serviceConfig.resolved = true;
                this.instances.set(name, instance);
            }

            return instance;
        } finally {
            // Remove from resolution stack
            this.resolutionStack.delete(name);
        }
    }

    /**
     * Create an instance of a service
     * @private
     * @param {Object} serviceConfig - Service configuration
     * @returns {Object} - Service instance
     */
    _createInstance(serviceConfig) {
        const { definition, dependencies, factory } = serviceConfig;

        // Resolve dependencies
        const resolvedDependencies = dependencies.map(dep => {
            if (typeof dep === 'string') {
                return this.resolve(dep);
            } else if (typeof dep === 'object' && dep.name) {
                return this.resolve(dep.name);
            } else {
                throw new Error(`Invalid dependency format: ${dep}`);
            }
        });

        // Handle factory functions
        if (factory) {
            return definition(...resolvedDependencies);
        }

        // Handle constructor functions
        if (typeof definition === 'function') {
            return new definition(...resolvedDependencies);
        }

        // Handle object instances
        if (typeof definition === 'object') {
            return definition;
        }

        throw new Error(`Unable to create instance for service '${serviceConfig.name}'`);
    }

    /**
     * Check if a service is registered
     * @param {string} name - Service name
     * @returns {boolean} - True if service is registered
     */
    has(name) {
        return this.services.has(name);
    }

    /**
     * Get all registered service names
     * @returns {Array<string>} - Array of service names
     */
    getServiceNames() {
        return Array.from(this.services.keys());
    }

    /**
     * Clear all services and instances
     */
    clear() {
        this.services.clear();
        this.instances.clear();
        this.resolutionStack.clear();
    }

    /**
     * Remove a specific service
     * @param {string} name - Service name to remove
     */
    remove(name) {
        this.services.delete(name);
        this.instances.delete(name);
    }

    /**
     * Get service configuration (for debugging)
     * @param {string} name - Service name
     * @returns {Object} - Service configuration
     */
    getServiceConfig(name) {
        const config = this.services.get(name);
        if (!config) {
            throw new Error(`Service '${name}' is not registered`);
        }

        return {
            name: config.name,
            lifecycle: config.lifecycle,
            dependencies: config.dependencies,
            resolved: config.resolved,
            hasInstance: config.instance !== null
        };
    }

    /**
     * Validate all registered services for circular dependencies
     * @returns {Array<string>} - Array of validation errors
     */
    validateServices() {
        const errors = [];
        const visited = new Set();
        const visiting = new Set();

        const visit = (serviceName, path = []) => {
            if (visiting.has(serviceName)) {
                const cycle = path.concat(serviceName).join(' -> ');
                errors.push(`Circular dependency: ${cycle}`);
                return;
            }

            if (visited.has(serviceName)) {
                return;
            }

            const serviceConfig = this.services.get(serviceName);
            if (!serviceConfig) {
                errors.push(`Service '${serviceName}' is referenced but not registered`);
                return;
            }

            visiting.add(serviceName);

            for (const dep of serviceConfig.dependencies) {
                const depName = typeof dep === 'string' ? dep : dep.name;
                visit(depName, path.concat(serviceName));
            }

            visiting.delete(serviceName);
            visited.add(serviceName);
        };

        // Check all registered services
        for (const serviceName of this.services.keys()) {
            if (!visited.has(serviceName)) {
                visit(serviceName);
            }
        }

        return errors;
    }
}

export default ServiceContainer;