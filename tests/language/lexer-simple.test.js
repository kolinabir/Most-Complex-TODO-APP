import { TodoLangLexer, LexerError } from '../../src/language/lexer/index.js';
import { TokenType } from '../../src/language/tokens.js';

export function runSimpleLexerTests() {
  console.log('📝 Running Simple Lexer Tests...\n');

  let passed = 0;
  let failed = 0;
  let total = 0;

  // Test 1: Basic tokenization
  total++;
  try {
    const lexer = new TodoLangLexer();
    const tokens = lexer.tokenize('component TodoApp');

    if (tokens.length === 3 &&
        tokens[0].type === TokenType.COMPONENT &&
        tokens[1].type === TokenType.IDENTIFIER &&
        tokens[2].type === TokenType.EOF) {
      console.log('  ✅ should tokenize basic component declaration');
      passed++;
    } else {
      console.log('  ❌ should tokenize basic component declaration: wrong tokens');
      failed++;
    }
  } catch (error) {
    console.log('  ❌ should tokenize basic component declaration:', error.message);
    failed++;
  }

  // Test 2: Keywords
  total++;
  try {
    const lexer = new TodoLangLexer();
    const tokens = lexer.tokenize('component state render');

    if (tokens.length === 4 &&
        tokens[0].type === TokenType.COMPONENT &&
        tokens[1].type === TokenType.STATE &&
        tokens[2].type === TokenType.RENDER &&
        tokens[3].type === TokenType.EOF) {
      console.log('  ✅ should tokenize keywords');
      passed++;
    } else {
      console.log('  ❌ should tokenize keywords: wrong tokens');
      failed++;
    }
  } catch (error) {
    console.log('  ❌ should tokenize keywords:', error.message);
    failed++;
  }

  // Test 3: Operators
  total++;
  try {
    const lexer = new TodoLangLexer();
    const tokens = lexer.tokenize('+ - * /');

    if (tokens.length === 5 &&
        tokens[0].type === TokenType.PLUS &&
        tokens[1].type === TokenType.MINUS &&
        tokens[2].type === TokenType.MULTIPLY &&
        tokens[3].type === TokenType.DIVIDE &&
        tokens[4].type === TokenType.EOF) {
      console.log('  ✅ should tokenize operators');
      passed++;
    } else {
      console.log('  ❌ should tokenize operators: wrong tokens');
      failed++;
    }
  } catch (error) {
    console.log('  ❌ should tokenize operators:', error.message);
    failed++;
  }

  // Test 4: String literals
  total++;
  try {
    const lexer = new TodoLangLexer();
    const tokens = lexer.tokenize('"hello world"');

    if (tokens.length === 2 &&
        tokens[0].type === TokenType.STRING &&
        tokens[0].value === 'hello world' &&
        tokens[1].type === TokenType.EOF) {
      console.log('  ✅ should tokenize string literals');
      passed++;
    } else {
      console.log('  ❌ should tokenize string literals: wrong tokens');
      failed++;
    }
  } catch (error) {
    console.log('  ❌ should tokenize string literals:', error.message);
    failed++;
  }

  // Test 5: Error handling
  total++;
  try {
    const lexer = new TodoLangLexer();
    lexer.tokenize('"unterminated string');
    console.log('  ❌ should handle unterminated string: no error thrown');
    failed++;
  } catch (error) {
    if (error instanceof LexerError) {
      console.log('  ✅ should handle unterminated string');
      passed++;
    } else {
      console.log('  ❌ should handle unterminated string: wrong error type');
      failed++;
    }
  }

  console.log(`\n📊 Simple Lexer Test Results: ${passed}/${total} passed, ${failed} failed\n`);

  return { passed, failed, total };
}