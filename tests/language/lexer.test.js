/**
 * TodoLang Lexer Tests
 *
 * Comprehensive unit tests for the TodoLang lexer functionality.
 * Tests token recognition for keywords, identifiers, operators, literals,
 * and error handling for invalid characters and malformed tokens.
 */

import { TodoLangLexer, LexerError } from '../../src/language/lexer/index.js';
import { TokenType, Token } from '../../src/language/tokens.js';

// Test helper functions
function expectToken(token, type, value, line = 1, column = 1) {
  if (token.type !== type) {
    throw new Error(`Expected token type ${type}, got ${token.type}`);
  }
  if (token.value !== value) {
    throw new Error(`Expected token value "${value}", got "${token.value}"`);
  }
  if (token.line !== line) {
    throw new Error(`Expected token line ${line}, got ${token.line}`);
  }
}

function expectTokens(tokens, expectedTokens) {
  if (tokens.length !== expectedTokens.length) {
    throw new Error(`Expected ${expectedTokens.length} tokens, got ${tokens.length}`);
  }

  for (let i = 0; i < expectedTokens.length; i++) {
    const [type, value, line, column] = expectedTokens[i];
    expectToken(tokens[i], type, value, line, column);
  }
}

// Test suite for lexer functionality
export const lexerTests = {
  // Basic tokenization tests
  'should tokenize empty string': () => {
    const lexer = new TodoLangLexer();
    const tokens = lexer.tokenize('');

    expectTokens(tokens, [
      [TokenType.EOF, '']
    ]);

    return { status: 'passed', message: 'Empty string tokenized correctly' };
  },

  'should tokenize whitespace correctly': () => {
    const lexer = new TodoLangLexer();
    const tokens = lexer.tokenize('   \t  \n  ');

    expectTokens(tokens, [
      [TokenType.EOF, '']
    ]);

    return { status: 'passed', message: 'Whitespace handled correctly' };
  },

  // Keyword teld tokenize all keywords': () => {
    const lexer = new TodoLangLexer();
    const source = 'component state render computed model service static if else for while return this true false null';
    const tokens = lexer.tokenize(source);

    expectTokens(tokens, [
      [TokenType.COMPONENT, 'component'],
      [TokenType.STATE, 'state'],
      [TokenType.RENDER, 'render'],
      [TokenType.COMPUTED, 'computed'],
      [TokenType.MODEL, 'model'],
      [TokenType.SERVICE, 'service'],
      [TokenType.STATIC, 'static'],
      [TokenType.IF, 'if'],
      [TokenType.ELSE, 'else'],
      [TokenType.FOR, 'for'],
      [TokenType.WHILE, 'while'],
      [TokenType.RETURN, 'return'],
      [TokenType.THIS, 'this'],
      [TokenType.TRUE, 'true'],
      [TokenType.FALSE, 'false'],
      [TokenType.NULL, 'null'],
      [TokenType.EOF, '']
    ]);

    return { status: 'passed', message: 'All keywords tokenized correctly' };
  },

  // Identifier tests
  'should tokenize identifiers': () => {
    const lexer = new TodoLangLexer();
    const tokens = lexer.tokenize('TodoApp myVariable _private $special');

    expectTokens(tokens, [
      [TokenType.IDENTIFIER, 'TodoApp'],
      [TokenType.IDENTIFIER, 'myVariable'],
      [TokenType.IDENTIFIER, '_private'],
      [TokenType.IDENTIFIER, '$special'],
      [TokenType.EOF, '']
    ]);

    return { status: 'passed', message: 'Identifiers tokenized correctly' };
  },

  'should distinguish keywords from identifiers': () => {
    const lexer = new TodoLangLexer();
    const tokens = lexer.tokenize('component Component componentName');

    expectTokens(tokens, [
      [TokenType.COMPONENT, 'component'],
      [TokenType.IDENTIFIER, 'Component'],
      [TokenType.IDENTIFIER, 'componentName'],
      [TokenType.EOF, '']
    ]);

    return { status: 'passed', message: 'Keywords and identifiers distinguished correctly' };
  },

  // Operator tests
  'should tokenize arithmetic operators': () => {
    const lexer = new TodoLangLexer();
    const tokens = lexer.tokenize('+ - * / %');

    expectTokens(tokens, [
      [TokenType.PLUS, '+'],
      [TokenType.MINUS, '-'],
      [TokenType.MULTIPLY, '*'],
      [TokenType.DIVIDE, '/'],
      [TokenType.MODULO, '%'],
      [TokenType.EOF, '']
    ]);

    return { status: 'passed', message: 'Arithmetic operators tokenized correctly' };
  },

  'should tokenize comparison operators': () => {
    const lexer = new TodoLangLexer();
    const tokens = lexer.tokenize('== != < > <= >=');

    expectTokens(tokens, [
      [TokenType.EQUAL, '=='],
      [TokenType.NOT_EQUAL, '!='],
      [TokenType.LESS_THAN, '<'],
      [TokenType.GREATER_THAN, '>'],
      [TokenType.LESS_EQUAL, '<='],
      [TokenType.GREATER_EQUAL, '>='],
      [TokenType.EOF, '']
    ]);

    return { status: 'passed', message: 'Comparison operators tokenized correctly' };
  },

  'should tokenize logical operators': () => {
    const lexer = new TodoLangLexer();
    const tokens = lexer.tokenize('&& || !');

    expectTokens(tokens, [
      [TokenType.LOGICAL_AND, '&&'],
      [TokenType.LOGICAL_OR, '||'],
      [TokenType.LOGICAL_NOT, '!'],
      [TokenType.EOF, '']
    ]);

    return { status: 'passed', message: 'Logical operators tokenized correctly' };
  },

  'should tokenize assignment operators': () => {
    const lexer = new TodoLangLexer();
    const tokens = lexer.tokenize('= += -= *= /=');

    expectTokens(tokens, [
      [TokenType.ASSIGN, '='],
      [TokenType.PLUS_ASSIGN, '+='],
      [TokenType.MINUS_ASSIGN, '-='],
      [TokenType.MULTIPLY_ASSIGN, '*='],
      [TokenType.DIVIDE_ASSIGN, '/='],
      [TokenType.EOF, '']
    ]);

    return { status: 'passed', message: 'Assignment operators tokenized correctly' };
  },

  'should tokenize increment and decrement operators': () => {
    const lexer = new TodoLangLexer();
    const tokens = lexer.tokenize('++ --');

    expectTokens(tokens, [
      [TokenType.INCREMENT, '++'],
      [TokenType.DECREMENT, '--'],
      [TokenType.EOF, '']
    ]);

    return { status: 'passed', message: 'Increment/decrement operators tokenized correctly' };
  },

  // Delimiter tests
  'should tokenize delimiters': () => {
    const lexer = new TodoLangLexer();
    const tokens = lexer.tokenize('( ) { } [ ] ; , : . ?');

    expectTokens(tokens, [
      [TokenType.LEFT_PAREN, '('],
      [TokenType.RIGHT_PAREN, ')'],
      [TokenType.LEFT_BRACE, '{'],
      [TokenType.RIGHT_BRACE, '}'],
      [TokenType.LEFT_BRACKET, '['],
      [TokenType.RIGHT_BRACKET, ']'],
      [TokenType.SEMICOLON, ';'],
      [TokenType.COMMA, ','],
      [TokenType.COLON, ':'],
      [TokenType.DOT, '.'],
      [TokenType.QUESTION, '?'],
      [TokenType.EOF, '']
    ]);

    return { status: 'passed', message: 'Delimiters tokenized correctly' };
  },

  // JSX-specific token tests
  'should tokenize JSX tokens': () => {
    const lexer = new TodoLangLexer();
    const tokens = lexer.tokenize('</ />');

    expectTokens(tokens, [
      [TokenType.JSX_END_OPEN, '</'],
      [TokenType.JSX_SELF_CLOSE, '/>'],
      [TokenType.EOF, '']
    ]);

    return { status: 'passed', message: 'JSX tokens tokenized correctly' };
  },

  // String literal tests
  'should tokenize double-quoted strings': () => {
    const lexer = new TodoLangLexer();
    const tokens = lexer.tokenize('"hello world"');

    expectTokens(tokens, [
      [TokenType.STRING, 'hello world'],
      [TokenType.EOF, '']
    ]);

    return { status: 'passed', message: 'Double-quoted strings tokenized correctly' };
  },

  'should tokenize single-quoted strings': () => {
    const lexer = new TodoLangLexer();
    const tokens = lexer.tokenize("'hello world'");

    expectTokens(tokens, [
      [TokenType.STRING, 'hello world'],
      [TokenType.EOF, '']
    ]);

    return { status: 'passed', message: 'Single-quoted strings tokenized correctly' };
  },

  'should handle string escape sequences': () => {
    const lexer = new TodoLangLexer();
    const tokens = lexer.tokenize('"hello\\nworld\\t\\"test\\""');

    expectTokens(tokens, [
      [TokenType.STRING, 'hello\nworld\t"test"'],
      [TokenType.EOF, '']
    ]);

    return { status: 'passed', message: 'String escape sequences handled correctly' };
  },

  'should handle empty strings': () => {
    const lexer = new TodoLangLexer();
    const tokens = lexer.tokenize('""');

    expectTokens(tokens, [
      [TokenType.STRING, ''],
      [TokenType.EOF, '']
    ]);

    return { status: 'passed', message: 'Empty strings handled correctly' };
  },

  // Number literal tests
  'should tokenize integer numbers': () => {
    const lexer = new TodoLangLexer();
    const tokens = lexer.tokenize('42 0 123');

    expectTokens(tokens, [
      [TokenType.NUMBER, '42'],
      [TokenType.NUMBER, '0'],
      [TokenType.NUMBER, '123'],
      [TokenType.EOF, '']
    ]);

    return { status: 'passed', message: 'Integer numbers tokenized correctly' };
  },

  'should tokenize decimal numbers': () => {
    const lexer = new TodoLangLexer();
    const tokens = lexer.tokenize('3.14 0.5 123.456');

    expectTokens(tokens, [
      [TokenType.NUMBER, '3.14'],
      [TokenType.NUMBER, '0.5'],
      [TokenType.NUMBER, '123.456'],
      [TokenType.EOF, '']
    ]);

    return { status: 'passed', message: 'Decimal numbers tokenized correctly' };
  },

  // Comment tests
  'should tokenize single-line comments': () => {
    const lexer = new TodoLangLexer();
    const tokens = lexer.tokenize('// This is a comment');

    expectTokens(tokens, [
      [TokenType.COMMENT, '// This is a comment'],
      [TokenType.EOF, '']
    ]);

    return { status: 'passed', message: 'Single-line comments tokenized correctly' };
  },

  'should tokenize multi-line comments': () => {
    const lexer = new TodoLangLexer();
    const tokens = lexer.tokenize('/* This is a\nmulti-line comment */');

    expectTokens(tokens, [
      [TokenType.COMMENT, '/* This is a\nmulti-line comment */'],
      [TokenType.EOF, '']
    ]);

    return { status: 'passed', message: 'Multi-line comments tokenized correctly' };
  },

  // Line and column tracking tests
  'should track line numbers correctly': () => {
    const lexer = new TodoLangLexer();
    const tokens = lexer.tokenize('first\nsecond\nthird');

    expectToken(tokens[0], TokenType.IDENTIFIER, 'first', 1);
    expectToken(tokens[1], TokenType.IDENTIFIER, 'second', 2);
    expectToken(tokens[2], TokenType.IDENTIFIER, 'third', 3);

    return { status: 'passed', message: 'Line numbers tracked correctly' };
  },

  // Complex tokenization tests
  'should tokenize component definition': () => {
    const lexer = new TodoLangLexer();
    const source = `component TodoApp {
      state {
        todos: Todo[] = []
      }
    }`;

    const tokens = lexer.tokenize(source);

    // Check key tokens
    expectToken(tokens[0], TokenType.COMPONENT, 'component', 1);
    expectToken(tokens[1], TokenType.IDENTIFIER, 'TodoApp', 1);
    expectToken(tokens[2], TokenType.LEFT_BRACE, '{', 1);
    expectToken(tokens[3], TokenType.STATE, 'state', 2);
    expectToken(tokens[4], TokenType.LEFT_BRACE, '{', 2);
    expectToken(tokens[5], TokenType.IDENTIFIER, 'todos', 3);
    expectToken(tokens[6], TokenType.COLON, ':', 3);
    expectToken(tokens[7], TokenType.IDENTIFIER, 'Todo', 3);
    expectToken(tokens[8], TokenType.LEFT_BRACKET, '[', 3);
    expectToken(tokens[9], TokenType.RIGHT_BRACKET, ']', 3);
    expectToken(tokens[10], TokenType.ASSIGN, '=', 3);
    expectToken(tokens[11], TokenType.LEFT_BRACKET, '[', 3);
    expectToken(tokens[12], TokenType.RIGHT_BRACKET, ']', 3);

    return { status: 'passed', message: 'Component definition tokenized correctly' };
  },

  'should tokenize JSX-like syntax': () => {
    const lexer = new TodoLangLexer();
    const source = '<div class="todo-app"><TodoItem /></div>';

    const tokens = lexer.tokenize(source);

    // Check key JSX tokens
    expectToken(tokens[0], TokenType.LESS_THAN, '<', 1);
    expectToken(tokens[1], TokenType.IDENTIFIER, 'div', 1);
    expectToken(tokens[2], TokenType.IDENTIFIER, 'class', 1);
    expectToken(tokens[3], TokenType.ASSIGN, '=', 1);
    expectToken(tokens[4], TokenType.STRING, 'todo-app', 1);
    expectToken(tokens[5], TokenType.GREATER_THAN, '>', 1);
    expectToken(tokens[6], TokenType.LESS_THAN, '<', 1);
    expectToken(tokens[7], TokenType.IDENTIFIER, 'TodoItem', 1);
    expectToken(tokens[8], TokenType.JSX_SELF_CLOSE, '/>', 1);
    expectToken(tokens[9], TokenType.JSX_END_OPEN, '</', 1);
    expectToken(tokens[10], TokenType.IDENTIFIER, 'div', 1);
    expectToken(tokens[11], TokenType.GREATER_THAN, '>', 1);

    return { status: 'passed', message: 'JSX-like syntax tokenized correctly' };
  },

  // Error handling tests
  'should handle unterminated string error': () => {
    const lexer = new TodoLangLexer();

    try {
      lexer.tokenize('"unterminated string');
      return { status: 'failed', message: 'Should have thrown error for unterminated string' };
    } catch (error) {
      if (error instanceof LexerError && error.message.includes('Unterminated string literal')) {
        return { status: 'passed', message: 'Unterminated string error handled correctly' };
      }
      return { status: 'failed', message: `Unexpected error: ${error.message}` };
    }
  },

  'should handle unterminated multi-line comment error': () => {
    const lexer = new TodoLangLexer();

    try {
      lexer.tokenize('/* unterminated comment');
      return { status: 'failed', message: 'Should have thrown error for unterminated comment' };
    } catch (error) {
      if (error instanceof LexerError && error.message.includes('Unterminated multi-line comment')) {
        return { status: 'passed', message: 'Unterminated comment error handled correctly' };
      }
      return { status: 'failed', message: `Unexpected error: ${error.message}` };
    }
  },

  'should handle invalid characters': () => {
    const lexer = new TodoLangLexer();

    try {
      lexer.tokenize('valid @ invalid');
      return { status: 'failed', message: 'Should have thrown error for invalid character' };
    } catch (error) {
      if (error instanceof LexerError && error.message.includes('Unexpected character')) {
        return { status: 'passed', message: 'Invalid character error handled correctly' };
      }
      return { status: 'failed', message: `Unexpected error: ${error.message}` };
    }
  },

  'should handle single ampersand error': () => {
    const lexer = new TodoLangLexer();

    try {
      lexer.tokenize('valid & invalid');
      return { status: 'failed', message: 'Should have thrown error for single ampersand' };
    } catch (error) {
      if (error instanceof LexerError && error.message.includes("Unexpected character '&'")) {
        return { status: 'passed', message: 'Single ampersand error handled correctly' };
      }
      return { status: 'failed', message: `Unexpected error: ${error.message}` };
    }
  },

  'should handle single pipe error': () => {
    const lexer = new TodoLangLexer();

    try {
      lexer.tokenize('valid | invalid');
      return { status: 'failed', message: 'Should have thrown error for single pipe' };
    } catch (error) {
      if (error instanceof LexerError && error.message.includes("Unexpected character '|'")) {
        return { status: 'passed', message: 'Single pipe error handled correctly' };
      }
      return { status: 'failed', message: `Unexpected error: ${error.message}` };
    }
  },

  // Edge case tests
  'should handle consecutive operators': () => {
    const lexer = new TodoLangLexer();
    const tokens = lexer.tokenize('++--+=');

    expectTokens(tokens, [
      [TokenType.INCREMENT, '++'],
      [TokenType.DECREMENT, '--'],
      [TokenType.PLUS_ASSIGN, '+='],
      [TokenType.EOF, '']
    ]);

    return { status: 'passed', message: 'Consecutive operators handled correctly' };
  },

  'should handle mixed quotes in different strings': () => {
    const lexer = new TodoLangLexer();
    const tokens = lexer.tokenize('"double" \'single\'');

    expectTokens(tokens, [
      [TokenType.STRING, 'double'],
      [TokenType.STRING, 'single'],
      [TokenType.EOF, '']
    ]);

    return { status: 'passed', message: 'Mixed quotes handled correctly' };
  },

  'should handle numbers followed by identifiers': () => {
    const lexer = new TodoLangLexer();
    const tokens = lexer.tokenize('123abc');

    expectTokens(tokens, [
      [TokenType.NUMBER, '123'],
      [TokenType.IDENTIFIER, 'abc'],
      [TokenType.EOF, '']
    ]);

    return { status: 'passed', message: 'Numbers followed by identifiers handled correctly' };
  }
};

// Export test runner function
export function runLexerTests() {
  console.log('📝 Running Lexer Tests...\n');

  let passed = 0;
  let failed = 0;
  let total = 0;

  for (const [testName, testFn] of Object.entries(lexerTests)) {
    total++;
    try {
      const result = testFn();
      if (result.status === 'passed') {
        console.log(`  ✅ ${testName}`);
        passed++;
      } else {
        console.log(`  ❌ ${testName}: ${result.message}`);
        failed++;
      }
    } catch (error) {
      console.log(`  ❌ ${testName}: ${error.message}`);
      failed++;
    }
  }

  console.log(`\n📊 Lexer Test Results: ${passed}/${total} passed, ${failed} failed\n`);

  return { passed, failed, total };
}