/**
 * Custom Reactive State Management System
 *
 * This module provides a reactive state management system that:
 * - Tracks state changes and triggers updates
 * - Implements subscription system for component re-rendering
 * - Detects state mutations and provides automatic UI synchronization
 */

/**
 * Reactive State Proxy Handler
 * Intercepts property access and mutations to trigger reactivity
 */
class ReactiveHandler {
  constructor(stateManager, path = '') {
    this.stateManager = stateManager;
    this.path = path;
  }

  get(target, property, receiver) {
    const value = Reflect.get(target, property, receiver);
    const fullPath = this.path ? `${this.path}.${property}` : property;

    // Track property access for dependency tracking
    this.stateManager._trackAccess(fullPath);

    // If the value is an object, wrap it in a reactive proxy
    if (value !== null && typeof value === 'object') {
      return new Proxy(value, new ReactiveHandler(this.stateManager, fullPath));
    }

    return value;
  }

  set(target, property, value, receiver) {
    const oldValue = target[property];
    const fullPath = this.path ? `${this.path}.${property}` : property;

    // Set the new value
    const result = Reflect.set(target, property, value, receiver);

    // Only trigger updates if the value actually changed
    if (oldValue !== value) {
      this.stateManager._notifyChange(fullPath, value, oldValue);
    }

    return result;
  }

  deleteProperty(target, property) {
    const oldValue = target[property];
    const fullPath = this.path ? `${this.path}.${property}` : property;

    const result = Reflect.deleteProperty(target, property);

    if (result) {
      this.stateManager._notifyChange(fullPath, undefined, oldValue);
    }

    return result;
  }
}

/**
 * Reactive State Container
 * Wraps state objects with reactive capabilities
 */
class ReactiveState {
  constructor(initialState, stateManager) {
    this._stateManager = stateManager;
    this._state = this._deepClone(initialState);
    this._proxy = new Proxy(this._state, new ReactiveHandler(stateManager));

    return this._proxy;
  }

  _deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj);
    if (obj instanceof Array) return obj.map(item => this._deepClone(item));

    const cloned = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = this._deepClone(obj[key]);
      }
    }
    return cloned;
  }
}

/**
 * Main State Manager Class
 * Manages reactive state, subscriptions, and change notifications
 */
class TodoLangStateManager {
  constructor() {
    this._subscribers = new Map(); // path -> Set of callbacks
    this._globalSubscribers = new Set(); // Global change listeners
    this._currentlyTracking = null; // Currently tracking component
    this._dependencies = new Map(); // component -> Set of paths
    this._states = new Map(); // state id -> reactive state
    this._changeQueue = [];
    this._isProcessingChanges = false;
  }

  /**
   * Create a new reactive state object
   * @param {Object} initialState - Initial state values
   * @param {string} stateId - Optional unique identifier for the state
   * @returns {Proxy} Reactive state proxy
   */
  createState(initialState, stateId = null) {
    const reactiveState = new ReactiveState(initialState, this);

    if (stateId) {
      this._states.set(stateId, reactiveState);
    }

    return reactiveState;
  }

  /**
   * Subscribe to state changes
   * @param {Function} callback - Function to call when state changes
   * @param {string|Array} paths - Specific paths to watch (optional)
   * @returns {Function} Unsubscribe function
   */
  subscribe(callback, paths = null) {
    if (!paths) {
      // Global subscription
      this._globalSubscribers.add(callback);
      return () => this._globalSubscribers.delete(callback);
    }

    // Path-specific subscription
    const pathArray = Array.isArray(paths) ? paths : [paths];
    const unsubscribeFunctions = [];

    pathArray.forEach(path => {
      if (!this._subscribers.has(path)) {
        this._subscribers.set(path, new Set());
      }
      this._subscribers.get(path).add(callback);

      unsubscribeFunctions.push(() => {
        const subscribers = this._subscribers.get(path);
        if (subscribers) {
          subscribers.delete(callback);
          if (subscribers.size === 0) {
            this._subscribers.delete(path);
          }
        }
      });
    });

    // Return combined unsubscribe function
    return () => unsubscribeFunctions.forEach(fn => fn());
  }

  /**
   * Update state at a specific path
   * @param {string} path - Dot-notation path to update
   * @param {any} value - New value to set
   */
  updateState(path, value) {
    // Find the state object that contains this path
    for (const [stateId, state] of this._states) {
      if (this._setValueAtPath(state, path, value)) {
        return;
      }
    }

    // If no specific state found, this might be a direct property update
    throw new Error(`Cannot update state at path: ${path}. State not found.`);
  }

  /**
   * Get current state value at path
   * @param {string} path - Dot-notation path to get
   * @returns {any} Current value at path
   */
  getState(path, stateId = null) {
    if (stateId && this._states.has(stateId)) {
      return this._getValueAtPath(this._states.get(stateId), path);
    }

    // Search all states for the path
    for (const [id, state] of this._states) {
      const value = this._getValueAtPath(state, path);
      if (value !== undefined) {
        return value;
      }
    }

    return undefined;
  }

  /**
   * Start tracking dependencies for a component
   * @param {string} componentId - Unique component identifier
   */
  startTracking(componentId) {
    this._currentlyTracking = componentId;
    if (!this._dependencies.has(componentId)) {
      this._dependencies.set(componentId, new Set());
    } else {
      this._dependencies.get(componentId).clear();
    }
  }

  /**
   * Stop tracking dependencies
   */
  stopTracking() {
    this._currentlyTracking = null;
  }

  /**
   * Clear all dependencies for a component
   * @param {string} componentId - Component identifier
   */
  clearDependencies(componentId) {
    this._dependencies.delete(componentId);
  }

  /**
   * Internal method to track property access
   * @private
   */
  _trackAccess(path) {
    if (this._currentlyTracking) {
      this._dependencies.get(this._currentlyTracking).add(path);
    }
  }

  /**
   * Internal method to notify subscribers of changes
   * @private
   */
  _notifyChange(path, newValue, oldValue) {
    const change = { path, newValue, oldValue, timestamp: Date.now() };
    this._changeQueue.push(change);

    if (!this._isProcessingChanges) {
      this._processChanges();
    }
  }

  /**
   * Process queued changes and notify subscribers
   * @private
   */
  _processChanges() {
    this._isProcessingChanges = true;

    // Use microtask to batch changes
    Promise.resolve().then(() => {
      const changes = [...this._changeQueue];
      this._changeQueue = [];

      // Notify path-specific subscribers
      changes.forEach(change => {
        this._notifyPathSubscribers(change.path, change);
      });

      // Notify global subscribers
      if (changes.length > 0) {
        this._globalSubscribers.forEach(callback => {
          try {
            callback(changes);
          } catch (error) {
            console.error('Error in global state subscriber:', error);
          }
        });
      }

      this._isProcessingChanges = false;

      // Process any changes that were queued during notification
      if (this._changeQueue.length > 0) {
        this._processChanges();
      }
    });
  }

  /**
   * Notify subscribers for a specific path and its parent paths
   * @private
   */
  _notifyPathSubscribers(path, change) {
    const pathParts = path.split('.');

    // Notify subscribers for this path and all parent paths
    for (let i = pathParts.length; i > 0; i--) {
      const currentPath = pathParts.slice(0, i).join('.');
      const subscribers = this._subscribers.get(currentPath);

      if (subscribers) {
        subscribers.forEach(callback => {
          try {
            callback(change, currentPath);
          } catch (error) {
            console.error(`Error in state subscriber for path ${currentPath}:`, error);
          }
        });
      }
    }
  }

  /**
   * Set value at a dot-notation path
   * @private
   */
  _setValueAtPath(obj, path, value) {
    const parts = path.split('.');
    let current = obj;

    try {
      for (let i = 0; i < parts.length - 1; i++) {
        if (!(parts[i] in current)) {
          current[parts[i]] = {};
        }
        current = current[parts[i]];
      }

      current[parts[parts.length - 1]] = value;
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get value at a dot-notation path
   * @private
   */
  _getValueAtPath(obj, path) {
    const parts = path.split('.');
    let current = obj;

    try {
      for (const part of parts) {
        if (current === null || current === undefined) {
          return undefined;
        }
        current = current[part];
      }
      return current;
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Get debug information about the state manager
   * @returns {Object} Debug information
   */
  getDebugInfo() {
    return {
      subscriberCount: this._subscribers.size,
      globalSubscriberCount: this._globalSubscribers.size,
      stateCount: this._states.size,
      dependencyCount: this._dependencies.size,
      queuedChanges: this._changeQueue.length,
      isProcessingChanges: this._isProcessingChanges
    };
  }
}

// Export the state manager and related classes
export {
  TodoLangStateManager,
  ReactiveState,
  ReactiveHandler
};