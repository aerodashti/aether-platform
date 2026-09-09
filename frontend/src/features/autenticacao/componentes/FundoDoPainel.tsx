import estilos from './FundoDoPainel.module.css';

/**
 * Curva de rota e brilho de canto atrás do formulário.
 *
 * <p>É a mesma leitura do resto do produto — uma trajetória com dois pontos de parada — reduzida a
 * opacidades baixas do azul de ação para não competir com o texto. Decorativo e `aria-hidden`.
 */
export function FundoDoPainel() {
  return (
    <svg
      className={estilos.fundo}
      viewBox="0 0 600 900"
      preserveAspectRatio="xMidYMax slice"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="aether-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--cor-acento)" stopOpacity="0.13" />
          <stop offset="0.85" stopColor="var(--cor-acento)" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="aether-brilho" cx="0.16" cy="0.08" r="0.62">
          <stop offset="0" stopColor="var(--cor-acento)" stopOpacity="0.1" />
          <stop offset="1" stopColor="var(--cor-acento)" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect x="0" y="0" width="600" height="900" fill="url(#aether-brilho)" />
      <path
        d="M0,780 C110,748 190,690 300,590 C405,494 470,470 600,392 L600,900 L0,900 Z"
        fill="url(#aether-area)"
      />
      <path
        d="M0,780 C110,748 190,690 300,590 C405,494 470,470 600,392"
        fill="none"
        stroke="var(--cor-acento)"
        strokeOpacity="0.28"
        strokeWidth="2.2"
      />
      <circle cx="300" cy="590" r="3.5" fill="var(--cor-acento)" opacity="0.5" />
      <circle cx="600" cy="392" r="4.5" fill="var(--cor-acento)" opacity="0.55" />
      <path
        d="M-30,330 C170,205 400,180 660,86"
        fill="none"
        stroke="var(--cor-acento)"
        strokeOpacity="0.2"
        strokeWidth="1.6"
        strokeDasharray="1.5 8"
        strokeLinecap="round"
      />
    </svg>
  );
}
