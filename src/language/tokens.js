/**
 * TodoLang Token Definitions
 *
 * This file defines all token types used by the TodoLang lexer.
 * Each token type represents a different category of lexical element
 * in the TodoLang source code.
 */

// Token types enumeration
export const TokenType = {
  // Literals
  STRING: 'STRING',
  NUMBER: 'NUMBER',
  BOOLEAN: 'BOOLEAN',
  NULL: 'NULL',

  // Identifiers and Keywords
  IDENTIFIER: 'IDENTIFIER',
  COMPONENT: 'COMPONENT',
  STATE: 'STATE',
  RENDER: 'RENDER',
  COMPUTED: 'COMPUTED',
  MODEL: 'MODEL',
  SERVICE: 'SERVICE',
  STATIC: 'STATIC',
  IF: 'IF',
  ELSE: 'ELSE',
  FOR: 'FOR',
  WHILE: 'WHILE',
  RETURN: 'RETURN',
  THIS: 'THIS',
  TRUE: 'TRUE',
  FALSE: 'FALSE',
  LET: 'LET',
  CONST: 'CONST',
  VAR: 'VAR',
  BREAK: 'BREAK',
  CONTINUE: 'CONTINUE',
  IN: 'IN',
  NEW: 'NEW',

  // Operators
  ASSIGN: 'ASSIGN',                    // =
  PLUS_ASSIGN: 'PLUS_ASSIGN',          // +=
  MINUS_ASSIGN: 'MINUS_ASSIGN',        // -=
  MULTIPLY_ASSIGN: 'MULTIPLY_ASSIGN',  // *=
  DIVIDE_ASSIGN: 'DIVIDE_ASSIGN',      // /=

  EQUAL: 'EQUAL',                      // ==
  NOT_EQUAL: 'NOT_EQUAL',              // !=
  LESS_THAN: 'LESS_THAN',              // <
  GREATER_THAN: 'GREATER_THAN',        // >
  LESS_EQUAL: 'LESS_EQUAL',            // <=
  GREATER_EQUAL: 'GREATER_EQUAL',      // >=

  PLUS: 'PLUS',                        // +
  MINUS: 'MINUS',                      // -
  MULTIPLY: 'MULTIPLY',                // *
  DIVIDE: 'DIVIDE',                    // /
  MODULO: 'MODULO',                    // %

  INCREMENT: 'INCREMENT',              // ++
  DECREMENT: 'DECREMENT',              // --

  LOGICAL_AND: 'LOGICAL_AND',          // &&
  LOGICAL_OR: 'LOGICAL_OR',            // ||
  LOGICAL_NOT: 'LOGICAL_NOT',          // !

  QUESTION: 'QUESTION',                // ?
  DOT: 'DOT',                          // .
  ARROW: 'ARROW',                      // =>

  // Delimiters
  LEFT_BRACE: 'LEFT_BRACE',            // {
  RIGHT_BRACE: 'RIGHT_BRACE',          // }
  LEFT_PAREN: 'LEFT_PAREN',            // (
  RIGHT_PAREN: 'RIGHT_PAREN',          // )
  LEFT_BRACKET: 'LEFT_BRACKET',        // [
  RIGHT_BRACKET: 'RIGHT_BRACKET',      // ]

  // JSX-specific tokens
  JSX_OPEN: 'JSX_OPEN',                // <
  JSX_CLOSE: 'JSX_CLOSE',              // >
  JSX_SELF_CLOSE: 'JSX_SELF_CLOSE',    // />
  JSX_END_OPEN: 'JSX_END_OPEN',        // </

  SEMICOLON: 'SEMICOLON',              // ;
  COMMA: 'COMMA',                      // ,
  COLON: 'COLON',                      // :

  // Stokens
  EOF: 'EOF',                          // End of file
  NEWLINE: 'NEWLINE',                  // \n
  WHITESPACE: 'WHITESPACE',            // spaces, tabs
  COMMENT: 'COMMENT',                  // // or /* */

  // Error token
  INVALID: 'INVALID'
};

// Keywords mapping
export const Keywords = {
  'component': TokenType.COMPONENT,
  'state': TokenType.STATE,
  'render': TokenType.RENDER,
  'computed': TokenType.COMPUTED,
  'model': TokenType.MODEL,
  'service': TokenType.SERVICE,
  'static': TokenType.STATIC,
  'if': TokenType.IF,
  'else': TokenType.ELSE,
  'for': TokenType.FOR,
  'while': TokenType.WHILE,
  'return': TokenType.RETURN,
  'this': TokenType.THIS,
  'true': TokenType.TRUE,
  'false': TokenType.FALSE,
  'null': TokenType.NULL,
  'let': TokenType.LET,
  'const': TokenType.CONST,
  'var': TokenType.VAR,
  'break': TokenType.BREAK,
  'continue': TokenType.CONTINUE,
  'in': TokenType.IN,
  'new': TokenType.NEW
};

// Token class definition
export class Token {
  constructor(type, value, line = 1, column = 1, start = 0, end = 0) {
    this.type = type;
    this.value = value;
    this.line = line;
    this.column = column;
    this.start = start;
    this.end = end;
  }

  toString() {
    return `Token(${this.type}, "${this.value}", ${this.line}:${this.column})`;
  }

  // Check if token is of a specific type
  is(type) {
    return this.type === type;
  }

  // Check if token is one of multiple types
  isOneOf(...types) {
    return types.includes(this.type);
  }

  // Check if token is a keyword
  isKeyword() {
    return Object.values(Keywords).includes(this.type);
  }

  // Check if token is an operator
  isOperator() {
    const operators = [
      TokenType.ASSIGN, TokenType.PLUS_ASSIGN, TokenType.MINUS_ASSIGN,
      TokenType.MULTIPLY_ASSIGN, TokenType.DIVIDE_ASSIGN,
      TokenType.EQUAL, TokenType.NOT_EQUAL,
      TokenType.LESS_THAN, TokenType.GREATER_THAN,
      TokenType.LESS_EQUAL, TokenType.GREATER_EQUAL,
      TokenType.PLUS, TokenType.MINUS, TokenType.MULTIPLY,
      TokenType.DIVIDE, TokenType.MODULO,
      TokenType.INCREMENT, TokenType.DECREMENT,
      TokenType.LOGICAL_AND, TokenType.LOGICAL_OR, TokenType.LOGICAL_NOT
    ];
    return operators.includes(this.type);
  }

  // Check if token is a literal
  isLiteral() {
    return this.isOneOf(
      TokenType.STRING, TokenType.NUMBER,
      TokenType.TRUE, TokenType.FALSE, TokenType.NULL
    );
  }

  // Check if token is a delimiter
  isDelimiter() {
    return this.isOneOf(
      TokenType.LEFT_BRACE, TokenType.RIGHT_BRACE,
      TokenType.LEFT_PAREN, TokenType.RIGHT_PAREN,
      TokenType.LEFT_BRACKET, TokenType.RIGHT_BRACKET,
      TokenType.SEMICOLON, TokenType.COMMA, TokenType.COLON
    );
  }

  // Check if token is JSX-related
  isJSX() {
    return this.isOneOf(
      TokenType.JSX_OPEN, TokenType.JSX_CLOSE,
      TokenType.JSX_SELF_CLOSE, TokenType.JSX_END_OPEN
    );
  }
}

// Source location class for error reporting
export class SourceLocation {
  constructor(line, column, start, end) {
    this.line = line;
    this.column = column;
    this.start = start;
    this.end = end;
  }

  toString() {
    return `${this.line}:${this.column}`;
  }
}

// Operator precedence for parsing
export const OperatorPrecedence = {
  [TokenType.LOGICAL_OR]: 1,
  [TokenType.LOGICAL_AND]: 2,
  [TokenType.EQUAL]: 3,
  [TokenType.NOT_EQUAL]: 3,
  [TokenType.LESS_THAN]: 4,
  [TokenType.GREATER_THAN]: 4,
  [TokenType.LESS_EQUAL]: 4,
  [TokenType.GREATER_EQUAL]: 4,
  [TokenType.PLUS]: 5,
  [TokenType.MINUS]: 5,
  [TokenType.MULTIPLY]: 6,
  [TokenType.DIVIDE]: 6,
  [TokenType.MODULO]: 6,
  [TokenType.LOGICAL_NOT]: 7,
  [TokenType.INCREMENT]: 8,
  [TokenType.DECREMENT]: 8
};

// Utility functions for token classification
export const TokenUtils = {
  isAssignmentOperator(tokenType) {
    return [
      TokenType.ASSIGN, TokenType.PLUS_ASSIGN, TokenType.MINUS_ASSIGN,
      TokenType.MULTIPLY_ASSIGN, TokenType.DIVIDE_ASSIGN
    ].includes(tokenType);
  },

  isComparisonOperator(tokenType) {
    return [
      TokenType.EQUAL, TokenType.NOT_EQUAL,
      TokenType.LESS_THAN, TokenType.GREATER_THAN,
      TokenType.LESS_EQUAL, TokenType.GREATER_EQUAL
    ].includes(tokenType);
  },

  isArithmeticOperator(tokenType) {
    return [
      TokenType.PLUS, TokenType.MINUS, TokenType.MULTIPLY,
      TokenType.DIVIDE, TokenType.MODULO
    ].includes(tokenType);
  },

  isLogicalOperator(tokenType) {
    return [
      TokenType.LOGICAL_AND, TokenType.LOGICAL_OR, TokenType.LOGICAL_NOT
    ].includes(tokenType);
  },

  isUnaryOperator(tokenType) {
    return [
      TokenType.PLUS, TokenType.MINUS, TokenType.LOGICAL_NOT,
      TokenType.INCREMENT, TokenType.DECREMENT
    ].includes(tokenType);
  },

  isBinaryOperator(tokenType) {
    return [
      TokenType.PLUS, TokenType.MINUS, TokenType.MULTIPLY, TokenType.DIVIDE, TokenType.MODULO,
      TokenType.EQUAL, TokenType.NOT_EQUAL,
      TokenType.LESS_THAN, TokenType.GREATER_THAN, TokenType.LESS_EQUAL, TokenType.GREATER_EQUAL,
      TokenType.LOGICAL_AND, TokenType.LOGICAL_OR
    ].includes(tokenType);
  }
};