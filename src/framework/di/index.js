/**
 * TodoLang Dependency Injection Module
 *
 * Exports the dependency injection container and registry
 */

import ServiceContainer from './service-container.js';
import ServiceRegistry from './service-registry.js';

// Create a default global registry instance
const defaultRegistry = new ServiceRegistry();

export {
    ServiceContainer,
    ServiceRegistry,

    // Export default registry instance for convenience
    defaultRegistry as registry
};

// Convenience methods that use the default registry
export const service = (name, constructor, options) => defaultRegistry.service(name, constructor, options);
export const singleton = (name, constructor, dependencies) => defaultRegistry.singleton(name, constructor, dependencies);
export const factory = (name, factory, dependencies) => defaultRegistry.factory(name, factory, dependencies);
export const instance = (name, instance) => defaultRegistry.instance(name, instance);
export const value = (name, value) => defaultRegistry.value(name, value);
export const get = (name) => defaultRegistry.get(name);
export const has = (name) => defaultRegistry.has(name);
export const configure = (config) => defaultRegistry.configure(config);
export const validate = () => defaultRegistry.validate();
export const clear = () => defaultRegistry.clear();