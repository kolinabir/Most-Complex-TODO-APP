/**
 * Custom Storage Abstraction Layer
 * Provides a robust wrapper around localStorage with error handling,
 * serialization, graceful degradation, and quota management
 */

class StorageError extends Error {
  constructor(message, code, originalError = null) {
    super(message);
    this.name = 'StorageError';
    this.code = code;
    this.originalError = originalError;
  }
}

class StorageService {
  constructor() {
    this.isAvailable = this._checkAvailability();
    this.fallbackStorage = new Map();
    this.quotaWarningThreshold = 0.8; // 80% of quota
    this.maxRetries = 3;
  }

  /**
   * Check if localStorage is available and functional
   */
  _checkAvailability() {
    try {
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      console.warn('localStorage is not available, falling back to in-memory storage:', error.message);
      return false;
    }
  }

  /**
   * Serialize data for storage
   */
  _serialize(data) {
    try {
      return JSON.stringify(data);
    } catch (error) {
      throw new StorageError(
        'Failed to serialize data for storage',
        'SERIALIZATION_ERROR',
        error
      );
    }
  }

  /**
   * Deserialize data from storage
   */
  _deserialize(data) {
    if (data === null || data === undefined) {
      return null;
    }

    try {
      return JSON.parse(data);
    } catch (error) {
      throw new StorageError(
        'Failed to deserialize data from storage',
        'DESERIALIZATION_ERROR',
        error
      );
    }
  }

  /**
   * Get storage quota information
   */
  async getQuotaInfo() {
    if (!this.isAvailable) {
      return {
        used: this.fallbackStorage.size,
        total: Infinity,
        available: Infinity,
        percentage: 0
      };
    }

    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        return {
          used: estimate.usage || 0,
          total: estimate.quota || 0,
          available: (estimate.quota || 0) - (estimate.usage || 0),
          percentage: estimate.quota ? (estimate.usage / estimate.quota) : 0
        };
      }
    } catch (error) {
      console.warn('Could not get storage quota information:', error.message);
    }

    // Fallback: estimate based on localStorage content
    const used = this._estimateLocalStorageSize();
    const estimated_total = 5 * 1024 * 1024; // Assume 5MB typical limit

    return {
      used,
      total: estimated_total,
      available: estimated_total - used,
      percentage: used / estimated_total
    };
  }

  /**
   * Estimate localStorage size in bytes
   */
  _estimateLocalStorageSize() {
    let total = 0;
    try {
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          total += key.length + (localStorage[key] || '').length;
        }
      }
    } catch (error) {
      console.warn('Could not estimate localStorage size:', error.message);
    }
    return total * 2; // UTF-16 encoding approximation
  }

  /**
   * Check if storage is approaching quota limit
   */
  async _checkQuotaWarning() {
    const quotaInfo = await this.getQuotaInfo();
    if (quotaInfo.percentage > this.quotaWarningThreshold) {
      console.warn(`Storage quota warning: ${Math.round(quotaInfo.percentage * 100)}% used`);
      return true;
    }
    return false;
  }

  /**
   * Store data with key
   */
  async setItem(key, value, options = {}) {
    const { retries = this.maxRetries, skipQuotaCheck = false } = options;

    if (!key || typeof key !== 'string') {
      throw new StorageError('Invalid key provided', 'INVALID_KEY');
    }

    const serializedValue = this._serialize(value);

    // Check quota before storing large items
    if (!skipQuotaCheck && serializedValue.length > 1024) {
      await this._checkQuotaWarning();
    }

    // Use fallback storage if localStorage is not available
    if (!this.isAvailable) {
      this.fallbackStorage.set(key, serializedValue);
      return;
    }

    let lastError;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        localStorage.setItem(key, serializedValue);
        return;
      } catch (error) {
        lastError = error;

        if (error.name === 'QuotaExceededError' || error.code === 22) {
          // Try to free up space
          if (attempt < retries) {
            await this._performCleanup();
            continue;
          }
          throw new StorageError(
            'Storage quota exceeded and cleanup failed',
            'QUOTA_EXCEEDED',
            error
          );
        }

        // For other errors, don't retry
        break;
      }
    }

    throw new StorageError(
      `Failed to store item after ${retries + 1} attempts`,
      'STORAGE_FAILED',
      lastError
    );
  }

  /**
   * Retrieve data by key
   */
  getItem(key, defaultValue = null) {
    if (!key || typeof key !== 'string') {
      throw new StorageError('Invalid key provided', 'INVALID_KEY');
    }

    try {
      let rawValue;

      if (this.isAvailable) {
        rawValue = localStorage.getItem(key);
      } else {
        rawValue = this.fallbackStorage.get(key);
      }

      if (rawValue === null || rawValue === undefined) {
        return defaultValue;
      }

      return this._deserialize(rawValue);
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }

      console.warn(`Failed to retrieve item '${key}':`, error.message);
      return defaultValue;
    }
  }

  /**
   * Remove item by key
   */
  removeItem(key) {
    if (!key || typeof key !== 'string') {
      throw new StorageError('Invalid key provided', 'INVALID_KEY');
    }

    try {
      if (this.isAvailable) {
        localStorage.removeItem(key);
      } else {
        this.fallbackStorage.delete(key);
      }
    } catch (error) {
      throw new StorageError(
        `Failed to remove item '${key}'`,
        'REMOVAL_FAILED',
        error
      );
    }
  }

  /**
   * Check if key exists
   */
  hasItem(key) {
    if (!key || typeof key !== 'string') {
      return false;
    }

    try {
      if (this.isAvailable) {
        return localStorage.getItem(key) !== null;
      } else {
        return this.fallbackStorage.has(key);
      }
    } catch (error) {
      console.warn(`Failed to check existence of '${key}':`, error.message);
      return false;
    }
  }

  /**
   * Get all keys
   */
  getAllKeys() {
    try {
      if (this.isAvailable) {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key !== null) {
            keys.push(key);
          }
        }
        return keys;
      } else {
        return Array.from(this.fallbackStorage.keys());
      }
    } catch (error) {
      console.warn('Failed to get all keys:', error.message);
      return [];
    }
  }

  /**
   * Clear all storage
   */
  clear() {
    try {
      if (this.isAvailable) {
        localStorage.clear();
      } else {
        this.fallbackStorage.clear();
      }
    } catch (error) {
      throw new StorageError('Failed to clear storage', 'CLEAR_FAILED', error);
    }
  }

  /**
   * Get storage statistics
   */
  async getStats() {
    const quotaInfo = await this.getQuotaInfo();
    const keys = this.getAllKeys();

    return {
      isAvailable: this.isAvailable,
      itemCount: keys.length,
      quota: quotaInfo,
      keys: keys
    };
  }

  /**
   * Perform cleanup to free up storage space
   */
  async _performCleanup() {
    console.log('Performing storage cleanup...');

    // Strategy 1: Remove items with specific cleanup patterns
    const keysToClean = this.getAllKeys().filter(key =>
      key.startsWith('temp_') ||
      key.startsWith('cache_') ||
      key.includes('_expired_')
    );

    for (const key of keysToClean) {
      try {
        this.removeItem(key);
      } catch (error) {
        console.warn(`Failed to remove cleanup key '${key}':`, error.message);
      }
    }

    // Strategy 2: Remove oldest items if we have timestamp-based keys
    const timestampKeys = this.getAllKeys()
      .filter(key => key.includes('_timestamp_'))
      .sort(); // Assuming timestamp is in sortable format

    const itemsToRemove = Math.min(5, Math.floor(timestampKeys.length * 0.1));
    for (let i = 0; i < itemsToRemove; i++) {
      try {
        this.removeItem(timestampKeys[i]);
      } catch (error) {
        console.warn(`Failed to remove old key '${timestampKeys[i]}':`, error.message);
      }
    }

    console.log(`Cleanup completed. Removed ${keysToClean.length + itemsToRemove} items.`);
  }

  /**
   * Batch operations for efficiency
   */
  async setMultiple(items) {
    const results = [];
    for (const [key, value] of Object.entries(items)) {
      try {
        await this.setItem(key, value);
        results.push({ key, success: true });
      } catch (error) {
        results.push({ key, success: false, error: error.message });
      }
    }
    return results;
  }

  /**
   * Get multiple items at once
   */
  getMultiple(keys, defaultValue = null) {
    const results = {};
    for (const key of keys) {
      try {
        results[key] = this.getItem(key, defaultValue);
      } catch (error) {
        results[key] = defaultValue;
        console.warn(`Failed to get item '${key}':`, error.message);
      }
    }
    return results;
  }
}

// Export the service class and error class
export { StorageService, StorageError };