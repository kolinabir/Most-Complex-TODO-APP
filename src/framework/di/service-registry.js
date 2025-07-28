/**
 * TodoLang Service Registry
 *
 * Provides a convenient API for service registration and common patterns
 */

import ServiceContainer from './service-container.js';

class ServiceRegistry {
    constructor() {
        this.container = new ServiceContainer();
        this._autoWireEnabled = false;
    }

    /**
     * Enable automatic dependency injection based on constructor parameters
     * @param {lean} enabled - Whether to enable auto-wiring
     */
    enableAutoWire(enabled = true) {
        this._autoWireEnabled = enabled;
        return this;
    }

    /**
     * Register a service with automatic dependency detection
     * @param {string} name - Service name
     * @param {Function} constructor - Service constructor
     * @param {Object} options - Registration options
     */
    service(name, constructor, options = {}) {
        let dependencies = options.dependencies || [];

        // Auto-wire dependencies if enabled
        if (this._autoWireEnabled && dependencies.length === 0) {
            dependencies = this._extractDependencies(constructor);
        }

        return this.container.register(name, constructor, {
            ...options,
            dependencies
        });
    }

    /**
     * Register a singleton service
     * @param {string} name - Service name
     * @param {Function} constructor - Service constructor
     * @param {Array} dependencies - Service dependencies
     */
    singleton(name, constructor, dependencies = []) {
        return this.container.registerSingleton(name, constructor, dependencies);
    }

    /**
     * Register a factory service
     * @param {string} name - Service name
     * @param {Function} factory - Factory function
     * @param {Array} dependencies - Service dependencies
     */
    factory(name, factory, dependencies = []) {
        return this.container.registerFactory(name, factory, dependencies);
    }

    /**
     * Register an instance
     * @param {string} name - Service name
     * @param {Object} instance - Service instance
     */
    instance(name, instance) {
        return this.container.registerInstance(name, instance);
    }

    /**
     * Register a value (alias for instance)
     * @param {string} name - Value name
     * @param {*} value - Value to register
     */
    value(name, value) {
        return this.container.registerInstance(name, value);
    }

    /**
     * Resolve a service
     * @param {string} name - Service name
     * @returns {Object} - Resolved service
     */
    get(name) {
        return this.container.resolve(name);
    }

    /**
     * Check if service exists
     * @param {string} name - Service name
     * @returns {boolean} - True if service exists
     */
    has(name) {
        return this.container.has(name);
    }

    /**
     * Register multiple services from a configuration object
     * @param {Object} config - Service configuration
     */
    configure(config) {
        for (const [name, serviceConfig] of Object.entries(config)) {
            if (serviceConfig.type === 'singleton') {
                this.singleton(name, serviceConfig.constructor, serviceConfig.dependencies);
            } else if (serviceConfig.type === 'factory') {
                this.factory(name, serviceConfig.factory, serviceConfig.dependencies);
            } else if (serviceConfig.type === 'instance') {
                this.instance(name, serviceConfig.instance);
            } else {
                this.service(name, serviceConfig.constructor, serviceConfig);
            }
        }
        return this;
    }

    /**
     * Create a child registry that inherits from this one
     * @returns {ServiceRegistry} - Child registry
     */
    createChild() {
        const child = new ServiceRegistry();

        // Copy parent services to child
        for (const [name, config] of this.container.services.entries()) {
            child.container.services.set(name, { ...config });
        }

        // Copy parent instances to child
        for (const [name, instance] of this.container.instances.entries()) {
            child.container.instances.set(name, instance);
        }

        return child;
    }

    /**
     * Extract dependencies from constructor function (basic implementation)
     * @private
     * @param {Function} constructor - Constructor function
     * @returns {Array<string>} - Dependency names
     */
    _extractDependencies(constructor) {
        // This is a simplified implementation
        // In a real-world scenario, you might use AST parsing or annotations
        const funcStr = constructor.toString();
        const match = funcStr.match(/constructor\s*\(([^)]*)\)/);

        if (!match || !match[1].trim()) {
            return [];
        }

        return match[1]
            .split(',')
            .map(param => param.trim())
            .filter(param => param.length > 0)
            .map(param => {
                // Remove default values and destructuring
                return param.split('=')[0].trim().replace(/[{}]/g, '');
            });
    }

    /**
     * Validate all services
     * @returns {Array<string>} - Validation errors
     */
    validate() {
        return this.container.validateServices();
    }

    /**
     * Clear all services
     */
    clear() {
        this.container.clear();
        return this;
    }

    /**
     * Get the underlying container
     * @returns {ServiceContainer} - Service container
     */
    getContainer() {
        return this.container;
    }
}

export default ServiceRegistry;