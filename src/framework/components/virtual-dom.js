/**
 * Custom Virtual DOM Implementation
 *
 * This module provides a complete virtual DOM system with:
 * - Virtual node creation and management
 * - Diffing algorithm for efficient updates
 * - Patching system for DOM manipulation
 * - Event handling and component props support
 */

/**
 * Virtual DOM Node Types
 */
const VNodeType = {
  ELEMENT: 'element',
  TEXT: 'text',
  COMPONENT: 'component',
  FRAGMENT: 'fragment'
};

/**
 * Virtual DOM Node Class
 * Represents a virtual DOM node with type, props, and children
 */
class VNode {
  constructor(type, props = {}, children = []) {
    this.type = type;
    this.props = props || {};
    this.children = Array.isArray(children) ? children : [children].filter(Boolean);
    this.key = props.key || null;
    this.ref = props.ref || null;

    // Internal properties for DOM management
    this._domNode = null;
    this._component = null;
    this._eventListeners = new Map();
  }

  /**
   * Check if this is an element node
   */
  isElement() {
    return typeof this.type === 'string';
  }

  /**
   * Check if this is a text node
   */
  isText() {
    return this.type === VNodeType.TEXT;
  }

  /**
   * Check if this is a component node
   */
  isComponent() {
    return typeof this.type === 'function' || this.type === VNodeType.COMPONENT;
  }

  /**
   * Check if this is a fragment node
   */
  isFragment() {
    return this.type === VNodeType.FRAGMENT;
  }

  /**
   * Clone this virtual node with optional new props and children
   */
  clone(newProps = {}, newChildren = null) {
    return new VNode(
      this.type,
      { ...this.props, ...newProps },
      newChildren !== null ? newChildren : this.children
    );
  }
}

/**
 * Create a virtual DOM element
 */
function createElement(type, props = {}, ...children) {
  // Flatten children array and filter out null/undefined values
  const flatChildren = children.flat().filter(child =>
    child !== null && child !== undefined && child !== false
  );

  // Convert primitive values to text nodes
  const processedChildren = flatChildren.map(child => {
    if (typeof child === 'string' || typeof child === 'number') {
      return createTextNode(String(child));
    }
    return child;
  });

  return new VNode(type, props, processedChildren);
}

/**
 * Create a text virtual node
 */
function createTextNode(text) {
  return new VNode(VNodeType.TEXT, { textContent: String(text) }, []);
}

/**
 * Create a fragment virtual node (for grouping multiple elements)
 */
function createFragment(...children) {
  return new VNode(VNodeType.FRAGMENT, {}, children.flat());
}

/**
 * Patch Types for DOM Updates
 */
const PatchType = {
  CREATE: 'create',
  REMOVE: 'remove',
  REPLACE: 'replace',
  UPDATE: 'update',
  REORDER: 'reorder'
};

/**
 * Patch Class
 * Represents a change that needs to be applied to the DOM
 */
class Patch {
  constructor(type, vnode, newVNode = null, index = 0, props = {}) {
    this.type = type;
    this.vnode = vnode;
    this.newVNode = newVNode;
    this.index = index;
    this.props = props;
  }
}

/**
 * Virtual DOM Diffing Algorithm
 * Compares two virtual DOM trees and generates patches
 */
class VirtualDOMDiffer {
  constructor() {
    this.patches = [];
    this.index = 0;
  }

  /**
   * Compare two virtual DOM trees and generate patches
   */
  diff(oldVNode, newVNode) {
    this.patches = [];
    this.index = 0;
    this._diffNode(oldVNode, newVNode, 0);
    return this.patches;
  }

  /**
   * Internal method to diff individual nodes
   */
  _diffNode(oldVNode, newVNode, index) {
    const currentIndex = index;

    // Case 1: New node doesn't exist - remove old node
    if (!newVNode) {
      this.patches.push(new Patch(PatchType.REMOVE, oldVNode, null, currentIndex));
      return;
    }

    // Case 2: Old node doesn't exist - create new node
    if (!oldVNode) {
      this.patches.push(new Patch(PatchType.CREATE, null, newVNode, currentIndex));
      return;
    }

    // Case 3: Different node types - replace entire node
    if (oldVNode.type !== newVNode.type) {
      this.patches.push(new Patch(PatchType.REPLACE, oldVNode, newVNode, currentIndex));
      return;
    }

    // Case 4: Text nodes - check if content changed
    if (oldVNode.isText() && newVNode.isText()) {
      if (oldVNode.props.textContent !== newVNode.props.textContent) {
        this.patches.push(new Patch(PatchType.UPDATE, oldVNode, newVNode, currentIndex, {
          textContent: newVNode.props.textContent
        }));
      }
      return;
    }

    // Case 5: Element nodes - diff props and children
    if (oldVNode.isElement() && newVNode.isElement()) {
      // Diff properties
      const propPatches = this._diffProps(oldVNode.props, newVNode.props);
      if (Object.keys(propPatches).length > 0) {
        this.patches.push(new Patch(PatchType.UPDATE, oldVNode, newVNode, currentIndex, propPatches));
      }

      // Diff children
      this._diffChildren(oldVNode.children, newVNode.children, currentIndex);
    }

    // Case 6: Fragment nodes - diff children only
    if (oldVNode.isFragment() && newVNode.isFragment()) {
      this._diffChildren(oldVNode.children, newVNode.children, currentIndex);
    }
  }

  /**
   * Diff properties between two nodes
   */
  _diffProps(oldProps, newProps) {
    const patches = {};

    // Check for changed or new properties
    for (const key in newProps) {
      if (key === 'key' || key === 'ref') continue; // Skip special props

      if (oldProps[key] !== newProps[key]) {
        patches[key] = newProps[key];
      }
    }

    // Check for removed properties
    for (const key in oldProps) {
      if (key === 'key' || key === 'ref') continue; // Skip special props

      if (!(key in newProps)) {
        patches[key] = null; // Mark for removal
      }
    }

    return patches;
  }

  /**
   * Diff children arrays using key-based reconciliation
   */
  _diffChildren(oldChildren, newChildren, parentIndex) {
    const oldLength = oldChildren.length;
    const newLength = newChildren.length;
    const maxLength = Math.max(oldLength, newLength);

    let childIndex = parentIndex + 1;

    // Simple approach: diff children by index
    // TODO: Implement key-based reconciliation for better performance
    for (let i = 0; i < maxLength; i++) {
      const oldChild = oldChildren[i];
      const newChild = newChildren[i];

      this._diffNode(oldChild, newChild, childIndex);

      // Update child index for next iteration
      if (oldChild) {
        childIndex += this._getNodeCount(oldChild);
      } else if (newChild) {
        childIndex += this._getNodeCount(newChild);
      }
    }
  }

  /**
   * Get the total number of nodes in a virtual DOM tree
   */
  _getNodeCount(vnode) {
    if (!vnode) return 0;

    let count = 1; // Count the node itself

    if (vnode.children) {
      for (const child of vnode.children) {
        count += this._getNodeCount(child);
      }
    }

    return count;
  }
}

/**
 * Virtual DOM Patcher
 * Applies patches to the real DOM efficiently
 */
class VirtualDOMPatcher {
  constructor() {
    this.eventDelegator = new EventDelegator();
  }

  /**
   * Apply patches to a DOM element
   */
  patch(rootElement, patches, vnode) {
    if (!patches || patches.length === 0) return;

    // Create a walker to traverse DOM nodes
    const walker = new DOMWalker(rootElement);

    // Sort patches by index to apply them in correct order
    const sortedPatches = patches.sort((a, b) => a.index - b.index);

    for (const patch of sortedPatches) {
      const targetElement = walker.getNodeAtIndex(patch.index);
      this._applyPatch(targetElement, patch);
    }
  }

  /**
   * Apply a single patch to a DOM element
   */
  _applyPatch(element, patch) {
    switch (patch.type) {
      case PatchType.CREATE:
        this._createNode(element, patch.newVNode);
        break;

      case PatchType.REMOVE:
        this._removeNode(element);
        break;

      case PatchType.REPLACE:
        this._replaceNode(element, patch.newVNode);
        break;

      case PatchType.UPDATE:
        this._updateNode(element, patch.props, patch.vnode, patch.newVNode);
        break;

      case PatchType.REORDER:
        this._reorderChildren(element, patch.props.moves);
        break;
    }
  }

  /**
   * Create a new DOM node from virtual node
   */
  _createNode(parentElement, vnode) {
    const domNode = this._renderVNode(vnode);
    if (parentElement && domNode && typeof parentElement.appendChild === 'function') {
      parentElement.appendChild(domNode);
    }
    return domNode;
  }

  /**
   * Remove a DOM node
   */
  _removeNode(element) {
    if (element && element.parentNode) {
      // Clean up event listeners
      this.eventDelegator.removeAllListeners(element);
      element.parentNode.removeChild(element);
    }
  }

  /**
   * Replace a DOM node with a new one
   */
  _replaceNode(oldElement, newVNode) {
    if (!oldElement || !oldElement.parentNode) return;

    const newElement = this._renderVNode(newVNode);
    if (newElement) {
      // Clean up old event listeners
      this.eventDelegator.removeAllListeners(oldElement);
      oldElement.parentNode.replaceChild(newElement, oldElement);
    }
  }

  /**
   * Update a DOM node's properties
   */
  _updateNode(element, props, oldVNode, newVNode) {
    if (!element) return;

    // Update text content for text nodes
    if (props.textContent !== undefined) {
      element.textContent = props.textContent;
      return;
    }

    // Update element properties
    for (const key in props) {
      const value = props[key];

      if (value === null) {
        // Remove property
        this._removeProperty(element, key);
      } else {
        // Set property
        this._setProperty(element, key, value, oldVNode, newVNode);
      }
    }
  }

  /**
   * Render a virtual node to a real DOM node
   */
  _renderVNode(vnode) {
    if (!vnode) return null;

    // Text node
    if (vnode.isText()) {
      const textNode = document.createTextNode(vnode.props.textContent || '');
      vnode._domNode = textNode;
      return textNode;
    }

    // Fragment node
    if (vnode.isFragment()) {
      const fragment = document.createDocumentFragment();
      for (const child of vnode.children) {
        const childNode = this._renderVNode(child);
        if (childNode) {
          fragment.appendChild(childNode);
        }
      }
      vnode._domNode = fragment;
      return fragment;
    }

    // Element node
    if (vnode.isElement()) {
      const element = document.createElement(vnode.type);
      vnode._domNode = element;

      // Set properties
      for (const key in vnode.props) {
        if (key !== 'key' && key !== 'ref') {
          this._setProperty(element, key, vnode.props[key], null, vnode);
        }
      }

      // Render children
      for (const child of vnode.children) {
        const childNode = this._renderVNode(child);
        if (childNode) {
          element.appendChild(childNode);
        }
      }

      // Handle ref
      if (vnode.ref && typeof vnode.ref === 'function') {
        vnode.ref(element);
      }

      return element;
    }

    return null;
  }

  /**
   * Set a property on a DOM element
   */
  _setProperty(element, key, value, oldVNode, newVNode) {
    // Handle event listeners
    if (key.startsWith('on') && typeof value === 'function') {
      const eventType = key.slice(2).toLowerCase();
      this.eventDelegator.addEventListener(element, eventType, value);
      return;
    }

    // Handle special properties
    switch (key) {
      case 'className':
      case 'class':
        element.className = value || '';
        break;

      case 'style':
        if (typeof value === 'object') {
          Object.assign(element.style, value);
        } else {
          element.style.cssText = value || '';
        }
        break;

      case 'value':
        element.value = value;
        break;

      case 'checked':
        element.checked = Boolean(value);
        break;

      case 'selected':
        element.selected = Boolean(value);
        break;

      case 'disabled':
        element.disabled = Boolean(value);
        break;

      default:
        // Regular attributes
        if (value === null || value === undefined || value === false) {
          element.removeAttribute(key);
        } else if (value === true) {
          element.setAttribute(key, '');
        } else {
          element.setAttribute(key, String(value));
        }
        break;
    }
  }

  /**
   * Remove a property from a DOM element
   */
  _removeProperty(element, key) {
    // Handle event listeners
    if (key.startsWith('on')) {
      const eventType = key.slice(2).toLowerCase();
      this.eventDelegator.removeEventListener(element, eventType);
      return;
    }

    // Handle special properties
    switch (key) {
      case 'className':
      case 'class':
        element.className = '';
        break;

      case 'style':
        element.style.cssText = '';
        break;

      case 'value':
        element.value = '';
        break;

      case 'checked':
      case 'selected':
      case 'disabled':
        element[key] = false;
        break;

      default:
        element.removeAttribute(key);
        break;
    }
  }
}

/**
 * Event Delegator
 * Manages event listeners efficiently using event delegation
 */
class EventDelegator {
  constructor() {
    this.listeners = new WeakMap();
  }

  /**
   * Add event listener to an element
   */
  addEventListener(element, eventType, handler) {
    if (!this.listeners.has(element)) {
      this.listeners.set(element, new Map());
    }

    const elementListeners = this.listeners.get(element);

    // Remove existing listener if any
    if (elementListeners.has(eventType)) {
      element.removeEventListener(eventType, elementListeners.get(eventType));
    }

    // Add new listener
    const wrappedHandler = (event) => {
      // Call the handler with proper context
      handler.call(element, event);
    };

    element.addEventListener(eventType, wrappedHandler);
    elementListeners.set(eventType, wrappedHandler);
  }

  /**
   * Remove event listener from an element
   */
  removeEventListener(element, eventType) {
    if (!this.listeners.has(element)) return;

    const elementListeners = this.listeners.get(element);
    if (elementListeners.has(eventType)) {
      const handler = elementListeners.get(eventType);
      element.removeEventListener(eventType, handler);
      elementListeners.delete(eventType);
    }
  }

  /**
   * Remove all event listeners from an element
   */
  removeAllListeners(element) {
    if (!this.listeners.has(element)) return;

    const elementListeners = this.listeners.get(element);
    for (const [eventType, handler] of elementListeners) {
      element.removeEventListener(eventType, handler);
    }

    this.listeners.delete(element);
  }
}

/**
 * DOM Walker
 * Utility for traversing DOM nodes by index
 */
class DOMWalker {
  constructor(rootElement) {
    this.root = rootElement;
    this.nodes = [];
    this._buildNodeList(rootElement);
  }

  /**
   * Get DOM node at specific index
   */
  getNodeAtIndex(index) {
    return this.nodes[index] || null;
  }

  /**
   * Build a flat list of all DOM nodes
   */
  _buildNodeList(node) {
    this.nodes.push(node);

    // Check if node has childNodes and it's an array-like object
    if (node && node.childNodes && typeof node.childNodes.length === 'number') {
      for (let i = 0; i < node.childNodes.length; i++) {
        this._buildNodeList(node.childNodes[i]);
      }
    }
  }
}

/**
 * Virtual DOM Renderer
 * Main class that orchestrates virtual DOM operations
 */
class VirtualDOMRenderer {
  constructor() {
    this.differ = new VirtualDOMDiffer();
    this.patcher = new VirtualDOMPatcher();
    this.currentVTree = null;
  }

  /**
   * Render virtual DOM tree to a real DOM element
   */
  render(vnode, container) {
    if (!this.currentVTree) {
      // Initial render
      const domNode = this.patcher._renderVNode(vnode);
      if (domNode) {
        container.appendChild(domNode);
      }
      this.currentVTree = vnode;
    } else {
      // Update render
      const patches = this.differ.diff(this.currentVTree, vnode);
      this.patcher.patch(container, patches, vnode);
      this.currentVTree = vnode;
    }
  }

  /**
   * Unmount virtual DOM tree from container
   */
  unmount(container) {
    if (container) {
      container.innerHTML = '';
    }
    this.currentVTree = null;
  }
}

// Export the main classes and functions
export {
  VNode,
  VNodeType,
  PatchType,
  Patch,
  createElement,
  createTextNode,
  createFragment,
  VirtualDOMDiffer,
  VirtualDOMPatcher,
  VirtualDOMRenderer,
  EventDelegator,
  DOMWalker
};

// Convenience aliases
export const h = createElement;
export const Fragment = createFragment;