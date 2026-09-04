/**
 * Conventional Commits com assunto em portugues.
 * Ex.: feat: adiciona hub de vencimentos
 */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // O assunto em portugues comeca em minuscula e nao termina com ponto.
    'subject-case': [2, 'always', 'lower-case'],
    'subject-full-stop': [2, 'never', '.'],
    'header-max-length': [2, 'always', 100],
  },
};
