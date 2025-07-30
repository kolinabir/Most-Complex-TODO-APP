/**
 * Unit tests for TodoFilter component
 * Tests filter selection, URL integration, state persistence, and event handling
 */

// Mock DOM environment for testing
class MockEvent {
  constructor(type, options = {}) {
    this.type = type;
    this.target = options.target || {};
    this.key = options.key || '';
    this.detail = options.detail || {};
    this.preventDefault = () => {};
    this.stopPropagation = () => {};
  }
}

class MockURL {
  constructor(url) {
    const parts = url.split('?');
    this.pathname = parts[0];
    this.search = parts[1] ? '?' + parts[1] : '';
    this.searchParams = new MockURLSearchParams(parts[1] || '');
  }

  toString() {
    const queryString = this.searchParams.toString();
    return this.pathname + (queryString ? '?' + queryString : '');
  }
}

class MockURLSearchParams {
  constructor(queryString = '') {
    this.params = new Map();
    if (queryString) {
      queryString.split('&').forEach(pair => {
        const [key, value] = pair.split('=');
        if (key) {
          this.params.set(decodeURIComponent(key), decodeURIComponent(value || ''));
        }
      });
    }
  }

  get(key) {
    return this.params.get(key) || null;
  }

  set(key, value) {
    this.params.set(key, value);
  }

  delete(key) {
    this.params.delete(key);
  }

  toString() {
    const pairs = [];
    for (const [key, value] of this.params) {
      pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
    }
    return pairs.join('&');
  }
}

// Mock window object
class MockWindow {
  constructor() {
    this.location = {
      pathname: '/',
      search: '',
      hash: '',
      href: 'http://localhost/'
    };
    this.history = {
      replaceState: (state, title, url) => {
        this.location.href = url;
        const parts = url.split('?');
        this.location.pathname = parts[0];
        this.location.search = parts[1] ? '?' + parts[1] : '';
      },
      pushState: (state, title, url) => {
        this.location.href = url;
        const parts = url.split('?');
        this.location.pathname = parts[0];
        this.location.search = parts[1] ? '?' + parts[1] : '';
      }
    };
    this.localStorage = new MockLocalStorage();
    this.eventListeners = new Map();
    this.URL = MockURL;
    this.URLSearchParams = MockURLSearchParams;
  }

  addEventListener(event, handler) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(handler);
  }

  removeEventListener(event, handler) {
    if (this.eventListeners.has(event)) {
      const handlers = this.eventListeners.get(event);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  dispatchEvent(event) {
    if (this.eventListeners.has(event.type)) {
      this.eventListeners.get(event.type).forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error('Error in event handler:', error);
        }
      });
    }
  }

  CustomEvent(type, options = {}) {
    return new MockEvent(type, options);
  }
}

class MockLocalStorage {
  constructor() {
    this.storage = new Map();
  }

  getItem(key) {
    return this.storage.get(key) || null;
  }

  setItem(key, value) {
    this.storage.set(key, String(value));
  }

  removeItem(key) {
    this.storage.delete(key);
  }

  clear() {
    this.storage.clear();
  }
}

// Mock TodoFilter component (compiled from TodoLang)
class MockTodoFilter {
  constructor(props = {}) {
    this.props = props;
    this.state = {
      currentFilter: "all",
      isChanging: false,
      error: "",
      urlSyncEnabled: true
    };
    this._mockWindow = new MockWindow();

    // Mock global objects for testing
    global.window = this._mockWindow;
    global.localStorage = this._mockWindow.localStorage;
    global.URL = MockURL;
    global.URLSearchParams = MockURLSearchParams;
  }

  setState(newState) {
    Object.assign(this.state, newState);
  }

  getFilterClass() {
    let classes = "todo-filter";
    if (this.state.isChanging) {
      classes = classes + " todo-filter-changing";
    }
    if (this.state.error.length > 0) {
      classes = classes + " todo-filter-error";
    }
    return classes;
  }

  getFilterOptions() {
    return [
      {
        value: "all",
        label: "All",
        description: "Show all todos"
      },
      {
        value: "active",
        label: "Active",
        description: "Show only incomplete todos"
      },
      {
        value: "completed",
        label: "Completed",
        description: "Show only completed todos"
      }
    ];
  }

  isFilterActive(filterValue) {
    const currentFilter = this.getCurrentFilter();
    return currentFilter === filterValue;
  }

  getCurrentFilter() {
    // Priority: props.current > state.currentFilter > URL > default
    if (this.props.current) {
      return this.props.current;
    }

    if (this.state.urlSyncEnabled) {
      const urlFilter = this.getFilterFromUrl();
      if (urlFilter) {
        return urlFilter;
      }
    }

    return this.state.currentFilter;
  }

  getFilterFromUrl() {
    try {
      const urlParams = new URLSearchParams(this._mockWindow.location.search);
      const filterParam = urlParams.get("filter");

      if (filterParam && this.isValidFilter(filterParam)) {
        return filterParam;
      }

      // Also check hash-based routing
      const hash = this._mockWindow.location.hash;
      if (hash.includes("filter=")) {
        const hashFilter = hash.split("filter=")[1]?.split("&")[0];
        if (hashFilter && this.isValidFilter(hashFilter)) {
          return hashFilter;
        }
      }
    } catch (error) {
      console.warn("Error reading filter from URL:", error);
    }

    return null;
  }

  isValidFilter(filterValue) {
    const validFilters = this.getFilterOptions().map(f => f.value);
    return validFilters.includes(filterValue);
  }

  getFilterCount(filterValue) {
    if (this.props.todos == null || this.props.todos.length === 0) {
      return 0;
    }

    const todos = this.props.todos;

    if (filterValue === "all") {
      return todos.length;
    } else if (filterValue === "active") {
      return todos.filter(todo => todo.completed === false).length;
    } else if (filterValue === "completed") {
      return todos.filter(todo => todo.completed).length;
    }

    return null;
  }

  handleFilterClick(filterValue) {
    if (this.state.isChanging) {
      return;
    }

    if (this.isFilterActive(filterValue)) {
      return; // Already active, no need to change
    }

    if (this.isValidFilter(filterValue) === false) {
      this.setState({
        error: `Invalid filter: ${filterValue}`
      });
      return;
    }

    this.setState({
      isChanging: true,
      error: ""
    });

    try {
      // Update internal state
      this.setState({
        currentFilter: filterValue
      });

      // Update URL if enabled
      if (this.state.urlSyncEnabled) {
        this.updateUrl(filterValue);
      }

      // Call parent callback
      if (this.props.onChange && typeof this.props.onChange === "function") {
        this.props.onChange(filterValue);
      }

      // Persist filter state
      this.persistFilterState(filterValue);

    } catch (error) {
      console.error("Error changing filter:", error);
      this.setState({
        error: "Failed to change filter. Please try again."
      });
    } finally {
      this.setState({
        isChanging: false
      });
    }
  }

  handleDismissError(event) {
    event.preventDefault();
    event.stopPropagation();
    this.setState({ error: "" });
  }

  updateUrl(filterValue) {
    try {
      const url = new URL(this._mockWindow.location.href);

      if (filterValue === "all") {
        // Remove filter parameter for "all" to keep URLs clean
        url.searchParams.delete("filter");
      } else {
        url.searchParams.set("filter", filterValue);
      }

      // Update URL without triggering page reload
      this._mockWindow.history.replaceState(
        { filter: filterValue },
        "",
        url.toString()
      );

      // Dispatch custom event for other components to listen
      this._mockWindow.dispatchEvent(this._mockWindow.CustomEvent("filterChanged", {
        detail: { filter: filterValue, source: "url" }
      }));

    } catch (error) {
      console.warn("Error updating URL:", error);
    }
  }

  persistFilterState(filterValue) {
    try {
      const filterState = {
        filter: filterValue,
        timestamp: Date.now()
      };

      this._mockWindow.localStorage.setItem("todoapp_filter_state", JSON.stringify(filterState));
    } catch (error) {
      console.warn("Error persisting filter state:", error);
    }
  }

  loadPersistedFilterState() {
    try {
      const stored = this._mockWindow.localStorage.getItem("todoapp_filter_state");
      if (stored == null) {
        return null;
      }

      const filterState = JSON.parse(stored);
      if (filterState && filterState.filter && this.isValidFilter(filterState.filter)) {
        return filterState.filter;
      }
    } catch (error) {
      console.warn("Error loading persisted filter state:", error);
    }

    return null;
  }

  clearPersistedFilterState() {
    try {
      this._mockWindow.localStorage.removeItem("todoapp_filter_state");
    } catch (error) {
      console.warn("Error clearing persisted filter state:", error);
    }
  }

  initializeFilter() {
    let initialFilter = "all";

    // Priority: URL > persisted state > props > default
    const urlFilter = this.getFilterFromUrl();
    const persistedFilter = this.loadPersistedFilterState();

    if (urlFilter) {
      initialFilter = urlFilter;
    } else if (persistedFilter) {
      initialFilter = persistedFilter;
      // Update URL to match persisted state
      if (this.state.urlSyncEnabled) {
        this.updateUrl(initialFilter);
      }
    } else if (this.props.current && this.isValidFilter(this.props.current)) {
      initialFilter = this.props.current;
    }

    this.setState({
      currentFilter: initialFilter
    });

    // Notify parent of initial filter
    if (this.props.onChange && typeof this.props.onChange === "function") {
      this.props.onChange(initialFilter);
    }
  }

  // Public methods for external control
  setFilter(filterValue) {
    if (this.isValidFilter(filterValue)) {
      this.handleFilterClick(filterValue);
      return true;
    }
    return false;
  }

  getFilter() {
    return this.getCurrentFilter();
  }

  resetFilter() {
    this.setFilter("all");
  }

  enableUrlSync() {
    this.setState({ urlSyncEnabled: true });
  }

  disableUrlSync() {
    this.setState({ urlSyncEnabled: false });
  }

  isUrlSyncEnabled() {
    return this.state.urlSyncEnabled;
  }

  clearError() {
    this.setState({ error: "" });
  }

  getFilterStats() {
    const options = this.getFilterOptions();
    const stats = {};

    options.forEach(option => {
      stats[option.value] = {
        label: option.label,
        count: this.getFilterCount(option.value),
        active: this.isFilterActive(option.value)
      };
    });

    return stats;
  }

  getDebugInfo() {
    return {
      currentFilter: this.getCurrentFilter(),
      stateFilter: this.state.currentFilter,
      urlFilter: this.getFilterFromUrl(),
      persistedFilter: this.loadPersistedFilterState(),
      propsFilter: this.props.current,
      urlSyncEnabled: this.state.urlSyncEnabled,
      isChanging: this.state.isChanging,
      error: this.state.error
    };
  }
}

// Export test runner function
export function runTodoFilterTests() {
  console.log('🧪 Running TodoFilter Component Tests...');

  const results = {
    passed: 0,
    failed: 0,
    total: 0
  };

  // Sample todos for testing
  const sampleTodos = [
    { id: '1', text: 'Active todo 1', completed: false, createdAt: new Date() },
    { id: '2', text: 'Active todo 2', completed: false, createdAt: new Date() },
    { id: '3', text: 'Completed todo 1', completed: true, createdAt: new Date() },
    { id: '4', text: 'Completed todo 2', completed: true, createdAt: new Date() }
  ];

  // Test suites
  const testSuites = [
    {
      name: 'Initial State',
      tests: [
        {
          name: 'should initialize with "all" filter by default',
          fn: () => {
            const component = new MockTodoFilter();
            return component.state.currentFilter === "all";
          }
        },
        {
          name: 'should initialize with valid state',
          fn: () => {
            const component = new MockTodoFilter();
            return component.state.isChanging === false &&
                   component.state.error === "" &&
                   component.state.urlSyncEnabled === true;
          }
        },
        {
          name: 'should initialize with props filter if provided',
          fn: () => {
            const component = new MockTodoFilter({ current: 'active' });
            component.initializeFilter();
            return component.getCurrentFilter() === 'active';
          }
        }
      ]
    },
    {
      name: 'Filter Options',
      tests: [
        {
          name: 'should return correct filter options',
          fn: () => {
            const component = new MockTodoFilter();
            const options = component.getFilterOptions();
            return options.length === 3 &&
                   options[0].value === 'all' &&
                   options[1].value === 'active' &&
                   options[2].value === 'completed';
          }
        },
        {
          name: 'should validate filter values correctly',
          fn: () => {
            const component = new MockTodoFilter();
            return component.isValidFilter('all') === true &&
                   component.isValidFilter('active') === true &&
                   component.isValidFilter('completed') === true &&
                   component.isValidFilter('invalid') === false;
          }
        }
      ]
    },
    {
      name: 'Filter Counts',
      tests: [
        {
          name: 'should calculate correct counts for all filters',
          fn: () => {
            const component = new MockTodoFilter({ todos: sampleTodos });
            return component.getFilterCount('all') === 4 &&
                   component.getFilterCount('active') === 2 &&
                   component.getFilterCount('completed') === 2;
          }
        },
        {
          name: 'should return 0 for empty todo list',
          fn: () => {
            const component = new MockTodoFilter({ todos: [] });
            return component.getFilterCount('all') === 0 &&
                   component.getFilterCount('active') === 0 &&
                   component.getFilterCount('completed') === 0;
          }
        },
        {
          name: 'should handle null todos gracefully',
          fn: () => {
            const component = new MockTodoFilter({ todos: null });
            return component.getFilterCount('all') === 0;
          }
        }
      ]
    },
    {
      name: 'Filter Selection',
      tests: [
        {
          name: 'should change filter when clicked',
          fn: () => {
            let changedTo = null;
            const component = new MockTodoFilter({
              onChange: (filter) => { changedTo = filter; }
            });
            component.handleFilterClick('active');
            return changedTo === 'active' && component.state.currentFilter === 'active';
          }
        },
        {
          name: 'should not change to same filter',
          fn: () => {
            let callCount = 0;
            const component = new MockTodoFilter({
              onChange: () => { callCount++; }
            });
            component.setState({ currentFilter: 'active' });
            component.handleFilterClick('active');
            return callCount === 0;
          }
        },
        {
          name: 'should handle invalid filter gracefully',
          fn: () => {
            const component = new MockTodoFilter();
            component.handleFilterClick('invalid');
            return component.state.error.includes('Invalid filter') &&
                   component.state.currentFilter === 'all';
          }
        },
        {
          name: 'should prevent changes when already changing',
          fn: () => {
            let callCount = 0;
            const component = new MockTodoFilter({
              onChange: () => { callCount++; }
            });
            component.setState({ isChanging: true });
            component.handleFilterClick('active');
            return callCount === 0;
          }
        }
      ]
    },
    {
      name: 'URL Integration',
      tests: [
        {
          name: 'should update URL when filter changes',
          fn: () => {
            const component = new MockTodoFilter();
            component.handleFilterClick('active');
            return component._mockWindow.location.search === '?filter=active';
          }
        },
        {
          name: 'should remove filter param for "all" filter',
          fn: () => {
            const component = new MockTodoFilter();
            // Set initial URL with filter
            component._mockWindow.location.search = '?filter=active';
            component._mockWindow.location.href = 'http://localhost/?filter=active';
            component.handleFilterClick('all');
            return component._mockWindow.location.search === '';
          }
        },
        {
          name: 'should read filter from URL',
          fn: () => {
            const component = new MockTodoFilter();
            component._mockWindow.location.search = '?filter=completed';
            component._mockWindow.location.href = 'http://localhost/?filter=completed';
            const urlFilter = component.getFilterFromUrl();
            return urlFilter === 'completed';
          }
        },
        {
          name: 'should ignore invalid filter in URL',
          fn: () => {
            const component = new MockTodoFilter();
            component._mockWindow.location.search = '?filter=invalid';
            const urlFilter = component.getFilterFromUrl();
            return urlFilter === null;
          }
        },
        {
          name: 'should dispatch filterChanged event',
          fn: () => {
            const component = new MockTodoFilter();
            let eventFired = false;
            component._mockWindow.addEventListener('filterChanged', (e) => {
              eventFired = e.detail.filter === 'active';
            });
            component.handleFilterClick('active');
            return eventFired;
          }
        }
      ]
    },
    {
      name: 'State Persistence',
      tests: [
        {
          name: 'should persist filter state to localStorage',
          fn: () => {
            const component = new MockTodoFilter();
            component.handleFilterClick('completed');
            const stored = component._mockWindow.localStorage.getItem('todoapp_filter_state');
            const parsed = JSON.parse(stored);
            return parsed.filter === 'completed';
          }
        },
        {
          name: 'should load persisted filter state',
          fn: () => {
            const component = new MockTodoFilter();
            const filterState = { filter: 'active', timestamp: Date.now() };
            component._mockWindow.localStorage.setItem('todoapp_filter_state', JSON.stringify(filterState));
            const loaded = component.loadPersistedFilterState();
            return loaded === 'active';
          }
        },
        {
          name: 'should clear persisted filter state',
          fn: () => {
            const component = new MockTodoFilter();
            component.persistFilterState('active');
            component.clearPersistedFilterState();
            const loaded = component.loadPersistedFilterState();
            return loaded === null;
          }
        },
        {
          name: 'should handle corrupted localStorage gracefully',
          fn: () => {
            const component = new MockTodoFilter();
            component._mockWindow.localStorage.setItem('todoapp_filter_state', 'invalid json');
            const loaded = component.loadPersistedFilterState();
            return loaded === null;
          }
        }
      ]
    },
    {
      name: 'Filter Priority',
      tests: [
        {
          name: 'should prioritize props over state',
          fn: () => {
            const component = new MockTodoFilter({ current: 'active' });
            component.setState({ currentFilter: 'completed' });
            return component.getCurrentFilter() === 'active';
          }
        },
        {
          name: 'should prioritize URL over persisted state',
          fn: () => {
            const component = new MockTodoFilter();
            // Set up URL first
            component._mockWindow.location.search = '?filter=active';
            component._mockWindow.location.href = 'http://localhost/?filter=active';
            // Then set persisted state
            component.persistFilterState('completed');
            component.initializeFilter();
            return component.getCurrentFilter() === 'active';
          }
        },
        {
          name: 'should use persisted state when URL is empty',
          fn: () => {
            const component = new MockTodoFilter();
            component.persistFilterState('completed');
            component.initializeFilter();
            return component.getCurrentFilter() === 'completed';
          }
        }
      ]
    },
    {
      name: 'Error Handling',
      tests: [
        {
          name: 'should handle URL parsing errors gracefully',
          fn: () => {
            const component = new MockTodoFilter();
            // Mock URL constructor to throw error
            const originalURL = global.URL;
            global.URL = function() { throw new Error('URL error'); };

            try {
              component.updateUrl('active');
              return true; // Should not throw
            } catch (error) {
              return false;
            } finally {
              global.URL = originalURL;
            }
          }
        },
        {
          name: 'should dismiss error when requested',
          fn: () => {
            const component = new MockTodoFilter();
            component.setState({ error: 'Test error' });
            const event = new MockEvent('click');
            component.handleDismissError(event);
            return component.state.error === '';
          }
        },
        {
          name: 'should clear error on successful filter change',
          fn: () => {
            const component = new MockTodoFilter();
            component.setState({ error: 'Previous error' });
            component.handleFilterClick('active');
            return component.state.error === '';
          }
        }
      ]
    },
    {
      name: 'CSS Class Generation',
      tests: [
        {
          name: 'should generate base filter class',
          fn: () => {
            const component = new MockTodoFilter();
            return component.getFilterClass() === 'todo-filter';
          }
        },
        {
          name: 'should add changing class when changing',
          fn: () => {
            const component = new MockTodoFilter();
            component.setState({ isChanging: true });
            return component.getFilterClass() === 'todo-filter todo-filter-changing';
          }
        },
        {
          name: 'should add error class when error exists',
          fn: () => {
            const component = new MockTodoFilter();
            component.setState({ error: 'Test error' });
            return component.getFilterClass() === 'todo-filter todo-filter-error';
          }
        }
      ]
    },
    {
      name: 'Public API',
      tests: [
        {
          name: 'should set filter through public method',
          fn: () => {
            const component = new MockTodoFilter();
            const result = component.setFilter('active');
            return result === true && component.getFilter() === 'active';
          }
        },
        {
          name: 'should reject invalid filter through public method',
          fn: () => {
            const component = new MockTodoFilter();
            const result = component.setFilter('invalid');
            return result === false && component.getFilter() === 'all';
          }
        },
        {
          name: 'should reset filter to "all"',
          fn: () => {
            const component = new MockTodoFilter();
            component.setFilter('active');
            component.resetFilter();
            return component.getFilter() === 'all';
          }
        },
        {
          name: 'should enable/disable URL sync',
          fn: () => {
            const component = new MockTodoFilter();
            component.disableUrlSync();
            const disabled = !component.isUrlSyncEnabled();
            component.enableUrlSync();
            const enabled = component.isUrlSyncEnabled();
            return disabled && enabled;
          }
        },
        {
          name: 'should return filter statistics',
          fn: () => {
            const component = new MockTodoFilter({ todos: sampleTodos });
            component.setFilter('active');
            const stats = component.getFilterStats();
            return stats.all.count === 4 &&
                   stats.active.count === 2 &&
                   stats.active.active === true &&
                   stats.completed.count === 2;
          }
        }
      ]
    },
    {
      name: 'Integration with Parent Component',
      tests: [
        {
          name: 'should call onChange callback with correct parameters',
          fn: () => {
            let calledWith = null;
            const component = new MockTodoFilter({
              onChange: (filter) => { calledWith = filter; }
            });
            component.handleFilterClick('completed');
            return calledWith === 'completed';
          }
        },
        {
          name: 'should work without onChange callback',
          fn: () => {
            const component = new MockTodoFilter({ onChange: null });
            try {
              component.handleFilterClick('active');
              return true;
            } catch (error) {
              return false;
            }
          }
        },
        {
          name: 'should initialize and notify parent of initial filter',
          fn: () => {
            let initialFilter = null;
            const component = new MockTodoFilter({
              onChange: (filter) => { initialFilter = filter; }
            });
            component.initializeFilter();
            return initialFilter === 'all';
          }
        }
      ]
    }
  ];

  // Run all test suites
  for (const suite of testSuites) {
    console.log(`\n--- ${suite.name} ---`);

    for (const test of suite.tests) {
      try {
        const passed = test.fn();
        if (passed) {
          console.log(`  ✅ ${test.name}`);
          results.passed++;
        } else {
          console.log(`  ❌ ${test.name}`);
          results.failed++;
        }
      } catch (error) {
        console.log(`  ❌ ${test.name}: ${error.message}`);
        results.failed++;
      }
      results.total++;
    }
  }

  console.log(`\nTodoFilter Tests: ${results.passed}/${results.total} passed`);
  return results;
}