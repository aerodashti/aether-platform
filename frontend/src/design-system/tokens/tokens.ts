/* Gerado por scripts/gerar-tokens.mjs. Não edite: mexa em tokens.json. */

export const tokens = {
  cor: {
    'fundo': 'var(--cor-fundo)',
    'superficie': 'var(--cor-superficie)',
    'superficie-sutil': 'var(--cor-superficie-sutil)',
    'borda': 'var(--cor-borda)',
    'texto': 'var(--cor-texto)',
    'texto-suave': 'var(--cor-texto-suave)',
    'acento': 'var(--cor-acento)',
    'acento-contraste': 'var(--cor-acento-contraste)',
    'positivo': 'var(--cor-positivo)',
    'atencao': 'var(--cor-atencao)',
    'critico': 'var(--cor-critico)',
    'foco': 'var(--cor-foco)',
  },
  fonte: {
    'base': 'var(--fonte-base)',
    'titulo': 'var(--fonte-titulo)',
  },
  tamanho: {
    'xs': 'var(--tamanho-xs)',
    's': 'var(--tamanho-s)',
    'm': 'var(--tamanho-m)',
    'g': 'var(--tamanho-g)',
    'gg': 'var(--tamanho-gg)',
    'ggg': 'var(--tamanho-ggg)',
  },
  peso: {
    'normal': 'var(--peso-normal)',
    'medio': 'var(--peso-medio)',
    'forte': 'var(--peso-forte)',
  },
  altura: {
    'apertada': 'var(--altura-apertada)',
    'normal': 'var(--altura-normal)',
  },
  espaco: {
    '1': 'var(--espaco-1)',
    '2': 'var(--espaco-2)',
    '3': 'var(--espaco-3)',
    '4': 'var(--espaco-4)',
    '5': 'var(--espaco-5)',
    '6': 'var(--espaco-6)',
    '7': 'var(--espaco-7)',
    '8': 'var(--espaco-8)',
  },
  raio: {
    's': 'var(--raio-s)',
    'm': 'var(--raio-m)',
    'g': 'var(--raio-g)',
    'redondo': 'var(--raio-redondo)',
  },
  elevacao: {
    '0': 'var(--elevacao-0)',
    '1': 'var(--elevacao-1)',
    '2': 'var(--elevacao-2)',
    '3': 'var(--elevacao-3)',
  },
  duracao: {
    'rapida': 'var(--duracao-rapida)',
    'normal': 'var(--duracao-normal)',
    'lenta': 'var(--duracao-lenta)',
  },
  curva: {
    'padrao': 'var(--curva-padrao)',
    'saida': 'var(--curva-saida)',
  },
} as const;

export type Cor = keyof typeof tokens.cor;
export type Fonte = keyof typeof tokens.fonte;
export type Tamanho = keyof typeof tokens.tamanho;
export type Peso = keyof typeof tokens.peso;
export type Altura = keyof typeof tokens.altura;
export type Espaco = keyof typeof tokens.espaco;
export type Raio = keyof typeof tokens.raio;
export type Elevacao = keyof typeof tokens.elevacao;
export type Duracao = keyof typeof tokens.duracao;
export type Curva = keyof typeof tokens.curva;
