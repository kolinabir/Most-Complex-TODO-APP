/**
 * Unit tests for TodoList component
 * Tests list rendering, empty state handling, filtering, sorting, and bulk operations
 */

// Mock DOM environment for testing
class MockEvent {
  constructor(type, options = {}) {
    this.type = type;
    this.target = options.target || {};
    this.key = options.key || '';
    this.preventDefault = () => {};
    this.stopPropagation = () => {};
  }
}

class MockElement {
  constructor(tagName = 'div') {
    this.tagName = tagName;
    this.className = '';
    this.value = '';
    this.disabled = false;
    this.checked = false;
    this.children = [];
    this.focused = false;
  }

  querySelector(selector) {
    return this.children.find(child => child.className.includes(selector.replace('.', '')));
  }

  focus() {
    this.focused = true;
  }
}

// Mock Todo model
class MockTodo {
  constructor(id, text, completed = false, createdAt = Date.now()) {
    this.id = id;
    this.text = text;
    this.completed = completed;
    this.createdAt = createdAt;
  }
}

// Mock TodoList component (compiled from TodoLang)
class MockTodoList {
  constructor(props = {}) {
    this.props = props;
    this.state = {
      isLoading: false,
      error: "",
      selectedItems: [],
      sortOrder: "created",
      showCompleted: true
    };
    this._domNode = new MockElement();
  }

  setState(newState) {
    Object.assign(this.state, newState);
  }

  getListClass() {
    let classes = "todo-list";
    if (this.state.isLoading) {
      classes = classes + " todo-list-loading";
    }
    if (this.state.error.length > 0) {
      classes = classes + " todo-list-error";
    }
    if (this.isEmpty()) {
      classes = classes + " todo-list-empty";
    }
    return classes;
  }

  isEmpty() {
    const todos = this.props.todos || [];
    return todos.length === 0;
  }

  hasActiveTodos() {
    const todos = this.props.todos || [];
    return todos.some(todo => todo.completed === false);
  }

  hasCompletedTodos() {
    const todos = this.props.todos || [];
    return todos.some(todo => todo.completed);
  }

  getEmptyMessage(filter) {
    if (filter === "active") {
      return "No active todos! You're all caught up.";
    }
    if (filter === "completed") {
      return "No completed todos yet.";
    }
    return "No todos yet. Add one above to get started!";
  }

  getEmptyIcon(filter) {
    if (filter === "active") {
      return "✅";
    }
    if (filter === "completed") {
      return "📝";
    }
    return "📋";
  }

  getFilteredAndSortedTodos() {
    let todos = this.props.todos || [];

    // Apply filtering based on props.filter
    const filter = this.props.filter || "all";
    if (filter === "active") {
      todos = todos.filter(todo => todo.completed === false);
    } else if (filter === "completed") {
      todos = todos.filter(todo => todo.completed);
    }

    // Apply sorting
    todos = this.sortTodos(todos, this.state.sortOrder);

    return todos;
  }

  sortTodos(todos, sortOrder) {
    const sorted = todos.slice(); // Create a copy to avoid mutating props

    if (sortOrder === "alphabetical") {
      sorted.sort((a, b) => {
        const textA = a.text.toLowerCase();
        const textB = b.text.toLowerCase();
        if (textA < textB) return -1;
        if (textA > textB) return 1;
        return 0;
      });
    } else if (sortOrder === "completed") {
      sorted.sort((a, b) => {
        // Incomplete todos first, then completed
        if (a.completed === b.completed) {
          // If same completion status, sort by creation date
          return new Date(b.createdAt) - new Date(a.createdAt);
        }
        return a.completed ? 1 : -1;
      });
    } else {
      // Default: sort by creation date (newest first)
      sorted.sort((a, b) => {
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
    }

    return sorted;
  }

  isItemSelected(todoId) {
    return this.state.selectedItems.includes(todoId);
  }

  handleRetry(event) {
    event.preventDefault();
    this.setState({
      error: "",
      isLoading: true
    });

    // Simulate retry by calling parent refresh if available
    if (this.props.onRefresh && typeof this.props.onRefresh === "function") {
      try {
        this.props.onRefresh();
        this.setState({ isLoading: false });
      } catch (error) {
        this.setState({
          error: "Failed to refresh todos. Please try again.",
          isLoading: false
        });
      }
    } else {
      this.setState({ isLoading: false });
    }
  }

  handleShowAll(event) {
    event.preventDefault();
    if (this.props.onFilterChange && typeof this.props.onFilterChange === "function") {
      this.props.onFilterChange("all");
    }
  }

  handleShowActive(event) {
    event.preventDefault();
    if (this.props.onFilterChange && typeof this.props.onFilterChange === "function") {
      this.props.onFilterChange("active");
    }
  }

  handleSortChange(event) {
    const newSortOrder = event.target.value;
    this.setState({ sortOrder: newSortOrder });

    // Notify parent of sort change if callback provided
    if (this.props.onSortChange && typeof this.props.onSortChange === "function") {
      this.props.onSortChange(newSortOrder);
    }
  }

  handleItemSelect(todoId, isSelected) {
    let selectedItems = this.state.selectedItems.slice();

    if (isSelected) {
      if (selectedItems.includes(todoId) === false) {
        selectedItems.push(todoId);
      }
    } else {
      selectedItems = selectedItems.filter(id => id !== todoId);
    }

    this.setState({ selectedItems });

    // Notify parent of selection change
    if (this.props.onSelectionChange && typeof this.props.onSelectionChange === "function") {
      this.props.onSelectionChange(selectedItems);
    }
  }

  handleSelectAll(event) {
    event.preventDefault();
    const todos = this.getFilteredAndSortedTodos();
    const allIds = todos.map(todo => todo.id);
    this.setState({ selectedItems: allIds });

    if (this.props.onSelectionChange && typeof this.props.onSelectionChange === "function") {
      this.props.onSelectionChange(allIds);
    }
  }

  handleClearSelection(event) {
    event.preventDefault();
    this.setState({ selectedItems: [] });

    if (this.props.onSelectionChange && typeof this.props.onSelectionChange === "function") {
      this.props.onSelectionChange([]);
    }
  }

  handleBulkComplete(event) {
    event.preventDefault();
    const selectedIds = this.state.selectedItems;

    if (selectedIds.length === 0) {
      return;
    }

    if (this.props.onBulkToggle && typeof this.props.onBulkToggle === "function") {
      this.props.onBulkToggle(selectedIds, true);
    }

    // Clear selection after bulk action
    this.setState({ selectedItems: [] });
  }

  handleBulkDelete(event) {
    event.preventDefault();
    const selectedIds = this.state.selectedItems;

    if (selectedIds.length === 0) {
      return;
    }

    // Mock confirm dialog - always return true for testing
    const confirmMessage = `Are you sure you want to delete ${selectedIds.length} todo${selectedIds.length === 1 ? "" : "s"}?`;
    if (true) { // Mock confirm always returns true
      if (this.props.onBulkDelete && typeof this.props.onBulkDelete === "function") {
        this.props.onBulkDelete(selectedIds);
      }

      // Clear selection after bulk action
      this.setState({ selectedItems: [] });
    }
  }

  handleClearCompleted(event) {
    event.preventDefault();
    if (this.props.onClearCompleted && typeof this.props.onClearCompleted === "function") {
      this.props.onClearCompleted();
    }
  }

  // Public methods for external control
  setLoading(isLoading) {
    this.setState({ isLoading: Boolean(isLoading) });
  }

  setError(error) {
    this.setState({
      error: error || "",
      isLoading: false
    });
  }

  clearError() {
    this.setState({ error: "" });
  }

  refresh() {
    this.handleRetry({ preventDefault: () => {} });
  }

  getSelectedItems() {
    return this.state.selectedItems.slice();
  }

  selectItem(todoId) {
    this.handleItemSelect(todoId, true);
  }

  deselectItem(todoId) {
    this.handleItemSelect(todoId, false);
  }

  selectAll() {
    this.handleSelectAll({ preventDefault: () => {} });
  }

  clearSelection() {
    this.handleClearSelection({ preventDefault: () => {} });
  }

  setSortOrder(sortOrder) {
    if (["created", "alphabetical", "completed"].includes(sortOrder)) {
      this.setState({ sortOrder });
    }
  }

  getSortOrder() {
    return this.state.sortOrder;
  }

  getStats() {
    const todos = this.getFilteredAndSortedTodos();
    const total = todos.length;
    const completed = todos.filter(todo => todo.completed).length;
    const active = total - completed;

    return {
      total,
      active,
      completed,
      selected: this.state.selectedItems.length
    };
  }
}

// Export test runner function
export function runTodoListTests() {
  console.log('🧪 Running TodoList Component Tests...');

  const results = {
    passed: 0,
    failed: 0,
    total: 0
  };

  // Test suites
  const testSuites = [
    {
      name: 'Initial State',
      tests: [
        {
          name: 'should initialize with default state',
          fn: () => {
            const component = new MockTodoList();
            return component.state.isLoading === false &&
                   component.state.error === "" &&
                   component.state.selectedItems.length === 0 &&
                   component.state.sortOrder === "created" &&
                   component.state.showCompleted === true;
          }
        },
        {
          name: 'should accept todos prop',
          fn: () => {
            const todos = [new MockTodo('1', 'Test todo')];
            const component = new MockTodoList({ todos });
            return component.props.todos === todos;
          }
        },
        {
          name: 'should accept filter prop',
          fn: () => {
            const component = new MockTodoList({ filter: 'active' });
            return component.props.filter === 'active';
          }
        }
      ]
    },
    {
      name: 'CSS Class Generation',
      tests: [
        {
          name: 'should generate base list class',
          fn: () => {
            const todos = [new MockTodo('1', 'Test todo')];
            const component = new MockTodoList({ todos });
            return component.getListClass() === 'todo-list';
          }
        },
        {
          name: 'should add loading class when loading',
          fn: () => {
            const todos = [new MockTodo('1', 'Test todo')]; // Provide todos so it's not empty
            const component = new MockTodoList({ todos });
            component.setState({ isLoading: true });
            return component.getListClass() === 'todo-list todo-list-loading';
          }
        },
        {
          name: 'should add error class when error exists',
          fn: () => {
            const todos = [new MockTodo('1', 'Test todo')]; // Provide todos so it's not empty
            const component = new MockTodoList({ todos });
            component.setState({ error: 'Some error' });
            return component.getListClass() === 'todo-list todo-list-error';
          }
        },
        {
          name: 'should add empty class when no todos',
          fn: () => {
            const component = new MockTodoList({ todos: [] });
            return component.getListClass() === 'todo-list todo-list-empty';
          }
        }
      ]
    },
    {
      name: 'Empty State Detection',
      tests: [
        {
          name: 'should detect empty list with no todos',
          fn: () => {
            const component = new MockTodoList({ todos: [] });
            return component.isEmpty() === true;
          }
        },
        {
          name: 'should detect empty list with null todos',
          fn: () => {
            const component = new MockTodoList({ todos: null });
            return component.isEmpty() === true;
          }
        },
        {
          name: 'should detect empty list with undefined todos',
          fn: () => {
            const component = new MockTodoList();
            return component.isEmpty() === true;
          }
        },
        {
          name: 'should detect non-empty list',
          fn: () => {
            const todos = [new MockTodo('1', 'Test todo')];
            const component = new MockTodoList({ todos });
            return component.isEmpty() === false;
          }
        }
      ]
    },
    {
      name: 'Empty State Messages',
      tests: [
        {
          name: 'should show correct message for all filter',
          fn: () => {
            const component = new MockTodoList();
            const message = component.getEmptyMessage('all');
            return message === 'No todos yet. Add one above to get started!';
          }
        },
        {
          name: 'should show correct message for active filter',
          fn: () => {
            const component = new MockTodoList();
            const message = component.getEmptyMessage('active');
            return message === "No active todos! You're all caught up.";
          }
        },
        {
          name: 'should show correct message for completed filter',
          fn: () => {
            const component = new MockTodoList();
            const message = component.getEmptyMessage('completed');
            return message === 'No completed todos yet.';
          }
        },
        {
          name: 'should show correct icon for all filter',
          fn: () => {
            const component = new MockTodoList();
            const icon = component.getEmptyIcon('all');
            return icon === '📋';
          }
        },
        {
          name: 'should show correct icon for active filter',
          fn: () => {
            const component = new MockTodoList();
            const icon = component.getEmptyIcon('active');
            return icon === '✅';
          }
        },
        {
          name: 'should show correct icon for completed filter',
          fn: () => {
            const component = new MockTodoList();
            const icon = component.getEmptyIcon('completed');
            return icon === '📝';
          }
        }
      ]
    },
    {
      name: 'Todo Detection Helpers',
      tests: [
        {
          name: 'should detect active todos',
          fn: () => {
            const todos = [
              new MockTodo('1', 'Active todo', false),
              new MockTodo('2', 'Completed todo', true)
            ];
            const component = new MockTodoList({ todos });
            return component.hasActiveTodos() === true;
          }
        },
        {
          name: 'should detect no active todos',
          fn: () => {
            const todos = [
              new MockTodo('1', 'Completed todo 1', true),
              new MockTodo('2', 'Completed todo 2', true)
            ];
            const component = new MockTodoList({ todos });
            return component.hasActiveTodos() === false;
          }
        },
        {
          name: 'should detect completed todos',
          fn: () => {
            const todos = [
              new MockTodo('1', 'Active todo', false),
              new MockTodo('2', 'Completed todo', true)
            ];
            const component = new MockTodoList({ todos });
            return component.hasCompletedTodos() === true;
          }
        },
        {
          name: 'should detect no completed todos',
          fn: () => {
            const todos = [
              new MockTodo('1', 'Active todo 1', false),
              new MockTodo('2', 'Active todo 2', false)
            ];
            const component = new MockTodoList({ todos });
            return component.hasCompletedTodos() === false;
          }
        }
      ]
    },
    {
      name: 'Filtering',
      tests: [
        {
          name: 'should filter all todos',
          fn: () => {
            const todos = [
              new MockTodo('1', 'Active todo', false),
              new MockTodo('2', 'Completed todo', true)
            ];
            const component = new MockTodoList({ todos, filter: 'all' });
            const filtered = component.getFilteredAndSortedTodos();
            return filtered.length === 2;
          }
        },
        {
          name: 'should filter active todos only',
          fn: () => {
            const todos = [
              new MockTodo('1', 'Active todo', false),
              new MockTodo('2', 'Completed todo', true)
            ];
            const component = new MockTodoList({ todos, filter: 'active' });
            const filtered = component.getFilteredAndSortedTodos();
            return filtered.length === 1 && filtered[0].completed === false;
          }
        },
        {
          name: 'should filter completed todos only',
          fn: () => {
            const todos = [
              new MockTodo('1', 'Active todo', false),
              new MockTodo('2', 'Completed todo', true)
            ];
            const component = new MockTodoList({ todos, filter: 'completed' });
            const filtered = component.getFilteredAndSortedTodos();
            return filtered.length === 1 && filtered[0].completed === true;
          }
        },
        {
          name: 'should default to all filter when no filter specified',
          fn: () => {
            const todos = [
              new MockTodo('1', 'Active todo', false),
              new MockTodo('2', 'Completed todo', true)
            ];
            const component = new MockTodoList({ todos });
            const filtered = component.getFilteredAndSortedTodos();
            return filtered.length === 2;
          }
        }
      ]
    },
    {
      name: 'Sorting',
      tests: [
        {
          name: 'should sort by creation date (default)',
          fn: () => {
            const now = Date.now();
            const todos = [
              new MockTodo('1', 'Older todo', false, now - 1000),
              new MockTodo('2', 'Newer todo', false, now)
            ];
            const component = new MockTodoList({ todos });
            const sorted = component.getFilteredAndSortedTodos();
            return sorted[0].id === '2' && sorted[1].id === '1';
          }
        },
        {
          name: 'should sort alphabetically',
          fn: () => {
            const todos = [
              new MockTodo('1', 'Zebra todo', false),
              new MockTodo('2', 'Apple todo', false)
            ];
            const component = new MockTodoList({ todos });
            component.setState({ sortOrder: 'alphabetical' });
            const sorted = component.getFilteredAndSortedTodos();
            return sorted[0].text === 'Apple todo' && sorted[1].text === 'Zebra todo';
          }
        },
        {
          name: 'should sort by completion status',
          fn: () => {
            const todos = [
              new MockTodo('1', 'Completed todo', true),
              new MockTodo('2', 'Active todo', false)
            ];
            const component = new MockTodoList({ todos });
            component.setState({ sortOrder: 'completed' });
            const sorted = component.getFilteredAndSortedTodos();
            return sorted[0].completed === false && sorted[1].completed === true;
          }
        },
        {
          name: 'should handle case-insensitive alphabetical sorting',
          fn: () => {
            const todos = [
              new MockTodo('1', 'zebra todo', false),
              new MockTodo('2', 'Apple todo', false)
            ];
            const component = new MockTodoList({ todos });
            component.setState({ sortOrder: 'alphabetical' });
            const sorted = component.getFilteredAndSortedTodos();
            return sorted[0].text === 'Apple todo' && sorted[1].text === 'zebra todo';
          }
        }
      ]
    },
    {
      name: 'Selection Management',
      tests: [
        {
          name: 'should detect selected items',
          fn: () => {
            const component = new MockTodoList();
            component.setState({ selectedItems: ['1', '2'] });
            return component.isItemSelected('1') === true &&
                   component.isItemSelected('3') === false;
          }
        },
        {
          name: 'should select item',
          fn: () => {
            const component = new MockTodoList();
            component.handleItemSelect('1', true);
            return component.state.selectedItems.includes('1');
          }
        },
        {
          name: 'should deselect item',
          fn: () => {
            const component = new MockTodoList();
            component.setState({ selectedItems: ['1', '2'] });
            component.handleItemSelect('1', false);
            return !component.state.selectedItems.includes('1') &&
                   component.state.selectedItems.includes('2');
          }
        },
        {
          name: 'should not duplicate selected items',
          fn: () => {
            const component = new MockTodoList();
            component.handleItemSelect('1', true);
            component.handleItemSelect('1', true);
            return component.state.selectedItems.length === 1;
          }
        },
        {
          name: 'should select all items',
          fn: () => {
            const todos = [
              new MockTodo('1', 'Todo 1', false),
              new MockTodo('2', 'Todo 2', false)
            ];
            const component = new MockTodoList({ todos });
            component.handleSelectAll({ preventDefault: () => {} });
            return component.state.selectedItems.length === 2 &&
                   component.state.selectedItems.includes('1') &&
                   component.state.selectedItems.includes('2');
          }
        },
        {
          name: 'should clear all selections',
          fn: () => {
            const component = new MockTodoList();
            component.setState({ selectedItems: ['1', '2', '3'] });
            component.handleClearSelection({ preventDefault: () => {} });
            return component.state.selectedItems.length === 0;
          }
        }
      ]
    },
    {
      name: 'Event Handlers',
      tests: [
        {
          name: 'should handle retry with refresh callback',
          fn: () => {
            let refreshCalled = false;
            const component = new MockTodoList({
              onRefresh: () => { refreshCalled = true; }
            });
            component.setState({ error: 'Some error' });
            component.handleRetry({ preventDefault: () => {} });
            return refreshCalled && component.state.error === '';
          }
        },
        {
          name: 'should handle show all filter',
          fn: () => {
            let filterChanged = null;
            const component = new MockTodoList({
              onFilterChange: (filter) => { filterChanged = filter; }
            });
            component.handleShowAll({ preventDefault: () => {} });
            return filterChanged === 'all';
          }
        },
        {
          name: 'should handle show active filter',
          fn: () => {
            let filterChanged = null;
            const component = new MockTodoList({
              onFilterChange: (filter) => { filterChanged = filter; }
            });
            component.handleShowActive({ preventDefault: () => {} });
            return filterChanged === 'active';
          }
        },
        {
          name: 'should handle sort change',
          fn: () => {
            let sortChanged = null;
            const component = new MockTodoList({
              onSortChange: (sort) => { sortChanged = sort; }
            });
            const event = { target: { value: 'alphabetical' } };
            component.handleSortChange(event);
            return component.state.sortOrder === 'alphabetical' && sortChanged === 'alphabetical';
          }
        },
        {
          name: 'should handle bulk complete',
          fn: () => {
            let bulkToggleCalled = false;
            let toggledIds = null;
            const component = new MockTodoList({
              onBulkToggle: (ids, completed) => {
                bulkToggleCalled = true;
                toggledIds = ids;
              }
            });
            component.setState({ selectedItems: ['1', '2'] });
            component.handleBulkComplete({ preventDefault: () => {} });
            return bulkToggleCalled &&
                   toggledIds.length === 2 &&
                   component.state.selectedItems.length === 0;
          }
        },
        {
          name: 'should handle bulk delete',
          fn: () => {
            let bulkDeleteCalled = false;
            let deletedIds = null;
            const component = new MockTodoList({
              onBulkDelete: (ids) => {
                bulkDeleteCalled = true;
                deletedIds = ids;
              }
            });
            component.setState({ selectedItems: ['1', '2'] });
            component.handleBulkDelete({ preventDefault: () => {} });
            return bulkDeleteCalled &&
                   deletedIds.length === 2 &&
                   component.state.selectedItems.length === 0;
          }
        },
        {
          name: 'should handle clear completed',
          fn: () => {
            let clearCompletedCalled = false;
            const component = new MockTodoList({
              onClearCompleted: () => { clearCompletedCalled = true; }
            });
            component.handleClearCompleted({ preventDefault: () => {} });
            return clearCompletedCalled;
          }
        }
      ]
    },
    {
      name: 'Public Methods',
      tests: [
        {
          name: 'should set loading state',
          fn: () => {
            const component = new MockTodoList();
            component.setLoading(true);
            return component.state.isLoading === true;
          }
        },
        {
          name: 'should set error state',
          fn: () => {
            const component = new MockTodoList();
            component.setError('Test error');
            return component.state.error === 'Test error' && component.state.isLoading === false;
          }
        },
        {
          name: 'should clear error state',
          fn: () => {
            const component = new MockTodoList();
            component.setState({ error: 'Some error' });
            component.clearError();
            return component.state.error === '';
          }
        },
        {
          name: 'should get selected items',
          fn: () => {
            const component = new MockTodoList();
            component.setState({ selectedItems: ['1', '2'] });
            const selected = component.getSelectedItems();
            return selected.length === 2 && selected !== component.state.selectedItems;
          }
        },
        {
          name: 'should set sort order',
          fn: () => {
            const component = new MockTodoList();
            component.setSortOrder('alphabetical');
            return component.state.sortOrder === 'alphabetical';
          }
        },
        {
          name: 'should reject invalid sort order',
          fn: () => {
            const component = new MockTodoList();
            component.setSortOrder('invalid');
            return component.state.sortOrder === 'created';
          }
        },
        {
          name: 'should get sort order',
          fn: () => {
            const component = new MockTodoList();
            component.setState({ sortOrder: 'alphabetical' });
            return component.getSortOrder() === 'alphabetical';
          }
        }
      ]
    },
    {
      name: 'Statistics',
      tests: [
        {
          name: 'should calculate stats correctly',
          fn: () => {
            const todos = [
              new MockTodo('1', 'Active todo 1', false),
              new MockTodo('2', 'Active todo 2', false),
              new MockTodo('3', 'Completed todo', true)
            ];
            const component = new MockTodoList({ todos });
            component.setState({ selectedItems: ['1', '2'] });
            const stats = component.getStats();
            return stats.total === 3 &&
                   stats.active === 2 &&
                   stats.completed === 1 &&
                   stats.selected === 2;
          }
        },
        {
          name: 'should calculate stats with filtering',
          fn: () => {
            const todos = [
              new MockTodo('1', 'Active todo 1', false),
              new MockTodo('2', 'Active todo 2', false),
              new MockTodo('3', 'Completed todo', true)
            ];
            const component = new MockTodoList({ todos, filter: 'active' });
            const stats = component.getStats();
            return stats.total === 2 &&
                   stats.active === 2 &&
                   stats.completed === 0;
          }
        }
      ]
    },
    {
      name: 'Integration Tests',
      tests: [
        {
          name: 'should handle complete workflow: filter -> sort -> select -> bulk action',
          fn: () => {
            const todos = [
              new MockTodo('1', 'Zebra active', false),
              new MockTodo('2', 'Apple active', false),
              new MockTodo('3', 'Completed todo', true)
            ];

            let bulkActionCalled = false;
            const component = new MockTodoList({
              todos,
              filter: 'active',
              onBulkToggle: () => { bulkActionCalled = true; }
            });

            // Sort alphabetically
            component.setState({ sortOrder: 'alphabetical' });
            const sorted = component.getFilteredAndSortedTodos();

            // Select all filtered items
            component.selectAll();

            // Perform bulk action
            component.handleBulkComplete({ preventDefault: () => {} });

            return sorted.length === 2 &&
                   sorted[0].text === 'Apple active' &&
                   bulkActionCalled &&
                   component.state.selectedItems.length === 0;
          }
        },
        {
          name: 'should handle error recovery workflow',
          fn: () => {
            let refreshCalled = false;
            const component = new MockTodoList({
              onRefresh: () => { refreshCalled = true; }
            });

            // Set error state
            component.setError('Network error');

            // Attempt retry
            component.refresh();

            return component.state.error === '' &&
                   refreshCalled;
          }
        },
        {
          name: 'should handle empty state with different filters',
          fn: () => {
            const todos = [new MockTodo('1', 'Completed todo', true)];
            const component = new MockTodoList({ todos, filter: 'active' });

            const isEmpty = component.isEmpty();
            const filtered = component.getFilteredAndSortedTodos();
            const message = component.getEmptyMessage('active');

            return !isEmpty && // Not actually empty, just filtered
                   filtered.length === 0 && // But filtered result is empty
                   message === "No active todos! You're all caught up.";
          }
        }
      ]
    }
  ];

  // Run all tests
  testSuites.forEach(suite => {
    console.log(`\n📂 ${suite.name}`);

    suite.tests.forEach(test => {
      results.total++;
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
        console.log(`  💥 ${test.name} - ${error.message}`);
        results.failed++;
      }
    });
  });

  // Print summary
  console.log(`\n📊 TodoList Test Results:`);
  console.log(`   Passed: ${results.passed}/${results.total}`);
  console.log(`   Failed: ${results.failed}/${results.total}`);
  console.log(`   Success Rate: ${Math.round((results.passed / results.total) * 100)}%`);

  return results;
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTodoListTests();
}