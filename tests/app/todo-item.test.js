/**
 * Unit tests for TodoItem component
 * Tests todo item display, editing, toggling, deletion, and state management
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
    if (selector === '.todo-item-edit-input') {
      return this.children.find(child => child.className.includes('todo-item-edit-input'));
    }
    return null;
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

// Mock TodoItem component (compiled from TodoLang)
class MockTodoItem {
  constructor(props = {}) {
    this.props = props;
    this.state = {
      isEditing: false,
      editValue: "",
      showDeleteConfirm: false,
      isDeleting: false,
      isToggling: false,
      isUpdating: false,
      editError: ""
    };
    this._domNode = new MockElement();
  }

  setState(newState) {
    Object.assign(this.state, newState);
  }

  getItemClass() {
    let classes = "todo-item";
    if (this.props.todo && this.props.todo.completed) {
      classes = classes + " todo-item-completed";
    }
    if (this.state.isEditing) {
      classes = classes + " todo-item-editing";
    }
    if (this.state.isDeleting) {
      classes = classes + " todo-item-deleting";
    }
    return classes;
  }

  getEditInputClass() {
    let classes = "todo-item-edit-input";
    if (this.state.editError.length > 0) {
      classes = classes + " todo-item-edit-input-error";
    }
    if (this.state.isUpdating) {
      classes = classes + " todo-item-edit-input-updating";
    }
    return classes;
  }

  handleToggle(event) {
    event.preventDefault();
    event.stopPropagation();

    if (this.state.isToggling || this.state.isDeleting || this.state.isEditing) {
      return;
    }

    if (this.props.todo == null) {
      return;
    }

    this.setState({ isToggling: true });

    try {
      if (this.props.onToggle && typeof this.props.onToggle === "function") {
        this.props.onToggle(this.props.todo.id);
      }
    } catch (error) {
      console.error("Error toggling todo:", error);
    } finally {
      this.setState({ isToggling: false });
    }
  }

  handleStartEdit(event) {
    event.preventDefault();
    event.stopPropagation();

    if (this.state.isDeleting || this.state.isToggling) {
      return;
    }

    if (this.props.todo == null) {
      return;
    }

    this.setState({
      isEditing: true,
      editValue: this.props.todo.text,
      editError: ""
    });
  }

  handleEditInput(event) {
    const value = event.target.value;
    this.setState({
      editValue: value,
      editError: ""
    });
  }

  handleEditKeyDown(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      this.handleSaveEdit();
    } else if (event.key === "Escape") {
      event.preventDefault();
      this.handleCancelEdit();
    }
  }

  handleSaveEdit(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (this.state.isUpdating) {
      return;
    }

    const trimmedValue = this.state.editValue.trim();

    // Validate the edit
    const validation = this.validateEditText(trimmedValue);
    if (validation.isValid === false) {
      this.setState({
        editError: validation.error
      });
      return;
    }

    // Check if text actually changed
    if (this.props.todo && trimmedValue === this.props.todo.text) {
      this.handleCancelEdit();
      return;
    }

    this.setState({ isUpdating: true });

    try {
      if (this.props.onEdit && typeof this.props.onEdit === "function") {
        this.props.onEdit(this.props.todo.id, trimmedValue);
      }

      this.setState({
        isEditing: false,
        editValue: "",
        editError: "",
        isUpdating: false
      });
    } catch (error) {
      this.setState({
        editError: "Failed to update todo. Please try again.",
        isUpdating: false
      });
    }
  }

  handleCancelEdit(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    this.setState({
      isEditing: false,
      editValue: "",
      editError: "",
      isUpdating: false
    });
  }

  handleStartDelete(event) {
    event.preventDefault();
    event.stopPropagation();

    if (this.state.isDeleting || this.state.isToggling || this.state.isEditing) {
      return;
    }

    this.setState({
      showDeleteConfirm: true
    });
  }

  handleConfirmDelete(event) {
    event.preventDefault();
    event.stopPropagation();

    if (this.state.isDeleting) {
      return;
    }

    if (this.props.todo == null) {
      return;
    }

    this.setState({ isDeleting: true });

    try {
      if (this.props.onDelete && typeof this.props.onDelete === "function") {
        this.props.onDelete(this.props.todo.id);
      }

      this.setState({
        showDeleteConfirm: false,
        isDeleting: false
      });
    } catch (error) {
      console.error("Error deleting todo:", error);
      this.setState({
        isDeleting: false
      });
    }
  }

  handleCancelDelete(event) {
    event.preventDefault();
    event.stopPropagation();

    this.setState({
      showDeleteConfirm: false
    });
  }

  validateEditText(text) {
    const result = {
      isValid: false,
      error: ""
    };

    if (text == null || text.length === 0) {
      result.error = "Todo text cannot be empty";
      return result;
    }

    if (text.length > 500) {
      result.error = "Todo text cannot exceed 500 characters";
      return result;
    }

    // Check for only whitespace
    if (text.replace(/\s/g, "").length === 0) {
      result.error = "Todo text cannot be only whitespace";
      return result;
    }

    result.isValid = true;
    return result;
  }

  formatDate(date) {
    if (date == null) {
      return "";
    }

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) {
      return "just now";
    } else if (diffMinutes < 60) {
      return diffMinutes + " min ago";
    } else if (diffHours < 24) {
      return diffHours + " hour" + (diffHours === 1 ? "" : "s") + " ago";
    } else if (diffDays < 7) {
      return diffDays + " day" + (diffDays === 1 ? "" : "s") + " ago";
    } else {
      return date.toLocaleDateString();
    }
  }

  startEdit() {
    if (this.state.isDeleting || this.state.isToggling) {
      return false;
    }

    if (this.props.todo == null) {
      return false;
    }

    this.setState({
      isEditing: true,
      editValue: this.props.todo.text,
      editError: ""
    });
    return true;
  }

  cancelEdit() {
    this.handleCancelEdit();
  }

  isInEditMode() {
    return this.state.isEditing;
  }

  focus() {
    if (this.state.isEditing) {
      if (this._domNode) {
        const input = this._domNode.querySelector(".todo-item-edit-input");
        if (input) {
          input.focus();
        }
      }
    }
  }
}

// Export test runner function
export function runTodoItemTests() {
  console.log('🧪 Running TodoItem Component Tests...');

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
            const component = new MockTodoItem();
            return component.state.isEditing === false &&
                   component.state.editValue === "" &&
                   component.state.showDeleteConfirm === false &&
                   component.state.isDeleting === false &&
                   component.state.isToggling === false &&
                   component.state.isUpdating === false &&
                   component.state.editError === "";
          }
        },
        {
          name: 'should accept todo prop',
          fn: () => {
            const todo = new MockTodo('1', 'Test todo');
            const component = new MockTodoItem({ todo });
            return component.props.todo === todo;
          }
        }
      ]
    },
    {
      name: 'CSS Class Generation',
      tests: [
        {
          name: 'should generate base item class',
          fn: () => {
            const component = new MockTodoItem();
            return component.getItemClass() === 'todo-item';
          }
        },
        {
          name: 'should add completed class for completed todo',
          fn: () => {
            const todo = new MockTodo('1', 'Test todo', true);
            const component = new MockTodoItem({ todo });
            return component.getItemClass() === 'todo-item todo-item-completed';
          }
        },
        {
          name: 'should add editing class when in edit mode',
          fn: () => {
            const component = new MockTodoItem();
            component.setState({ isEditing: true });
            return component.getItemClass() === 'todo-item todo-item-editing';
          }
        },
        {
          name: 'should add deleting class when deleting',
          fn: () => {
            const component = new MockTodoItem();
            component.setState({ isDeleting: true });
            return component.getItemClass() === 'todo-item todo-item-deleting';
          }
        },
        {
          name: 'should generate edit input class with error',
          fn: () => {
            const component = new MockTodoItem();
            component.setState({ editError: 'Some error' });
            return component.getEditInputClass() === 'todo-item-edit-input todo-item-edit-input-error';
          }
        }
      ]
    },
    {
      name: 'Toggle Functionality',
      tests: [
        {
          name: 'should call onToggle with todo id',
          fn: () => {
            let toggledId = null;
            const todo = new MockTodo('test-id', 'Test todo');
            const component = new MockTodoItem({
              todo,
              onToggle: (id) => { toggledId = id; }
            });
            const event = new MockEvent('click');
            component.handleToggle(event);
            return toggledId === 'test-id';
          }
        },
        {
          name: 'should not toggle when already toggling',
          fn: () => {
            let toggleCalled = false;
            const todo = new MockTodo('test-id', 'Test todo');
            const component = new MockTodoItem({
              todo,
              onToggle: () => { toggleCalled = true; }
            });
            component.setState({ isToggling: true });
            const event = new MockEvent('click');
            component.handleToggle(event);
            return !toggleCalled;
          }
        },
        {
          name: 'should not toggle when deleting',
          fn: () => {
            let toggleCalled = false;
            const todo = new MockTodo('test-id', 'Test todo');
            const component = new MockTodoItem({
              todo,
              onToggle: () => { toggleCalled = true; }
            });
            component.setState({ isDeleting: true });
            const event = new MockEvent('click');
            component.handleToggle(event);
            return !toggleCalled;
          }
        },
        {
          name: 'should not toggle when editing',
          fn: () => {
            let toggleCalled = false;
            const todo = new MockTodo('test-id', 'Test todo');
            const component = new MockTodoItem({
              todo,
              onToggle: () => { toggleCalled = true; }
            });
            component.setState({ isEditing: true });
            const event = new MockEvent('click');
            component.handleToggle(event);
            return !toggleCalled;
          }
        },
        {
          name: 'should not toggle without todo',
          fn: () => {
            let toggleCalled = false;
            const component = new MockTodoItem({
              onToggle: () => { toggleCalled = true; }
            });
            const event = new MockEvent('click');
            component.handleToggle(event);
            return !toggleCalled;
          }
        }
      ]
    },
    {
      name: 'Edit Mode',
      tests: [
        {
          name: 'should enter edit mode with todo text',
          fn: () => {
            const todo = new MockTodo('1', 'Original text');
            const component = new MockTodoItem({ todo });
            const event = new MockEvent('click');
            component.handleStartEdit(event);
            return component.state.isEditing === true &&
                   component.state.editValue === 'Original text' &&
                   component.state.editError === '';
          }
        },
        {
          name: 'should not enter edit mode when deleting',
          fn: () => {
            const todo = new MockTodo('1', 'Test todo');
            const component = new MockTodoItem({ todo });
            component.setState({ isDeleting: true });
            const event = new MockEvent('click');
            component.handleStartEdit(event);
            return component.state.isEditing === false;
          }
        },
        {
          name: 'should not enter edit mode when toggling',
          fn: () => {
            const todo = new MockTodo('1', 'Test todo');
            const component = new MockTodoItem({ todo });
            component.setState({ isToggling: true });
            const event = new MockEvent('click');
            component.handleStartEdit(event);
            return component.state.isEditing === false;
          }
        },
        {
          name: 'should update edit value on input',
          fn: () => {
            const component = new MockTodoItem();
            component.setState({ editError: 'Previous error' });
            const event = new MockEvent('input', { target: { value: 'New text' } });
            component.handleEditInput(event);
            return component.state.editValue === 'New text' &&
                   component.state.editError === '';
          }
        }
      ]
    },
    {
      name: 'Edit Keyboard Handling',
      tests: [
        {
          name: 'should save on Enter key',
          fn: () => {
            let savedText = null;
            const todo = new MockTodo('1', 'Original');
            const component = new MockTodoItem({
              todo,
              onEdit: (id, text) => { savedText = text; }
            });
            component.setState({ isEditing: true, editValue: 'Updated text' });
            const event = new MockEvent('keydown', { key: 'Enter' });
            component.handleEditKeyDown(event);
            return savedText === 'Updated text' && component.state.isEditing === false;
          }
        },
        {
          name: 'should cancel on Escape key',
          fn: () => {
            const todo = new MockTodo('1', 'Original');
            const component = new MockTodoItem({ todo });
            component.setState({ isEditing: true, editValue: 'Changed text' });
            const event = new MockEvent('keydown', { key: 'Escape' });
            component.handleEditKeyDown(event);
            return component.state.isEditing === false &&
                   component.state.editValue === '' &&
                   component.state.editError === '';
          }
        },
        {
          name: 'should ignore other keys',
          fn: () => {
            const component = new MockTodoItem();
            component.setState({ isEditing: true, editValue: 'Text' });
            const event = new MockEvent('keydown', { key: 'Space' });
            component.handleEditKeyDown(event);
            return component.state.isEditing === true;
          }
        }
      ]
    },
    {
      name: 'Edit Validation',
      tests: [
        {
          name: 'should validate empty text as invalid',
          fn: () => {
            const component = new MockTodoItem();
            const result = component.validateEditText('');
            return result.isValid === false && result.error === 'Todo text cannot be empty';
          }
        },
        {
          name: 'should validate whitespace-only text as invalid',
          fn: () => {
            const component = new MockTodoItem();
            const result = component.validateEditText('   ');
            return result.isValid === false && result.error === 'Todo text cannot be only whitespace';
          }
        },
        {
          name: 'should validate text exceeding 500 characters as invalid',
          fn: () => {
            const component = new MockTodoItem();
            const longText = 'a'.repeat(501);
            const result = component.validateEditText(longText);
            return result.isValid === false && result.error === 'Todo text cannot exceed 500 characters';
          }
        },
        {
          name: 'should validate normal text as valid',
          fn: () => {
            const component = new MockTodoItem();
            const result = component.validateEditText('Valid text');
            return result.isValid === true && result.error === '';
          }
        }
      ]
    },
    {
      name: 'Edit Save/Cancel',
      tests: [
        {
          name: 'should save valid edit',
          fn: () => {
            let editedId = null;
            let editedText = null;
            const todo = new MockTodo('test-id', 'Original');
            const component = new MockTodoItem({
              todo,
              onEdit: (id, text) => { editedId = id; editedText = text; }
            });
            component.setState({ isEditing: true, editValue: 'Updated text' });
            component.handleSaveEdit();
            return editedId === 'test-id' &&
                   editedText === 'Updated text' &&
                   component.state.isEditing === false;
          }
        },
        {
          name: 'should not save invalid edit',
          fn: () => {
            let editCalled = false;
            const todo = new MockTodo('test-id', 'Original');
            const component = new MockTodoItem({
              todo,
              onEdit: () => { editCalled = true; }
            });
            component.setState({ isEditing: true, editValue: '' });
            component.handleSaveEdit();
            return !editCalled &&
                   component.state.isEditing === true &&
                   component.state.editError === 'Todo text cannot be empty';
          }
        },
        {
          name: 'should cancel edit without saving when text unchanged',
          fn: () => {
            let editCalled = false;
            const todo = new MockTodo('test-id', 'Same text');
            const component = new MockTodoItem({
              todo,
              onEdit: () => { editCalled = true; }
            });
            component.setState({ isEditing: true, editValue: 'Same text' });
            component.handleSaveEdit();
            return !editCalled && component.state.isEditing === false;
          }
        },
        {
          name: 'should not save when already updating',
          fn: () => {
            let editCalled = false;
            const todo = new MockTodo('test-id', 'Original');
            const component = new MockTodoItem({
              todo,
              onEdit: () => { editCalled = true; }
            });
            component.setState({ isEditing: true, editValue: 'New text', isUpdating: true });
            component.handleSaveEdit();
            return !editCalled;
          }
        },
        {
          name: 'should cancel edit properly',
          fn: () => {
            const component = new MockTodoItem();
            component.setState({
              isEditing: true,
              editValue: 'Some text',
              editError: 'Some error',
              isUpdating: true
            });
            component.handleCancelEdit();
            return component.state.isEditing === false &&
                   component.state.editValue === '' &&
                   component.state.editError === '' &&
                   component.state.isUpdating === false;
          }
        }
      ]
    },
    {
      name: 'Delete Functionality',
      tests: [
        {
          name: 'should show delete confirmation dialog',
          fn: () => {
            const component = new MockTodoItem();
            const event = new MockEvent('click');
            component.handleStartDelete(event);
            return component.state.showDeleteConfirm === true;
          }
        },
        {
          name: 'should not show delete dialog when already deleting',
          fn: () => {
            const component = new MockTodoItem();
            component.setState({ isDeleting: true });
            const event = new MockEvent('click');
            component.handleStartDelete(event);
            return component.state.showDeleteConfirm === false;
          }
        },
        {
          name: 'should not show delete dialog when editing',
          fn: () => {
            const component = new MockTodoItem();
            component.setState({ isEditing: true });
            const event = new MockEvent('click');
            component.handleStartDelete(event);
            return component.state.showDeleteConfirm === false;
          }
        },
        {
          name: 'should confirm delete and call onDelete',
          fn: () => {
            let deletedId = null;
            const todo = new MockTodo('delete-id', 'To delete');
            const component = new MockTodoItem({
              todo,
              onDelete: (id) => { deletedId = id; }
            });
            component.setState({ showDeleteConfirm: true });
            const event = new MockEvent('click');
            component.handleConfirmDelete(event);
            return deletedId === 'delete-id' &&
                   component.state.showDeleteConfirm === false;
          }
        },
        {
          name: 'should not delete when already deleting',
          fn: () => {
            let deleteCalled = false;
            const todo = new MockTodo('delete-id', 'To delete');
            const component = new MockTodoItem({
              todo,
              onDelete: () => { deleteCalled = true; }
            });
            component.setState({ isDeleting: true });
            const event = new MockEvent('click');
            component.handleConfirmDelete(event);
            return !deleteCalled;
          }
        },
        {
          name: 'should cancel delete confirmation',
          fn: () => {
            const component = new MockTodoItem();
            component.setState({ showDeleteConfirm: true });
            const event = new MockEvent('click');
            component.handleCancelDelete(event);
            return component.state.showDeleteConfirm === false;
          }
        }
      ]
    },
    {
      name: 'Date Formatting',
      tests: [
        {
          name: 'should format recent date as "just now"',
          fn: () => {
            const component = new MockTodoItem();
            const now = new Date();
            const result = component.formatDate(now);
            return result === 'just now';
          }
        },
        {
          name: 'should format minutes ago',
          fn: () => {
            const component = new MockTodoItem();
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
            const result = component.formatDate(fiveMinutesAgo);
            return result === '5 min ago';
          }
        },
        {
          name: 'should format hours ago',
          fn: () => {
            const component = new MockTodoItem();
            const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
            const result = component.formatDate(twoHoursAgo);
            return result === '2 hours ago';
          }
        },
        {
          name: 'should format single hour ago',
          fn: () => {
            const component = new MockTodoItem();
            const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000);
            const result = component.formatDate(oneHourAgo);
            return result === '1 hour ago';
          }
        },
        {
          name: 'should format days ago',
          fn: () => {
            const component = new MockTodoItem();
            const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
            const result = component.formatDate(threeDaysAgo);
            return result === '3 days ago';
          }
        },
        {
          name: 'should format single day ago',
          fn: () => {
            const component = new MockTodoItem();
            const oneDayAgo = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
            const result = component.formatDate(oneDayAgo);
            return result === '1 day ago';
          }
        },
        {
          name: 'should format old dates as locale date string',
          fn: () => {
            const component = new MockTodoItem();
            const oldDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
            const result = component.formatDate(oldDate);
            return result === oldDate.toLocaleDateString();
          }
        },
        {
          name: 'should handle null date',
          fn: () => {
            const component = new MockTodoItem();
            const result = component.formatDate(null);
            return result === '';
          }
        }
      ]
    },
    {
      name: 'Public Methods',
      tests: [
        {
          name: 'should start edit mode programmatically',
          fn: () => {
            const todo = new MockTodo('1', 'Test text');
            const component = new MockTodoItem({ todo });
            const result = component.startEdit();
            return result === true &&
                   component.state.isEditing === true &&
                   component.state.editValue === 'Test text';
          }
        },
        {
          name: 'should not start edit when deleting',
          fn: () => {
            const todo = new MockTodo('1', 'Test text');
            const component = new MockTodoItem({ todo });
            component.setState({ isDeleting: true });
            const result = component.startEdit();
            return result === false && component.state.isEditing === false;
          }
        },
        {
          name: 'should not start edit without todo',
          fn: () => {
            const component = new MockTodoItem();
            const result = component.startEdit();
            return result === false && component.state.isEditing === false;
          }
        },
        {
          name: 'should cancel edit programmatically',
          fn: () => {
            const component = new MockTodoItem();
            component.setState({ isEditing: true, editValue: 'text', editError: 'error' });
            component.cancelEdit();
            return component.state.isEditing === false &&
                   component.state.editValue === '' &&
                   component.state.editError === '';
          }
        },
        {
          name: 'should report edit mode status',
          fn: () => {
            const component = new MockTodoItem();
            const notEditing = component.isInEditMode();
            component.setState({ isEditing: true });
            const editing = component.isInEditMode();
            return notEditing === false && editing === true;
          }
        }
      ]
    },
    {
      name: 'Integration Tests',
      tests: [
        {
          name: 'should handle complete workflow: view -> edit -> save',
          fn: () => {
            let editedText = null;
            const todo = new MockTodo('workflow-id', 'Original text');
            const component = new MockTodoItem({
              todo,
              onEdit: (id, text) => { editedText = text; }
            });

            // Start editing
            component.handleStartEdit(new MockEvent('click'));

            // Change text
            component.handleEditInput(new MockEvent('input', { target: { value: 'New text' } }));

            // Save
            component.handleSaveEdit();

            return component.state.isEditing === false &&
                   editedText === 'New text';
          }
        },
        {
          name: 'should handle complete workflow: view -> edit -> cancel',
          fn: () => {
            let editCalled = false;
            const todo = new MockTodo('workflow-id', 'Original text');
            const component = new MockTodoItem({
              todo,
              onEdit: () => { editCalled = true; }
            });

            // Start editing
            component.handleStartEdit(new MockEvent('click'));

            // Change text
            component.handleEditInput(new MockEvent('input', { target: { value: 'New text' } }));

            // Cancel
            component.handleCancelEdit();

            return component.state.isEditing === false &&
                   component.state.editValue === '' &&
                   !editCalled;
          }
        },
        {
          name: 'should handle complete delete workflow',
          fn: () => {
            let deletedId = null;
            const todo = new MockTodo('delete-workflow-id', 'To delete');
            const component = new MockTodoItem({
              todo,
              onDelete: (id) => { deletedId = id; }
            });

            // Start delete
            component.handleStartDelete(new MockEvent('click'));

            // Confirm delete
            component.handleConfirmDelete(new MockEvent('click'));

            return deletedId === 'delete-workflow-id' &&
                   component.state.showDeleteConfirm === false;
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

  console.log(`\nTodoItem Tests: ${results.passed}/${results.total} passed`);
  return results;
}