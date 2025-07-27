/**
 * TodoLang Lexer Comprehensive Tests
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

// Test functions
function testEmptyString() {
  const lexer = new TodoLangLexer();
  const tokens = lexer.tokenize('');

  expectTokens(tokens, [
    [TokenType.EOF, '']
  ]);

  return { status: 'passed', message: 'Empty string tokenized correctly' };
}

function testWhitespace() {
  const lexer = new TodoLangLexer();
  const tokens = lexer.tokenize('   \t  \n  ');

  // EOF token should be on line 2 after the newline
  expectToken(tokens[0], TokenType.EOF, '', 2);

  return { status: 'passed', message: 'Whitespace handled correctly' };
}

function testKeywords() {
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
}

function testIdentifiers() {
  const lexer = new TodoLangLexer();
  const tokens = lexer.tokenize('TodoApp myVariable _private');

  expectTokens(tokens, [
    [TokenType.IDENTIFIER, 'TodoApp'],
    [TokenType.IDENTIFIER, 'myVariable'],
    [TokenType.IDENTIFIER, '_private'],
    [TokenType.EOF, '']
  ]);

  return { status: 'passed', message: 'Identifiers tokenized correctly' };
}

function testArithmeticOperators() {
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
}

function testComparisonOperators() {
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
}

function testLogicalOperators() {
  const lexer = new TodoLangLexer();
  const tokens = lexer.tokenize('&& || !');

  expectTokens(tokens, [
    [TokenType.LOGICAL_AND, '&&'],
    [TokenType.LOGICAL_OR, '||'],
    [TokenType.LOGICAL_NOT, '!'],
    [TokenType.EOF, '']
  ]);

  return { status: 'passed', message: 'Logical operators tokenized correctly' };
}

function testAssignmentOperators() {
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
}

function testIncrementDecrementOperators() {
  const lexer = new TodoLangLexer();
  const tokens = lexer.tokenize('++ --');

  expectTokens(tokens, [
    [TokenType.INCREMENT, '++'],
    [TokenType.DECREMENT, '--'],
    [TokenType.EOF, '']
  ]);

  return { status: 'passed', message: 'Increment/decrement operators tokenized correctly' };
}

function testDelimiters() {
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
}

function testJSXTokens() {
  const lexer = new TodoLangLexer();
  const tokens = lexer.tokenize('</ />');

  expectTokens(tokens, [
    [TokenType.JSX_END_OPEN, '</'],
    [TokenType.JSX_SELF_CLOSE, '/>'],
    [TokenType.EOF, '']
  ]);

  return { status: 'passed', message: 'JSX tokens tokenized correctly' };
}

function testStringLiterals() {
  const lexer = new TodoLangLexer();
  const tokens = lexer.tokenize('"hello world" \'single quotes\'');

  expectTokens(tokens, [
    [TokenType.STRING, 'hello world'],
    [TokenType.STRING, 'single quotes'],
    [TokenType.EOF, '']
  ]);

  return { status: 'passed', message: 'String literals tokenized correctly' };
}

function testStringEscapes() {
  const lexer = new TodoLangLexer();
  const tokens = lexer.tokenize('"hello\\nworld\\t\\"test\\""');

  expectTokens(tokens, [
    [TokenType.STRING, 'hello\nworld\t"test"'],
    [TokenType.EOF, '']
  ]);

  return { status: 'passed', message: 'String escape sequences handled correctly' };
}

function testNumbers() {
  const lexer = new TodoLangLexer();
  const tokens = lexer.tokenize('42 3.14 0 123.456');

  expectTokens(tokens, [
    [TokenType.NUMBER, '42'],
    [TokenType.NUMBER, '3.14'],
    [TokenType.NUMBER, '0'],
    [TokenType.NUMBER, '123.456'],
    [TokenType.EOF, '']
  ]);

  return { status: 'passed', message: 'Numbers tokenized correctly' };
}

function testComments() {
  const lexer = new TodoLangLexer();
  const tokens = lexer.tokenize('// single line\n/* multi\nline */');

  // Check individual tokens with correct line numbers
  expectToken(tokens[0], TokenType.COMMENT, '// single line', 1);
  expectToken(tokens[1], TokenType.COMMENT, '/* multi\nline */', 2);
  expectToken(tokens[2], TokenType.EOF, '', 3); // EOF should be on line 3 after multi-line comment

  return { status: 'passed', message: 'Comments tokenized correctly' };
}

function testLineTracking() {
  const lexer = new TodoLangLexer();
  const tokens = lexer.tokenize('first\nsecond\nthird');

  expectToken(tokens[0], TokenType.IDENTIFIER, 'first', 1);
  expectToken(tokens[1], TokenType.IDENTIFIER, 'second', 2);
  expectToken(tokens[2], TokenType.IDENTIFIER, 'third', 3);

  return { status: 'passed', message: 'Line numbers tracked correctly' };
}

function testComponentDefinition() {
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
}

function testJSXSyntax() {
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
}

// Error handling tests
function testUnterminatedString() {
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
}

function testUnterminatedComment() {
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
}

function testInvalidCharacters() {
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
}

// Export test runner function
export function runComprehensiveLexerTests() {
  console.log('📝 Running Comprehensive Lexer Tests...\n');

  const tests = [
    ['should tokenize empty string', testEmptyString],
    ['should tokenize whitespace correctly', testWhitespace],
    ['should tokenize all keywords', testKeywords],
    ['should tokenize identifiers', testIdentifiers],
    ['should tokenize arithmetic operators', testArithmeticOperators],
    ['should tokenize comparison operators', testComparisonOperators],
    ['should tokenize logical operators', testLogicalOperators],
    ['should tokenize assignment operators', testAssignmentOperators],
    ['should tokenize increment/decrement operators', testIncrementDecrementOperators],
    ['should tokenize delimiters', testDelimiters],
    ['should tokenize JSX tokens', testJSXTokens],
    ['should tokenize string literals', testStringLiterals],
    ['should handle string escape sequences', testStringEscapes],
    ['should tokenize numbers', testNumbers],
    ['should tokenize comments', testComments],
    ['should track line numbers correctly', testLineTracking],
    ['should tokenize component definition', testComponentDefinition],
    ['should tokenize JSX-like syntax', testJSXSyntax],
    ['should handle unterminated string error', testUnterminatedString],
    ['should handle unterminated comment error', testUnterminatedComment],
    ['should handle invalid characters', testInvalidCharacters]
  ];

  let passed = 0;
  let failed = 0;
  let total = 0;

  for (const [testName, testFn] of tests) {
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

  console.log(`\n📊 Comprehensive Lexer Test Results: ${passed}/${total} passed, ${failed} failed\n`);

  return { passed, failed, total };
}