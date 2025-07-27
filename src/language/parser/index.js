/**
 * TodoLang Parser - Converts tokens to Abstract Syntax Tree
 *
 * This parser implements a recursive descent parser that converts
 * a stream of tokens from the lexer into an Abstract Syntax Tree (AST).
 * It handles all TodoLang language constructs including components,
 * models, services, JSX elements, and expressions.
 */

import { TokenType, OperatorPrecedence } from '../tokens.js';

// ============================================================================
// Parser Error Classes
// ============================================================================

export class ParseError extends Error {
  constructor(message, token = null, expected = null) {
    super(message);
    this.name = 'ParseError';
    this.token = token;
    this.expected = expected;
    this.location = token ? { line: token.line, column: token.column } : null;
  }
}

// ============================================================================
// AST Node Classes
// ============================================================================

/**
 * Base class for all AST nodes
 */
export class ASTNode {
  constructor(type, location = null) {
    this.type = type;
    this.location = location;
  }

  toString() {
    return `${this.type}Node`;
  }
}

/**
 * Root program node containing all declarations
 */
export class ProgramNode extends ASTNode {
  constructor(declarations = [], location = null) {
    super('Program', location);
    this.declarations = declarations;
  }
}

/**
 * Component declaration node
 */
export class ComponentNode extends ASTNode {
  constructor(name, stateDeclaration = null, methods = [], computedProperties = [], renderMethod = null, location = null) {
    super('Component', location);
    this.name = name;
    this.stateDeclaration = stateDeclaration;
    this.methods = methods;
    this.computedProperties = computedProperties;
    this.renderMethod = renderMethod;
  }
}

/**
 * State declaration node
 */
export class StateNode extends ASTNode {
  constructor(properties = [], location = null) {
    super('State', location);
    this.properties = properties;
  }
}

/**
 * Property declaration node
 */
export class PropertyNode extends ASTNode {
  constructor(name, type = null, defaultValue = null, location = null) {
    super('Property', location);
    this.name = name;
    this.type = type;
    this.defaultValue = defaultValue;
  }
}

/**
 * Method declaration node
 */
export class MethodNode extends ASTNode {
  constructor(name, parameters = [], body = [], isStatic = false, location = null) {
    super('Method', location);
    this.name = name;
    this.parameters = parameters;
    this.body = body;
    this.isStatic = isStatic;
  }
}

/**
 * Computed property declaration node
 */
export class ComputedNode extends ASTNode {
  constructor(name, body = [], location = null) {
    super('Computed', location);
    this.name = name;
    this.body = body;
  }
}

/**
 * Render method declaration node
 */
export class RenderNode extends ASTNode {
  constructor(body = [], location = null) {
    super('Render', location);
    this.body = body;
  }
}

/**
 * Model declaration node
 */
export class ModelNode extends ASTNode {
  constructor(name, properties = [], methods = [], location = null) {
    super('Model', location);
    this.name = name;
    this.properties = properties;
    this.methods = methods;
  }
}

/**
 * Service declaration node
 */
export class ServiceNode extends ASTNode {
  constructor(name, methods = [], location = null) {
    super('Service', location);
    this.name = name;
    this.methods = methods;
  }
}

/**
 * Parameter node
 */
export class ParameterNode extends ASTNode {
  constructor(name, type = null, defaultValue = null, location = null) {
    super('Parameter', location);
    this.name = name;
    this.type = type;
    this.defaultValue = defaultValue;
  }
}

/**
 * Type annotation node
 */
export class TypeNode extends ASTNode {
  constructor(name, isOptional = false, isArray = false, location = null) {
    super('Type', location);
    this.name = name;
    this.isOptional = isOptional;
    this.isArray = isArray;
  }
}

// ============================================================================
// Statement Nodes
// ============================================================================

/**
 * Block statement node
 */
export class BlockNode extends ASTNode {
  constructor(statements = [], location = null) {
    super('Block', location);
    this.statements = statements;
  }
}

/**
 * Expression statement node
 */
export class ExpressionStatementNode extends ASTNode {
  constructor(expression, location = null) {
    super('ExpressionStatement', location);
    this.expression = expression;
  }
}

/**
 * If statement node
 */
export class IfNode extends ASTNode {
  constructor(condition, thenStatement, elseStatement = null, location = null) {
    super('If', location);
    this.condition = condition;
    this.thenStatement = thenStatement;
    this.elseStatement = elseStatement;
  }
}

/**
 * For statement node
 */
export class ForNode extends ASTNode {
  constructor(init, condition, update, body, location = null) {
    super('For', location);
    this.init = init;
    this.condition = condition;
    this.update = update;
    this.body = body;
  }
}

/**
 * While statement node
 */
export class WhileNode extends ASTNode {
  constructor(condition, body, location = null) {
    super('While', location);
    this.condition = condition;
    this.body = body;
  }
}

/**
 * Return statement node
 */
export class ReturnNode extends ASTNode {
  constructor(expression = null, location = null) {
    super('Return', location);
    this.expression = expression;
  }
}

/**
 * Break statement node
 */
export class BreakNode extends ASTNode {
  constructor(location = null) {
    super('Break', location);
  }
}

/**
 * Continue statement node
 */
export class ContinueNode extends ASTNode {
  constructor(location = null) {
    super('Continue', location);
  }
}

/**
 * Variable declaration node
 */
export class VariableDeclarationNode extends ASTNode {
  constructor(kind, declarations = [], location = null) {
    super('VariableDeclaration', location);
    this.kind = kind; // 'let', 'const', 'var'
    this.declarations = declarations;
  }
}

/**
 * Variable declarator node
 */
export class VariableDeclaratorNode extends ASTNode {
  constructor(id, init = null, location = null) {
    super('VariableDeclarator', location);
    this.id = id;
    this.init = init;
  }
}

/**
 * Arrow function expression node
 */
export class ArrowFunctionNode extends ASTNode {
  constructor(params = [], body, isAsync = false, location = null) {
    super('ArrowFunction', location);
    this.params = params;
    this.body = body;
    this.isAsync = isAsync;
  }
}

/**
 * New expression node
 */
export class NewExpressionNode extends ASTNode {
  constructor(callee, args = [], location = null) {
    super('NewExpression', location);
    this.callee = callee;
    this.arguments = args;
  }
}

// ============================================================================
// Expression Nodes
// ============================================================================

/**
 * Binary expression node
 */
export class BinaryExpressionNode extends ASTNode {
  constructor(left, operator, right, location = null) {
    super('BinaryExpression', location);
    this.left = left;
    this.operator = operator;
    this.right = right;
  }
}

/**
 * Unary expression node
 */
export class UnaryExpressionNode extends ASTNode {
  constructor(operator, operand, isPrefix = true, location = null) {
    super('UnaryExpression', location);
    this.operator = operator;
    this.operand = operand;
    this.isPrefix = isPrefix;
  }
}

/**
 * Assignment expression node
 */
export class AssignmentNode extends ASTNode {
  constructor(left, operator, right, location = null) {
    super('Assignment', location);
    this.left = left;
    this.operator = operator;
    this.right = right;
  }
}

/**
 * Conditional (ternary) expression node
 */
export class ConditionalNode extends ASTNode {
  constructor(condition, trueExpression, falseExpression, location = null) {
    super('Conditional', location);
    this.condition = condition;
    this.trueExpression = trueExpression;
    this.falseExpression = falseExpression;
  }
}

/**
 * Call expression node
 */
export class CallNode extends ASTNode {
  constructor(callee, args = [], location = null) {
    super('Call', location);
    this.callee = callee;
    this.arguments = args;
  }
}

/**
 * Member expression node
 */
export class MemberNode extends ASTNode {
  constructor(object, property, computed = false, location = null) {
    super('Member', location);
    this.object = object;
    this.property = property;
    this.computed = computed; // true for obj[prop], false for obj.prop
  }
}

/**
 * Identifier node
 */
export class IdentifierNode extends ASTNode {
  constructor(name, location = null) {
    super('Identifier', location);
    this.name = name;
  }
}

/**
 * This expression node
 */
export class ThisNode extends ASTNode {
  constructor(location = null) {
    super('This', location);
  }
}

// ============================================================================
// Literal Nodes
// ============================================================================

/**
 * String literal node
 */
export class StringLiteralNode extends ASTNode {
  constructor(value, location = null) {
    super('StringLiteral', location);
    this.value = value;
  }
}

/**
 * Number literal node
 */
export class NumberLiteralNode extends ASTNode {
  constructor(value, location = null) {
    super('NumberLiteral', location);
    this.value = parseFloat(value);
  }
}

/**
 * Boolean literal node
 */
export class BooleanLiteralNode extends ASTNode {
  constructor(value, location = null) {
    super('BooleanLiteral', location);
    this.value = value === 'true';
  }
}

/**
 * Null literal node
 */
export class NullLiteralNode extends ASTNode {
  constructor(location = null) {
    super('NullLiteral', location);
    this.value = null;
  }
}

/**
 * Array literal node
 */
export class ArrayLiteralNode extends ASTNode {
  constructor(elements = [], location = null) {
    super('ArrayLiteral', location);
    this.elements = elements;
  }
}

/**
 * Object literal node
 */
export class ObjectLiteralNode extends ASTNode {
  constructor(properties = [], location = null) {
    super('ObjectLiteral', location);
    this.properties = properties;
  }
}

/**
 * Object property node
 */
export class ObjectPropertyNode extends ASTNode {
  constructor(key, value, location = null) {
    super('ObjectProperty', location);
    this.key = key;
    this.value = value;
  }
}

// ============================================================================
// JSX Nodes
// ============================================================================

/**
 * JSX element node
 */
export class JSXElementNode extends ASTNode {
  constructor(tagName, attributes = [], children = [], selfClosing = false, location = null) {
    super('JSXElement', location);
    this.tagName = tagName;
    this.attributes = attributes;
    this.children = children;
    this.selfClosing = selfClosing;
  }
}

/**
 * JSX attribute node
 */
export class JSXAttributeNode extends ASTNode {
  constructor(name, value = null, location = null) {
    super('JSXAttribute', location);
    this.name = name;
    this.value = value;
  }
}

/**
 * JSX text node
 */
export class JSXTextNode extends ASTNode {
  constructor(value, location = null) {
    super('JSXText', location);
    this.value = value;
  }
}

/**
 * JSX expression container node
 */
export class JSXExpressionNode extends ASTNode {
  constructor(expression, location = null) {
    super('JSXExpression', location);
    this.expression = expression;
  }
}
// ============================================================================
// TodoLang Parser Class
// ============================================================================

export class TodoLangParser {
  constructor(tokens = []) {
    this.tokens = tokens;
    this.current = 0;
    this.errors = [];
  }

  /**
   * Parse tokens into an AST
   */
  parse(tokens) {
    if (tokens !== undefined) {
      this.tokens = tokens;
      this.current = 0;
      this.errors = [];
    }

    try {
      const declarations = [];

      while (!this.isAtEnd()) {
        // Skip comments
        if (this.check(TokenType.COMMENT)) {
          this.advance();
          continue;
        }

        const declaration = this.parseDeclaration();
        if (declaration) {
          declarations.push(declaration);
        }
      }

      if (this.errors.length > 0) {
        throw new ParseError(
          `Parser encountered ${this.errors.length} error(s):\n${this.errors.map(e => e.message).join('\n')}`
        );
      }

      return new ProgramNode(declarations, this.getLocation());
      return new ProgramNode(declarations, this.getLocation());
    } catch (error) {
      if (error instanceof ParseError) {
        throw error;
      }
      throw new ParseError(`Unexpected parser error: ${error.message}`, this.peek());
    }
  }

  // ============================================================================
  // Declaration Parsing
  // ============================================================================

  parseDeclaration() {
    try {
      if (this.match(TokenType.COMPONENT)) {
        return this.parseComponentDeclaration();
      }
      if (this.match(TokenType.MODEL)) {
        return this.parseModelDeclaration();
      }
      if (this.match(TokenType.SERVICE)) {
        return this.parseServiceDeclaration();
      }

      // If we reach here, we have an unexpected token
      this.error(`Unexpected token '${this.peek().value}'. Expected component, model, or service declaration.`);
      this.synchronize();
ull;
    } catch (error) {
      this.error(error.message);
      this.synchronize();
      return null;
    }
  }

  parseComponentDeclaration() {
    const location = this.getLocation();
    const name = this.consume(TokenType.IDENTIFIER, "Expected component name").value;

    this.consume(TokenType.LEFT_BRACE, "Expected '{' after component name");

    let stateDeclaration = null;
    const methods = [];
    const computedProperties = [];
    let renderMethod = null;

    while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
      if (this.match(TokenType.STATE)) {
        if (stateDeclaration) {
          this.error("Component can only have one state declaration");
        }
        stateDeclaration = this.parseStateDeclaration();
      } else if (this.match(TokenType.COMPUTED)) {
        computedProperties.push(this.parseComputedDeclaration());
      } else if (this.match(TokenType.RENDER)) {
        if (renderMethod) {
          this.error("Component can only have one render method");
        }
        renderMethod = this.parseRenderDeclaration();
      } else if (this.match(TokenType.STATIC)) {
        methods.push(this.parseMethodDeclaration());
      } else if (this.check(TokenType.IDENTIFIER)) {
        methods.push(this.parseMethodDeclaration());
      } else {
        this.error(`Unexpected token '${this.peek().value}' in component body`);
        this.advance();
      }
    }

    this.consume(TokenType.RIGHT_BRACE, "Expected '}' after component body");

    // Validate that component has a render method
    if (!renderMethod) {
      this.error("Component must have a render method");
    }

    return new ComponentNode(name, stateDeclaration, methods, computedProperties, renderMethod, location);
  }

  parseStateDeclaration() {
    const location = this.getLocation();
    this.consume(TokenType.LEFT_BRACE, "Expected '{' after 'state'");

    const properties = [];
    while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
      properties.push(this.parsePropertyDeclaration());
    }

    this.consume(TokenType.RIGHT_BRACE, "Expected '}' after state properties");
    return new StateNode(properties, location);
  }

  parsePropertyDeclaration() {
    const location = this.getLocation();
    const name = this.consume(TokenType.IDENTIFIER, "Expected property name").value;

    this.consume(TokenType.COLON, "Expected ':' after property name");
    const type = this.parseType();

    let defaultValue = null;
    if (this.match(TokenType.ASSIGN)) {
      defaultValue = this.parseExpression();
    }

    return new PropertyNode(name, type, defaultValue, location);
  }

  parseMethodDeclaration() {
    const location = this.getLocation();
    const isStatic = this.previous().type === TokenType.STATIC;

    const name = this.consume(TokenType.IDENTIFIER, "Expected method name").value;
    this.consume(TokenType.LEFT_PAREN, "Expected '(' after method name");

    const parameters = [];
    if (!this.check(TokenType.RIGHT_PAREN)) {
      do {
        parameters.push(this.parseParameter());
      } while (this.match(TokenType.COMMA));
    }

    this.consume(TokenType.RIGHT_PAREN, "Expected ')' after parameters");

    // Optional return type annotation
    let returnType = null;
    if (this.match(TokenType.COLON)) {
      returnType = this.parseType();
    }

    this.consume(TokenType.LEFT_BRACE, "Expected '{' before method body");

    const body = [];
    while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
      body.push(this.parseStatement());
    }

    this.consume(TokenType.RIGHT_BRACE, "Expected '}' after method body");

    const method = new MethodNode(name, parameters, body, isStatic, location);
    method.returnType = returnType; // Add return type to method node
    return method;
  }

  parseComputedDeclaration() {
    const location = this.getLocation();
    const name = this.consume(TokenType.IDENTIFIER, "Expected computed property name").value;

    this.consume(TokenType.LEFT_PAREN, "Expected '(' after computed property name");
    this.consume(TokenType.RIGHT_PAREN, "Expected ')' after computed property name");
    this.consume(TokenType.LEFT_BRACE, "Expected '{' before computed property body");

    const body = [];
    while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
      body.push(this.parseStatement());
    }

    this.consume(TokenType.RIGHT_BRACE, "Expected '}' after computed property body");

    return new ComputedNode(name, body, location);
  }

  parseRenderDeclaration() {
    const location = this.getLocation();

    this.consume(TokenType.LEFT_PAREN, "Expected '(' after 'render'");
    this.consume(TokenType.RIGHT_PAREN, "Expected ')' after 'render('");
    this.consume(TokenType.LEFT_BRACE, "Expected '{' before render body");

    const body = [];
    while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
      body.push(this.parseStatement());
    }

    this.consume(TokenType.RIGHT_BRACE, "Expected '}' after render body");

    return new RenderNode(body, location);
  }

  parseModelDeclaration() {
    const location = this.getLocation();
    const name = this.consume(TokenType.IDENTIFIER, "Expected model name").value;

    this.consume(TokenType.LEFT_BRACE, "Expected '{' after model name");

    const properties = [];
    const methods = [];

    while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
      if (this.match(TokenType.STATIC)) {
        methods.push(this.parseMethodDeclaration());
      } else if (this.check(TokenType.IDENTIFIER)) {
        // Look ahead to determine if this is a property or method
        const nextToken = this.peekNext();
        if (nextToken && nextToken.type === TokenType.COLON) {
          properties.push(this.parsePropertyDeclaration());
        } else if (nextToken && nextToken.type === TokenType.LEFT_PAREN) {
          methods.push(this.parseMethodDeclaration());
        } else {
          this.error(`Unexpected token sequence in model body`);
          this.advance();
        }
      } else {
        this.error(`Unexpected token '${this.peek().value}' in model body`);
        this.advance();
      }
    }

    this.consume(TokenType.RIGHT_BRACE, "Expected '}' after model body");

    return new ModelNode(name, properties, methods, location);
  }

  parseServiceDeclaration() {
    const location = this.getLocation();
    const name = this.consume(TokenType.IDENTIFIER, "Expected service name").value;

    this.consume(TokenType.LEFT_BRACE, "Expected '{' after service name");

    const methods = [];
    while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
      if (this.check(TokenType.IDENTIFIER)) {
        methods.push(this.parseMethodDeclaration());
      } else {
        this.error(`Unexpected token '${this.peek().value}' in service body`);
        this.advance();
      }
    }

    this.consume(TokenType.RIGHT_BRACE, "Expected '}' after service body");

    return new ServiceNode(name, methods, location);
  }

  parseParameter() {
    const location = this.getLocation();
    const name = this.consume(TokenType.IDENTIFIER, "Expected parameter name").value;

    this.consume(TokenType.COLON, "Expected ':' after parameter name");
    const type = this.parseType();

    let defaultValue = null;
    if (this.match(TokenType.ASSIGN)) {
      defaultValue = this.parseExpression();
    }

    return new ParameterNode(name, type, defaultValue, location);
  }

  parseType() {
    const location = this.getLocation();
    const name = this.consume(TokenType.IDENTIFIER, "Expected type name").value;

    let isArray = false;
    if (this.match(TokenType.LEFT_BRACKET)) {
      this.consume(TokenType.RIGHT_BRACKET, "Expected ']' after '['");
      isArray = true;
    }

    let isOptional = false;
    if (this.match(TokenType.QUESTION)) {
      isOptional = true;
    }

    return new TypeNode(name, isOptional, isArray, location);
  }

  // ============================================================================
  // Statement Parsing
  // ============================================================================

  parseStatement() {
    try {
      if (this.match(TokenType.IF)) {
        return this.parseIfStatement();
      }
      if (this.match(TokenType.FOR)) {
        return this.parseForStatement();
      }
      if (this.match(TokenType.WHILE)) {
        return this.parseWhileStatement();
      }
      if (this.match(TokenType.RETURN)) {
        return this.parseReturnStatement();
      }
      if (this.match(TokenType.BREAK)) {
        return this.parseBreakStatement();
      }
      if (this.match(TokenType.CONTINUE)) {
        return this.parseContinueStatement();
      }
      if (this.match(TokenType.LET, TokenType.CONST, TokenType.VAR)) {
        return this.parseVariableDeclaration();
      }
      if (this.match(TokenType.LEFT_BRACE)) {
        return this.parseBlockStatement();
      }

      return this.parseExpressionStatement();
    } catch (error) {
      this.error(error.message);
      this.synchronize();
      return null;
    }
  }

  parseBreakStatement() {
    const location = this.getLocation();
    return new BreakNode(location);
  }

  parseContinueStatement() {
    const location = this.getLocation();
    return new ContinueNode(location);
  }

  parseVariableDeclaration() {
    const location = this.getLocation();
    const kind = this.previous().value; // 'let', 'const', or 'var'

    const declarations = [];
    do {
      const id = this.consume(TokenType.IDENTIFIER, "Expected variable name");
      let init = null;

      if (this.match(TokenType.ASSIGN)) {
        init = this.parseExpression();
      }

      declarations.push(new VariableDeclaratorNode(new IdentifierNode(id.value, this.getLocation()), init, this.getLocation()));
    } while (this.match(TokenType.COMMA));

    return new VariableDeclarationNode(kind, declarations, location);
  }

  parseIfStatement() {
    const location = this.getLocation();

    this.consume(TokenType.LEFT_PAREN, "Expected '(' after 'if'");
    const condition = this.parseExpression();
    this.consume(TokenType.RIGHT_PAREN, "Expected ')' after if condition");

    const thenStatement = this.parseStatement();
    let elseStatement = null;

    if (this.match(TokenType.ELSE)) {
      elseStatement = this.parseStatement();
    }

    return new IfNode(condition, thenStatement, elseStatement, location);
  }

  parseForStatement() {
    const location = this.getLocation();

    this.consume(TokenType.LEFT_PAREN, "Expected '(' after 'for'");

    let init = null;
    if (!this.check(TokenType.SEMICOLON)) {
      // Check if this is a variable declaration or expression
      if (this.check(TokenType.LET) || this.check(TokenType.CONST) || this.check(TokenType.VAR)) {
        this.advance(); // consume the let/const/var token
        init = this.parseVariableDeclaration();
      } else {
        init = this.parseExpression();
      }
    }

    // Check if this is a for-in loop
    if (this.match(TokenType.IN)) {
      const iterable = this.parseExpression();
      this.consume(TokenType.RIGHT_PAREN, "Expected ')' after for-in clauses");
      const body = this.parseStatement();

      // For for-in loops, we use the init as the variable and iterable as the condition
      return new ForNode(init, iterable, null, body, location);
    }

    this.consume(TokenType.SEMICOLON, "Expected ';' after for loop initializer");

    let condition = null;
    if (!this.check(TokenType.SEMICOLON)) {
      condition = this.parseExpression();
    }
    this.consume(TokenType.SEMICOLON, "Expected ';' after for loop condition");

    let update = null;
    if (!this.check(TokenType.RIGHT_PAREN)) {
      update = this.parseExpression();
    }
    this.consume(TokenType.RIGHT_PAREN, "Expected ')' after for clauses");

    const body = this.parseStatement();

    return new ForNode(init, condition, update, body, location);
  }

  parseWhileStatement() {
    const location = this.getLocation();

    this.consume(TokenType.LEFT_PAREN, "Expected '(' after 'while'");
    const condition = this.parseExpression();
    this.consume(TokenType.RIGHT_PAREN, "Expected ')' after while condition");

    const body = this.parseStatement();

    return new WhileNode(condition, body, location);
  }

  parseReturnStatement() {
    const location = this.getLocation();

    let expression = null;
    if (!this.check(TokenType.SEMICOLON) && !this.check(TokenType.RIGHT_BRACE)) {
      expression = this.parseExpression();
    }

    return new ReturnNode(expression, location);
  }

  parseBlockStatement() {
    const location = this.getLocation();
    const statements = [];

    while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
      statements.push(this.parseStatement());
    }

    this.consume(TokenType.RIGHT_BRACE, "Expected '}' after block");

    return new BlockNode(statements, location);
  }

  parseExpressionStatement() {
    const location = this.getLocation();
    const expression = this.parseExpression();
    return new ExpressionStatementNode(expression, location);
  }

  // ============================================================================
  // Expression Parsing
  // ============================================================================

  parseExpression() {
    return this.parseAssignmentExpression();
  }

  parseAssignmentExpression() {
    const location = this.getLocation();
    let expression = this.parseConditionalExpression();

    if (this.match(TokenType.ASSIGN, TokenType.PLUS_ASSIGN, TokenType.MINUS_ASSIGN,
                   TokenType.MULTIPLY_ASSIGN, TokenType.DIVIDE_ASSIGN)) {
      const operator = this.previous();
      const right = this.parseAssignmentExpression();
      expression = new AssignmentNode(expression, operator, right, location);
    }

    return expression;
  }

  parseConditionalExpression() {
    const location = this.getLocation();
    let expression = this.parseLogicalOrExpression();

    if (this.match(TokenType.QUESTION)) {
      const trueExpression = this.parseExpression();
      this.consume(TokenType.COLON, "Expected ':' after '?' in conditional expression");
      const falseExpression = this.parseConditionalExpression();
      expression = new ConditionalNode(expression, trueExpression, falseExpression, location);
    }

    return expression;
  }

  parseLogicalOrExpression() {
    const location = this.getLocation();
    let expression = this.parseLogicalAndExpression();

    while (this.match(TokenType.LOGICAL_OR)) {
      const operator = this.previous();
      const right = this.parseLogicalAndExpression();
      expression = new BinaryExpressionNode(expression, operator, right, location);
    }

    return expression;
  }

  parseLogicalAndExpression() {
    const location = this.getLocation();
    let expression = this.parseEqualityExpression();

    while (this.match(TokenType.LOGICAL_AND)) {
      const operator = this.previous();
      const right = this.parseEqualityExpression();
      expression = new BinaryExpressionNode(expression, operator, right, location);
    }

    return expression;
  }

  parseEqualityExpression() {
    const location = this.getLocation();
    let expression = this.parseRelationalExpression();

    while (this.match(TokenType.EQUAL, TokenType.NOT_EQUAL)) {
      const operator = this.previous();
      const right = this.parseRelationalExpression();
      expression = new BinaryExpressionNode(expression, operator, right, location);
    }

    return expression;
  }

  parseRelationalExpression() {
    const location = this.getLocation();
    let expression = this.parseAdditiveExpression();

    while (this.match(TokenType.LESS_THAN, TokenType.GREATER_THAN,
                      TokenType.LESS_EQUAL, TokenType.GREATER_EQUAL)) {
      const operator = this.previous();
      const right = this.parseAdditiveExpression();
      expression = new BinaryExpressionNode(expression, operator, right, location);
    }

    return expression;
  }

  parseAdditiveExpression() {
    const location = this.getLocation();
    let expression = this.parseMultiplicativeExpression();

    while (this.match(TokenType.PLUS, TokenType.MINUS)) {
      const operator = this.previous();
      const right = this.parseMultiplicativeExpression();
      expression = new BinaryExpressionNode(expression, operator, right, location);
    }

    return expression;
  }

  parseMultiplicativeExpression() {
    const location = this.getLocation();
    let expression = this.parseUnaryExpression();

    while (this.match(TokenType.MULTIPLY, TokenType.DIVIDE, TokenType.MODULO)) {
      const operator = this.previous();
      const right = this.parseUnaryExpression();
      expression = new BinaryExpressionNode(expression, operator, right, location);
    }

    return expression;
  }

  parseUnaryExpression() {
    const location = this.getLocation();

    if (this.match(TokenType.LOGICAL_NOT, TokenType.MINUS, TokenType.PLUS)) {
      const operator = this.previous();
      const operand = this.parseUnaryExpression();
      return new UnaryExpressionNode(operator, operand, true, location);
    }

    if (this.match(TokenType.INCREMENT, TokenType.DECREMENT)) {
      const operator = this.previous();
      const operand = this.parsePostfixExpression();
      return new UnaryExpressionNode(operator, operand, true, location);
    }

    return this.parsePostfixExpression();
  }

  parsePostfixExpression() {
    const location = this.getLocation();
    let expression = this.parsePrimaryExpression();

    while (true) {
      if (this.match(TokenType.INCREMENT, TokenType.DECREMENT)) {
        const operator = this.previous();
        expression = new UnaryExpressionNode(operator, expression, false, location);
      } else if (this.match(TokenType.LEFT_BRACKET)) {
        const index = this.parseExpression();
        this.consume(TokenType.RIGHT_BRACKET, "Expected ']' after array index");
        expression = new MemberNode(expression, index, true, location);
      } else if (this.match(TokenType.DOT)) {
        // Allow both identifiers and keywords as property names
        let property;
        if (this.check(TokenType.IDENTIFIER) || this.peek().isKeyword()) {
          property = this.advance();
        } else {
          throw new ParseError("Expected property name after '.'", this.peek());
        }
        expression = new MemberNode(expression, new IdentifierNode(property.value, this.getLocation()), false, location);
      } else if (this.match(TokenType.LEFT_PAREN)) {
        const args = [];
        if (!this.check(TokenType.RIGHT_PAREN)) {
          do {
            args.push(this.parseExpression());
          } while (this.match(TokenType.COMMA));
        }
        this.consume(TokenType.RIGHT_PAREN, "Expected ')' after arguments");
        expression = new CallNode(expression, args, location);
      } else {
        break;
      }
    }

    return expression;
  }

  parsePrimaryExpression() {
    const location = this.getLocation();

    if (this.match(TokenType.TRUE, TokenType.FALSE)) {
      return new BooleanLiteralNode(this.previous().value, location);
    }

    if (this.match(TokenType.NULL)) {
      return new NullLiteralNode(location);
    }

    if (this.match(TokenType.NUMBER)) {
      return new NumberLiteralNode(this.previous().value, location);
    }

    if (this.match(TokenType.STRING)) {
      return new StringLiteralNode(this.previous().value, location);
    }

    if (this.match(TokenType.THIS)) {
      return new ThisNode(location);
    }

    if (this.match(TokenType.NEW)) {
      const callee = this.parsePrimaryExpression();
      let args = [];
      if (this.match(TokenType.LEFT_PAREN)) {
        if (!this.check(TokenType.RIGHT_PAREN)) {
          do {
            args.push(this.parseExpression());
          } while (this.match(TokenType.COMMA));
        }
        this.consume(TokenType.RIGHT_PAREN, "Expected ')' after arguments");
      }
      return new NewExpressionNode(callee, args, location);
    }

    if (this.match(TokenType.IDENTIFIER)) {
      const identifier = this.previous();

      // Check if this is a custom object literal syntax: TypeName { ... }
      if (this.check(TokenType.LEFT_BRACE)) {
        this.advance(); // consume '{'
        const properties = [];

        if (!this.check(TokenType.RIGHT_BRACE)) {
          do {
            const key = this.consume(TokenType.IDENTIFIER, "Expected property name").value;
            this.consume(TokenType.COLON, "Expected ':' after property name");
            const value = this.parseExpression();
            properties.push(new ObjectPropertyNode(key, value, this.getLocation()));
          } while (this.match(TokenType.COMMA));
        }

        this.consume(TokenType.RIGHT_BRACE, "Expected '}' after object properties");

        // Create a special object literal with type information
        const objectLiteral = new ObjectLiteralNode(properties, location);
        objectLiteral.typeName = identifier.value; // Add type name for custom syntax
        return objectLiteral;
      }

      // Check if this might be an arrow function parameter
      if (this.match(TokenType.ARROW)) {
        const param = new IdentifierNode(identifier.value, location);
        let body;
        if (this.check(TokenType.LEFT_BRACE)) {
          // Block body - parse manually to avoid context issues
          this.advance(); // consume '{'
          const statements = [];
          while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
            statements.push(this.parseStatement());
          }
          this.consume(TokenType.RIGHT_BRACE, "Expected '}' after arrow function block");
          body = new BlockNode(statements, location);
        } else {
          // Expression body
          body = this.parseExpression();
        }
        return new ArrowFunctionNode([param], body, false, location);
      }
      return new IdentifierNode(identifier.value, location);
    }

    if (this.match(TokenType.LEFT_PAREN)) {
      // Check if this might be an arrow function parameter list
      const checkpoint = this.current - 1;
      try {
        const params = [];
        if (!this.check(TokenType.RIGHT_PAREN)) {
          do {
            if (this.check(TokenType.IDENTIFIER)) {
              params.push(new IdentifierNode(this.advance().value, this.getLocation()));
            } else {
              throw new Error("Not arrow function params");
            }
          } while (this.match(TokenType.COMMA));
        }

        this.consume(TokenType.RIGHT_PAREN, "Expected ')' after parameters");

        if (this.match(TokenType.ARROW)) {
          // This is an arrow function
          let body;
          if (this.check(TokenType.LEFT_BRACE)) {
            // Block body - parse manually to avoid context issues
            this.advance(); // consume '{'
            const statements = [];
            while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
              statements.push(this.parseStatement());
            }
            this.consume(TokenType.RIGHT_BRACE, "Expected '}' after arrow function block");
            body = new BlockNode(statements, location);
          } else {
            // Expression body
            body = this.parseExpression();
          }
          return new ArrowFunctionNode(params, body, false, location);
        } else {
          throw new Error("Not an arrow function");
        }
      } catch (error) {
        // Reset and parse as grouped expression
        this.current = checkpoint + 1;
        const expression = this.parseExpression();
        this.consume(TokenType.RIGHT_PAREN, "Expected ')' after expression");
        return expression;
      }
    }

    if (this.match(TokenType.LEFT_BRACKET)) {
      return this.parseArrayLiteral();
    }

    if (this.match(TokenType.LEFT_BRACE)) {
      return this.parseObjectLiteral();
    }

    // Check for JSX elements
    if (this.check(TokenType.LESS_THAN)) {
      return this.parseJSXElement();
    }

    throw new ParseError(`Unexpected token '${this.peek().value}'`, this.peek());
  }

  parseArrayLiteral() {
    const location = this.getLocation();
    const elements = [];

    if (!this.check(TokenType.RIGHT_BRACKET)) {
      do {
        elements.push(this.parseExpression());
      } while (this.match(TokenType.COMMA));
    }

    this.consume(TokenType.RIGHT_BRACKET, "Expected ']' after array elements");
    return new ArrayLiteralNode(elements, location);
  }

  parseObjectLiteral() {
    const location = this.getLocation();
    const properties = [];

    if (!this.check(TokenType.RIGHT_BRACE)) {
      do {
        const key = this.consume(TokenType.IDENTIFIER, "Expected property name").value;
        this.consume(TokenType.COLON, "Expected ':' after property name");
        const value = this.parseExpression();
        properties.push(new ObjectPropertyNode(key, value, this.getLocation()));
      } while (this.match(TokenType.COMMA));
    }

    this.consume(TokenType.RIGHT_BRACE, "Expected '}' after object properties");
    return new ObjectLiteralNode(properties, location);
  }

  // ============================================================================
  // JSX Parsing
  // ============================================================================

  parseJSXElement() {
    const location = this.getLocation();

    this.consume(TokenType.LESS_THAN, "Expected '<' to start JSX element");
    const tagName = this.consume(TokenType.IDENTIFIER, "Expected JSX tag name").value;

    const attributes = [];
    while (!this.check(TokenType.GREATER_THAN) && !this.check(TokenType.JSX_SELF_CLOSE) && !this.isAtEnd()) {
      attributes.push(this.parseJSXAttribute());
    }

    if (this.match(TokenType.JSX_SELF_CLOSE)) {
      return new JSXElementNode(tagName, attributes, [], true, location);
    }

    this.consume(TokenType.GREATER_THAN, "Expected '>' after JSX opening tag");

    const children = [];
    while (!this.check(TokenType.JSX_END_OPEN) && !this.isAtEnd()) {
      children.push(this.parseJSXChild());
    }

    this.consume(TokenType.JSX_END_OPEN, "Expected '</' to close JSX element");
    const closingTagName = this.consume(TokenType.IDENTIFIER, "Expected closing tag name").value;

    if (tagName !== closingTagName) {
      this.error(`Mismatched JSX tags: expected '${tagName}' but got '${closingTagName}'`);
    }

    this.consume(TokenType.GREATER_THAN, "Expected '>' after JSX closing tag");

    return new JSXElementNode(tagName, attributes, children, false, location);
  }

  parseJSXAttribute() {
    const location = this.getLocation();
    const name = this.consume(TokenType.IDENTIFIER, "Expected JSX attribute name").value;

    if (this.match(TokenType.ASSIGN)) {
      if (this.match(TokenType.STRING)) {
        return new JSXAttributeNode(name, new StringLiteralNode(this.previous().value, this.getLocation()), location);
      } else if (this.match(TokenType.LEFT_BRACE)) {
        const expression = this.parseExpression();
        this.consume(TokenType.RIGHT_BRACE, "Expected '}' after JSX expression");
        return new JSXAttributeNode(name, new JSXExpressionNode(expression, this.getLocation()), location);
      } else {
        this.error("Expected string literal or expression after '=' in JSX attribute");
      }
    }

    return new JSXAttributeNode(name, null, location);
  }

  parseJSXChild() {
    if (this.check(TokenType.LESS_THAN)) {
      return this.parseJSXElement();
    }

    if (this.match(TokenType.LEFT_BRACE)) {
      const expression = this.parseExpression();
      this.consume(TokenType.RIGHT_BRACE, "Expected '}' after JSX expression");
      return new JSXExpressionNode(expression, this.getLocation());
    }

    // Parse JSX text - collect all non-JSX tokens as text
    let text = '';
    while (!this.check(TokenType.LESS_THAN) && !this.check(TokenType.LEFT_BRACE) &&
           !this.check(TokenType.JSX_END_OPEN) && !this.isAtEnd()) {
      text += this.advance().value;
    }

    if (text.trim()) {
      return new JSXTextNode(text.trim(), this.getLocation());
    }

    this.error("Expected JSX child element, expression, or text");
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  match(...types) {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  check(type) {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  advance() {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  isAtEnd() {
    return this.peek().type === TokenType.EOF;
  }

  peek() {
    return this.tokens[this.current] || { type: TokenType.EOF, value: '', line: 0, column: 0 };
  }

  peekNext() {
    if (this.current + 1 >= this.tokens.length) return null;
    return this.tokens[this.current + 1];
  }

  previous() {
    return this.tokens[this.current - 1];
  }

  consume(type, message) {
    if (this.check(type)) return this.advance();

    const current = this.peek();
    throw new ParseError(
      `${message}. Got '${current.value}' at line ${current.line}, column ${current.column}`,
      current,
      type
    );
  }

  error(message) {
    const token = this.peek();
    const error = new ParseError(
      `${message} at line ${token.line}, column ${token.column}`,
      token
    );
    this.errors.push(error);
    throw error;
  }

  synchronize() {
    this.advance();

    while (!this.isAtEnd()) {
      if (this.previous().type === TokenType.SEMICOLON) return;

      switch (this.peek().type) {
        case TokenType.COMPONENT:
        case TokenType.MODEL:
        case TokenType.SERVICE:
        case TokenType.IF:
        case TokenType.FOR:
        case TokenType.WHILE:
        case TokenType.RETURN:
          return;
      }

      this.advance();
    }
  }

  getLocation() {
    const token = this.peek();
    return {
      line: token.line,
      column: token.column,
      start: token.start,
      end: token.end
    };
  }

  // Public methods for testing and debugging
  getErrors() {
    return this.errors;
  }

  hasErrors() {
    return this.errors.length > 0;
  }

  reset() {
    this.tokens = [];
    this.current = 0;
    this.errors = [];
  }
}