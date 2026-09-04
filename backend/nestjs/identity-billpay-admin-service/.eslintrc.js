module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint/eslint-plugin', 'boundaries'],
  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['.eslintrc.js', 'dist', 'node_modules'],
  settings: {
    'boundaries/elements': [
      { type: 'auth-module', pattern: 'src/modules/auth/**' },
      { type: 'bill-payment-module', pattern: 'src/modules/bill-payment/**' },
      { type: 'admin-module', pattern: 'src/modules/admin/**' },
      { type: 'common', pattern: 'src/common/**' },
      { type: 'internal-events', pattern: 'src/internal-events/**' },
      { type: 'clients', pattern: 'src/clients/**' },
      { type: 'config', pattern: 'src/config/**' },
    ],
  },
  rules: {
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    // Non-negotiable #1 (see NestJS_Service_Architecture_FINAL.md §5):
    // modules/auth, modules/bill-payment and modules/admin never import
    // from each other directly. Cross-module communication only through
    // internal-event-bus. Proven with a deliberately-wrong import in CI.
    'boundaries/element-types': [
      2,
      {
        default: 'allow',
        rules: [
          {
            from: 'auth-module',
            disallow: ['bill-payment-module', 'admin-module'],
            message:
              'modules/auth must not import from other domain modules directly — use the internal event bus.',
          },
          {
            from: 'bill-payment-module',
            disallow: ['auth-module', 'admin-module'],
            message:
              'modules/bill-payment must not import from other domain modules directly — use the internal event bus.',
          },
          {
            from: 'admin-module',
            disallow: ['auth-module', 'bill-payment-module'],
            message:
              'modules/admin must not import from other domain modules directly — use the internal event bus.',
          },
        ],
      },
    ],
  },
};
