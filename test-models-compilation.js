/**
 * Test script to verify TodoLang models compilation
 */

import { TodoLangLexer } from './src/language/lexer/index.js';
import { TodoLangParser } from './src/language/parser/index.js';
import { TodoLangCompiler } from './src/language/compiler/index.js';
import fs from 'fs';

async function testModelsCompilation() {
  try {
    const source = fs.readFileSync('./src/app/models/index.todolang', 'utf8');
    console.log('📝 Compiling TodoLang models...');
    console.log('Source length:', source.length, 'characters');

    const lexer = new TodoLangLexer();
    const tokens = lexer.tokenize(source);
    console.log('✅ Lexing completed:', tokens.length, 'tokens');

    const parser = new TodoLangParser();
    const ast = parser.parse(tokens);
    console.log('✅ Parsing completed');

    const compiler = new TodoLangCompiler();
    const result = compiler.compile(ast);
    console.log('✅ Compilation completed');
    console.log('Generated JavaScript length:', result.code.length, 'characters');

    // Write compiled output for inspection
    fs.writeFileSync('./dist/models.js', result.code);
    console.log('✅ Compiled models written to dist/models.js');

    return true;
  } catch (error) {
    console.error('❌ Compilation failed:', error.message);
    if (error.location) {
      console.error('Location:', error.location);
    }
    return false;
  }
}

testModelsCompilation().then(success => {
  process.exit(success ? 0 : 1);
});