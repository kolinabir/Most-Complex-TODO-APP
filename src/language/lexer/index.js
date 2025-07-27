/**
 * TodoLang Lexer - Tokenizes source code into tokens
 *
 * This lexer converts TodoLang source code into a stream of tokens
 * that can be consumed by the parser. It handles all token types
 * defined in the TodoLang specification including keywords, operators,
 * literals, identifiers, and JSX syntax.
 */

import { Token, TokenType, Keywords, SourceLocation } from '../tokens.js';

export class LexerError extends Error {
  constructor(message, line, column, start) {
    super(message);
    this.name = 'LexerError';
    this.line = line;
    this.column = column;
    this.start = start;
    this.location = new SourceLocation(line, column, start, start + 1);
  }
}

export class TodoLangLexer {
  constructor(source = '') {
    this.source = source;
    this.position = 0;
    this.line = 1;
    this.column = 1;
    this.tokens = [];
    this.errors = [];
  }

  // Main tokenization method
  tokenize(source) {
    if (source !== undefined) {
      this.source = source;
      this.position = 0;
      this.line = 1;
      this.column = 1;
      this.tokens = [];
      this.errors = [];
    }

    while (!this.isAtEnd()) {
      this.scanToken();
    }

    // Add EOF token
    this.addToken(TokenType.EOF, '');

    if (this.errors.length > 0) {
      throw new LexerError(
        `Lexer encountered ${this.errors.length} error(s):\n${this.errors.map(e => e.message).join('\n')}`,
        this.line,
        this.column,
        this.position
      );
    }

    return this.tokens;
  }

  // Scan a single token
  scanToken() {
    const start = this.position;
    const startLine = this.line;
    const startColumn = this.column;

    const char = this.advance();

    switch (char) {
      // Whitespace
      case ' ':
      case '\r':
      case '\t':
        // Skip whitespace
        break;

      case '\n':
        this.line++;
        this.column = 1;
        break;

      // Single character tokens
      case '(':
        this.addToken(TokenType.LEFT_PAREN, char, startLine, startColumn, start);
        break;
      case ')':
        this.addToken(TokenType.RIGHT_PAREN, char, startLine, startColumn, start);
        break;
      case '{':
        this.addToken(TokenType.LEFT_BRACE, char, startLine, startColumn, start);
        break;
      case '}':
        this.addToken(TokenType.RIGHT_BRACE, char, startLine, startColumn, start);
        break;
      case '[':
        this.addToken(TokenType.LEFT_BRACKET, char, startLine, startColumn, start);
        break;
      case ']':
        this.addToken(TokenType.RIGHT_BRACKET, char, startLine, startColumn, start);
        break;
      case ',':
        this.addToken(TokenType.COMMA, char, startLine, startColumn, start);
        break;
      case ';':
        this.addToken(TokenType.SEMICOLON, char, startLine, startColumn, start);
        break;
      case ':':
        this.addToken(TokenType.COLON, char, startLine, startColumn, start);
        break;
      case '?':
        this.addToken(TokenType.QUESTION, char, startLine, startColumn, start);
        break;
      case '.':
        this.addToken(TokenType.DOT, char, startLine, startColumn, start);
        break;

      // Operators that might be compound
      case '!':
        if (this.match('=')) {
          this.addToken(TokenType.NOT_EQUAL, '!=', startLine, startColumn, start);
        } else {
          this.addToken(TokenType.LOGICAL_NOT, '!', startLine, startColumn, start);
        }
        break;

      case '=':
        if (this.match('=')) {
          this.addToken(TokenType.EQUAL, '==', startLine, startColumn, start);
        } else if (this.match('>')) {
          this.addToken(TokenType.ARROW, '=>', startLine, startColumn, start);
        } else {
          this.addToken(TokenType.ASSIGN, '=', startLine, startColumn, start);
        }
        break;

      case '<':
        if (this.match('=')) {
          this.addToken(TokenType.LESS_EQUAL, '<=', startLine, startColumn, start);
        } else if (this.match('/')) {
          this.addToken(TokenType.JSX_END_OPEN, '</', startLine, startColumn, start);
        } else {
          // Could be JSX_OPEN or LESS_THAN - context dependent
          // For now, treat as LESS_THAN, parser will handle JSX context
          this.addToken(TokenType.LESS_THAN, '<', startLine, startColumn, start);
        }
        break;

      case '>':
        if (this.match('=')) {
          this.addToken(TokenType.GREATER_EQUAL, '>=', startLine, startColumn, start);
        } else {
          // Could be JSX_CLOSE or GREATER_THAN - context dependent
          this.addToken(TokenType.GREATER_THAN, '>', startLine, startColumn, start);
        }
        break;

      case '+':
        if (this.match('+')) {
          this.addToken(TokenType.INCREMENT, '++', startLine, startColumn, start);
        } else if (this.match('=')) {
          this.addToken(TokenType.PLUS_ASSIGN, '+=', startLine, startColumn, start);
        } else {
          this.addToken(TokenType.PLUS, '+', startLine, startColumn, start);
        }
        break;

      case '-':
        if (this.match('-')) {
          this.addToken(TokenType.DECREMENT, '--', startLine, startColumn, start);
        } else if (this.match('=')) {
          this.addToken(TokenType.MINUS_ASSIGN, '-=', startLine, startColumn, start);
        } else {
          this.addToken(TokenType.MINUS, '-', startLine, startColumn, start);
        }
        break;

      case '*':
        if (this.match('=')) {
          this.addToken(TokenType.MULTIPLY_ASSIGN, '*=', startLine, startColumn, start);
        } else {
          this.addToken(TokenType.MULTIPLY, '*', startLine, startColumn, start);
        }
        break;

      case '%':
        this.addToken(TokenType.MODULO, '%', startLine, startColumn, start);
        break;

      case '&':
        if (this.match('&')) {
          this.addToken(TokenType.LOGICAL_AND, '&&', startLine, startColumn, start);
        } else {
          this.addError(`Unexpected character '&'`, startLine, startColumn, start);
        }
        break;

      case '|':
        if (this.match('|')) {
          this.addToken(TokenType.LOGICAL_OR, '||', startLine, startColumn, start);
        } else {
          this.addError(`Unexpected character '|'`, startLine, startColumn, start);
        }
        break;

      case '/':
        if (this.match('/')) {
          // Single line comment
          this.scanSingleLineComment(startLine, startColumn, start);
        } else if (this.match('*')) {
          // Multi-line comment
          this.scanMultiLineComment(startLine, startColumn, start);
        } else if (this.match('=')) {
          this.addToken(TokenType.DIVIDE_ASSIGN, '/=', startLine, startColumn, start);
        } else if (this.match('>')) {
          this.addToken(TokenType.JSX_SELF_CLOSE, '/>', startLine, startColumn, start);
        } else {
          this.addToken(TokenType.DIVIDE, '/', startLine, startColumn, start);
        }
        break;

      // String literals
      case '"':
      case "'":
        this.scanString(char, startLine, startColumn, start);
        break;

      default:
        if (this.isDigit(char)) {
          this.scanNumber(startLine, startColumn, start);
        } else if (this.isAlpha(char)) {
          this.scanIdentifier(startLine, startColumn, start);
        } else {
          this.addError(`Unexpected character '${char}'`, startLine, startColumn, start);
        }
        break;
    }
  }

  // Scan string literals
  scanString(quote, startLine, startColumn, start) {
    let value = '';

    while (!this.isAtEnd() && this.peek() !== quote) {
      if (this.peek() === '\n') {
        this.line++;
        this.column = 1;
      }

      if (this.peek() === '\\') {
        this.advance(); // consume backslash
        if (this.isAtEnd()) {
          this.addError('Unterminated string literal', startLine, startColumn, start);
          return;
        }

        const escaped = this.advance();
        switch (escaped) {
          case 'n': value += '\n'; break;
          case 't': value += '\t'; break;
          case 'r': value += '\r'; break;
          case '\\': value += '\\'; break;
          case '"': value += '"'; break;
          case "'": value += "'"; break;
          default:
            value += escaped;
            break;
        }
      } else {
        value += this.advance();
      }
    }

    if (this.isAtEnd()) {
      this.addError('Unterminated string literal', startLine, startColumn, start);
      return;
    }

    // Consume closing quote
    this.advance();
    this.addToken(TokenType.STRING, value, startLine, startColumn, start);
  }

  // Scan number literals
  scanNumber(startLine, startColumn, start) {
    while (this.isDigit(this.peek())) {
      this.advance();
    }

    // Look for decimal part
    if (this.peek() === '.' && this.isDigit(this.peekNext())) {
      this.advance(); // consume '.'
      while (this.isDigit(this.peek())) {
        this.advance();
      }
    }

    const value = this.source.substring(start, this.position);
    this.addToken(TokenType.NUMBER, value, startLine, startColumn, start);
  }

  // Scan identifiers and keywords
  scanIdentifier(startLine, startColumn, start) {
    while (this.isAlphaNumeric(this.peek())) {
      this.advance();
    }

    const value = this.source.substring(start, this.position);
    const tokenType = Keywords[value] || TokenType.IDENTIFIER;
    this.addToken(tokenType, value, startLine, startColumn, start);
  }

  // Scan single line comments
  scanSingleLineComment(startLine, startColumn, start) {
    let value = '//';
    while (!this.isAtEnd() && this.peek() !== '\n') {
      value += this.advance();
    }
    this.addToken(TokenType.COMMENT, value, startLine, startColumn, start);
  }

  // Scan multi-line comments
  scanMultiLineComment(startLine, startColumn, start) {
    let value = '/*';
    let depth = 1;

    while (!this.isAtEnd() && depth > 0) {
      if (this.peek() === '/' && this.peekNext() === '*') {
        value += this.advance(); // '/'
        value += this.advance(); // '*'
        depth++;
      } else if (this.peek() === '*' && this.peekNext() === '/') {
        value += this.advance(); // '*'
        value += this.advance(); // '/'
        depth--;
      } else {
        if (this.peek() === '\n') {
          this.line++;
          this.column = 1;
        }
        value += this.advance();
      }
    }

    if (depth > 0) {
      this.addError('Unterminated multi-line comment', startLine, startColumn, start);
      return;
    }

    this.addToken(TokenType.COMMENT, value, startLine, startColumn, start);
  }

  // Helper methods
  isAtEnd() {
    return this.position >= this.source.length;
  }

  advance() {
    if (this.isAtEnd()) return '\0';
    const char = this.source.charAt(this.position);
    this.position++;
    this.column++;
    return char;
  }

  match(expected) {
    if (this.isAtEnd()) return false;
    if (this.source.charAt(this.position) !== expected) return false;
    this.position++;
    this.column++;
    return true;
  }

  peek() {
    if (this.isAtEnd()) return '\0';
    return this.source.charAt(this.position);
  }

  peekNext() {
    if (this.position + 1 >= this.source.length) return '\0';
    return this.source.charAt(this.position + 1);
  }

  isDigit(char) {
    return char >= '0' && char <= '9';
  }

  isAlpha(char) {
    return (char >= 'a' && char <= 'z') ||
           (char >= 'A' && char <= 'Z') ||
           char === '_';
  }

  isAlphaNumeric(char) {
    return this.isAlpha(char) || this.isDigit(char);
  }

  addToken(type, value, line = this.line, column = this.column, start = this.position) {
    const end = this.position;
    const token = new Token(type, value, line, column, start, end);
    this.tokens.push(token);
  }

  addError(message, line, column, start) {
    const error = new LexerError(message, line, column, start);
    this.errors.push(error);
  }

  // Get all tokens (for testing)
  getTokens() {
    return this.tokens;
  }

  // Get all errors (for testing)
  getErrors() {
    return this.errors;
  }

  // Check if lexer has errors
  hasErrors() {
    return this.errors.length > 0;
  }

  // Reset lexer state
  reset() {
    this.source = '';
    this.position = 0;
    this.line = 1;
    this.column = 1;
    this.tokens = [];
    this.errors = [];
  }
}