/**
 * Tests for ServiceRegistry
 */

import ServiceRegistry from '../../../src/framework/di/service-registry.js';

describe('ServiceRegistry', () => {
    let registry;

    beforeEach(() => {
        registry = new ServiceRegistry();
    });

    describe('Service Registration', () => {
        test('should register service using service method', () => {
            class TestService {
                constructor() {
                    this.name = 'test';
                }
            }

            registry.service('test', TestService);
            expect(registry.has('test')).toBe(true);

            const instance = registry.get('test');
            expect(instance).toBeInstanceOf(TestService);
        });

        test('should register singleton service', () => {
            class TestService {
                constructor() {
                    this.id = Math.random();
                }
            }

            registry.singleton('test', TestService);

            const instance1 = registry.get('test');
            const instance2 = registry.get('test');

            expect(instance1).toBe(instance2);
        });

        test('should register factory service', () => {
            const factory = () => ({ id: Math.random() });

            registry.factory('test', factory);

            const instance1 = registry.get('test');
            const instance2 = registry.get('test');

            expect(instance1).not.toBe(instance2);
        });

        test('should register instance', () => {
            const instance = { name: 'test' };

            registry.instance('test', instance);

            const resolved = registry.get('test');
            expect(resolved).toBe(instance);
        });

        test('should register value', () => {
            const value = 'test-value';

            registry.value('config', value);

            const resolved = registry.get('config');
            expect(resolved).toBe(value);
        });
    });

    describe('Service Configuration', () => {
        test('should configure multiple services', () => {
            class ServiceA {}
            class ServiceB {}
            const instanceC = { name: 'C' };
            const factoryD = () => ({ name: 'D' });

            const config = {
                serviceA: {
                    type: 'singleton',
                    constructor: ServiceA
                },
                serviceB: {
                    constructor: ServiceB,
                    dependencies: ['serviceA']
                },
                serviceC: {
                    type: 'instance',
                    instance: instanceC
                },
                serviceD: {
                    type: 'factory',
                    factory: factoryD
                }
            };

            registry.configure(config);

            expect(registry.has('serviceA')).toBe(true);
            expect(registry.has('serviceB')).toBe(true);
            expect(registry.has('serviceC')).toBe(true);
            expect(registry.has('serviceD')).toBe(true);

            const resolvedC = registry.get('serviceC');
            expect(resolvedC).toBe(instanceC);
        });
    });

    describe('Auto-wiring', () => {
        test('should enable auto-wiring', () => {
            registry.enableAutoWire(true);

            // This is a basic test - in a real implementation,
            // auto-wiring would analyze constructor parameters
            class TestService {
                constructor(dependency) {
                    this.dependency = dependency;
                }
            }

            registry.service('test', TestService);
            expect(registry.has('test')).toBe(true);
        });

        test('should extract dependencies from constructor', () => {
            class TestService {
                constructor(database, logger) {
                    this.database = database;
                    this.logger = logger;
                }
            }

            // Test the private method indirectly
            const dependencies = registry._extractDependencies(TestService);
            expect(dependencies).toEqual(['database', 'logger']);
        });

        test('should handle constructor without parameters', () => {
            class TestService {
                constructor() {
                    this.name = 'test';
                }
            }

            const dependencies = registry._extractDependencies(TestService);
            expect(dependencies).toEqual([]);
        });
    });

    describe('Child Registry', () => {
        test('should create child registry with inherited services', () => {
            class ParentService {}
            registry.singleton('parent', ParentService);

            const child = registry.createChild();

            expect(child.has('parent')).toBe(true);

            // Child should have its own container
            expect(child.getContainer()).not.toBe(registry.getContainer());
        });

        test('should allow child to override parent services', () => {
            class ParentService {
                constructor() {
                    this.type = 'parent';
                }
            }

            class ChildService {
                constructor() {
                    this.type = 'child';
                }
            }

            registry.singleton('service', ParentService);
            const child = registry.createChild();
            child.singleton('service', ChildService);

            const parentInstance = registry.get('service');
            const childInstance = child.get('service');

            expect(parentInstance.type).toBe('parent');
            expect(childInstance.type).toBe('child');
        });
    });

    describe('Validation', () => {
        test('should validate services', () => {
            class ServiceA {}
            class ServiceB {
                constructor(serviceA) {
                    this.serviceA = serviceA;
                }
            }

            registry.singleton('serviceA', ServiceA);
            registry.singleton('serviceB', ServiceB, ['serviceA']);

            const errors = registry.validate();
            expect(errors).toHaveLength(0);
        });

        test('should detect validation errors', () => {
            class ServiceB {
                constructor(serviceA) {
                    this.serviceA = serviceA;
                }
            }

            registry.singleton('serviceB', ServiceB, ['serviceA']);

            const errors = registry.validate();
            expect(errors.length).toBeGreaterThan(0);
        });
    });

    describe('Registry Management', () => {
        test('should clear registry', () => {
            registry.singleton('test', () => {});
            expect(registry.has('test')).toBe(true);

            registry.clear();
            expect(registry.has('test')).toBe(false);
        });

        test('should get underlying container', () => {
            const container = registry.getContainer();
            expect(container).toBeDefined();
            expect(typeof container.resolve).toBe('function');
        });
    });
});