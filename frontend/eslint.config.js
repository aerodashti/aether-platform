import js from '@eslint/js';
import boundaries from 'eslint-plugin-boundaries';
import importPlugin from 'eslint-plugin-import';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/** Elementos do frontend. As fronteiras entre eles estão em `docs/arquitetura.md`. */
const elementos = [
  { type: 'app', pattern: 'src/app' },
  { type: 'api', pattern: 'src/api' },
  { type: 'design-system', pattern: 'src/design-system' },
  { type: 'compartilhado', pattern: 'src/compartilhado' },
  { type: 'feature', pattern: 'src/features/*', capture: ['nome'] },
];

export default tseslint.config(
  {
    ignores: ['dist', 'coverage', 'src/api/tipos-gerados.ts', 'src/design-system/tokens/tokens.ts'],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: {
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
      import: importPlugin,
      boundaries,
    },
    settings: {
      // Sem o resolver de TypeScript, o boundaries não enxerga imports .ts/.tsx nem o alias `@/`.
      'import/resolver': { typescript: { project: './tsconfig.json' } },
      'boundaries/elements': elementos,
      'boundaries/include': ['src/**/*'],
    },
    rules: {
      ...jsxA11y.flatConfigs.recommended.rules,
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // Só o wrapper de log fala com o console (docs/logs.md).
      'no-console': 'error',

      // Elemento interativo cru concentra estados, foco e tokens: mora no design system.
      'no-restricted-syntax': [
        'error',
        {
          selector: 'JSXOpeningElement[name.name=/^(button|input|a|select|textarea)$/]',
          message: 'Elemento interativo cru só dentro de design-system/. Use ou crie um primitivo.',
        },
      ],

      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          pathGroups: [{ pattern: '@/**', group: 'internal' }],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],

      'boundaries/dependencies': [
        'error',
        {
          default: 'allow',
          policies: [
            {
              from: { element: { type: 'design-system' } },
              disallow: { to: { element: { types: { anyOf: ['feature', 'app', 'api'] } } } },
              message: 'design-system não conhece feature, app nem api.',
            },
            {
              from: { element: { type: 'feature' } },
              disallow: {
                to: { element: { type: 'feature', captured: { nome: '!{{from.nome}}' } } },
              },
              message: 'Uma feature não importa de outra: elas se falam pela URL e pelo servidor.',
            },
            {
              from: { element: { type: 'compartilhado' } },
              disallow: { to: { element: { type: 'feature' } } },
              message: 'compartilhado não conhece feature — senão deixa de ser compartilhado.',
            },
          ],
        },
      ],
    },
  },
  {
    // O wrapper de log é o único ponto autorizado a usar o console.
    files: ['src/compartilhado/log/**'],
    rules: { 'no-console': 'off' },
  },
  {
    // Os primitivos existem justamente para encapsular o HTML interativo cru.
    files: ['src/design-system/**'],
    rules: { 'no-restricted-syntax': 'off' },
  },
  {
    files: ['**/*.test.{ts,tsx}', 'src/preparar-testes.ts'],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    files: ['scripts/**/*.mjs', '*.config.{js,ts}', 'eslint.config.js'],
    languageOptions: { globals: { ...globals.node } },
    rules: { 'no-console': 'off' },
  },
);
