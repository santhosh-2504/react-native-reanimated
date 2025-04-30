const path = require('path');

console.log(path.resolve(__dirname, 'bob.babel.config.js'));

module.exports = {
  source: 'src',
  output: 'lib',
  targets: [
    [
      'module',
      {
        esm: true,
        jsxRuntime: 'classic',
        configFile: path.resolve(__dirname, 'bob.babel.config.js'),
      },
    ],
    'typescript',
  ],
};
