import { TodoLangLexer } from './src/language/lexer/index.js';
import { TokenType } from './src/language/tokens.js';

console.log('Testing lexer...');

const lexer = new TodoLangLexer();
const tokens = lexer.tokenize('component TodoApp');

console.log('Tokens:', tokens.map(t => `${t.type}:${t.value}`));