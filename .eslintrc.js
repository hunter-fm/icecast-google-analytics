module.exports = {
  env: {
    es6: true,
    node: true,
  },
  extends: ['airbnb-base', 'prettier'],
  plugins: ['prettier'],
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly',
  },
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
  },
  rules: {
    "no-console": 'off',
    'prettier/prettier': 'error',
    'no-underscore-dangle': ['error', { 'allow': ['_text', '_attributes'] }],
    'func-names': ['error', 'allow'],
    'no-plusplus': ['error', 'allow'],
    'class-methods-use-this': 'off',
    'no-param-reassign': 'off',
    'camelcase': 'off',
    'no-unused-vars': ['error', { argsIgnorePattern: 'next' }],
  },
};
