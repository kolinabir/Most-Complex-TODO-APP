import { TodoLangLexer } from './src/language/lexer/index.js';
import { TodoLangParser, ParseError } from './src/language/parser/index.js';

const source = `
  component TestComponent {
    testMethod() {
      result = e => e.key === 'Enter'
    }
    render() { <div>Test</div> }
  }
`;

const lexer = new TodoLangLexer();
const parser = new TodoLangParser();

try {
  const tokens = lexer.tokenize(source);
  const ast = parser.parse(tokens);
  console.log('Parsing succeeded - no error thrown');
  console.log('AST:', JSON.stringify(ast, null, 2));
} catch (error) {
  console.log('Error type:', error.constructor.name);
  console.log('Error message:', error.message);
  console.log('Has location:', !!error.location);
  if (error.location) {
    console.log('Location:', error.location);
  }
}