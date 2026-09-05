/**
 * Conventional Commits com assunto em portugues.
 * Ex.: feat: adiciona hub de vencimentos
 */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // O assunto comeca em minuscula, mas siglas de dominio (CVA, RETA, ANAC, RAB) continuam
    // em maiuscula. Por isso a regra proibe as formas capitalizadas em vez de exigir
    // tudo minusculo: 'lower-case' rejeitaria 'adiciona vencimento do CVA'.
    'subject-case': [2, 'never', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],
    'subject-full-stop': [2, 'never', '.'],
    'header-max-length': [2, 'always', 100],
  },
};
