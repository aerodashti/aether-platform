/**
 * Os glifos da casca da aplicação.
 *
 * <p>SVG traçado em grade de 16px, herdando `currentColor` — nunca emoji, que muda de forma a
 * cada sistema e não recolore. Ficam aqui, e não no design system, porque hoje só a navegação os
 * usa: viram primitivo quando a segunda tela precisar dos mesmos.
 */
const comuns = {
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const;

export function IconePulso() {
  return (
    <svg {...comuns}>
      <path d="M3 12h4l3 8 4-16 3 8h4" />
    </svg>
  );
}

export function IconePessoas() {
  return (
    <svg {...comuns}>
      <path d="M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 17.5V19" />
      <circle cx="10" cy="8" r="3.5" />
      <path d="M20 19v-1.5a3.5 3.5 0 0 0-2.6-3.4" />
      <path d="M15.5 4.7a3.5 3.5 0 0 1 0 6.6" />
    </svg>
  );
}

export function IconeCartaoDeIdentidade() {
  return (
    <svg {...comuns}>
      <rect x="3" y="5" width="18" height="14" rx="0" />
      <circle cx="8.5" cy="11" r="2" />
      <path d="M5.5 16a3 3 0 0 1 6 0" />
      <path d="M14 9.5h4.5" />
      <path d="M14 13h4.5" />
    </svg>
  );
}

export function IconeDiario() {
  return (
    <svg {...comuns}>
      <path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z" />
      <path d="M5 4v13" />
      <path d="M9 9h6" />
      <path d="M9 13h4" />
    </svg>
  );
}

export function IconeRecibo() {
  return (
    <svg {...comuns}>
      <path d="M6 3h12v18l-2-1.5L14 21l-2-1.5L10 21l-2-1.5L6 21z" />
      <path d="M9.5 8h5" />
      <path d="M9.5 12h5" />
    </svg>
  );
}

export function IconeChave() {
  return (
    <svg {...comuns}>
      <path d="M14.7 6.3a4.5 4.5 0 0 0-6 5.7L4 16.7V20h3.3l4.7-4.7a4.5 4.5 0 0 0 5.7-6L14.5 12l-2.5-2.5z" />
    </svg>
  );
}

export function IconeSaida() {
  return (
    <svg {...comuns}>
      <path d="M9 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h3" />
      <path d="m15 15 3-3-3-3" />
      <path d="M18 12H9" />
    </svg>
  );
}

export function IconeAeronave() {
  return (
    <svg {...comuns}>
      <path d="M10.5 3.5a1.5 1.5 0 0 1 3 0V9l7 4v2l-7-2v4l2.5 2v1.5L12 19.5 8 20.5V19l2.5-2v-4l-7 2v-2l7-4Z" />
    </svg>
  );
}

export function IconeEngrenagem() {
  return (
    <svg {...comuns}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z" />
    </svg>
  );
}
