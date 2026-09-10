/**
 * A preferência de tema.
 *
 * <p>Três estados, e não dois: claro, escuro e **do sistema** — que é o padrão. Os tokens já são
 * escritos para isso: o tema claro vive em `:root`, o escuro em `:root[data-theme='escuro']`, e o
 * bloco `@media (prefers-color-scheme: dark)` é guardado por `:not([data-theme='claro'])`. Seguir
 * o sistema é, portanto, **não escrever o atributo**.
 *
 * <p>Fica no navegador, não no servidor: é preferência de quem está olhando a tela, e sincronizá-la
 * pela conta faria a escolha de uma pessoa mudar a tela de outra.
 */
export type PreferenciaDeTema = 'claro' | 'escuro' | 'sistema';

/** A mesma chave que o script anti-flash do index.html lê antes da primeira pintura. */
export const CHAVE_DO_TEMA = 'aether_tema';

export const PREFERENCIA_PADRAO: PreferenciaDeTema = 'sistema';

function ehPreferencia(valor: string | null): valor is PreferenciaDeTema {
  return valor === 'claro' || valor === 'escuro' || valor === 'sistema';
}

export function lerPreferencia(): PreferenciaDeTema {
  try {
    const guardada = localStorage.getItem(CHAVE_DO_TEMA);
    return ehPreferencia(guardada) ? guardada : PREFERENCIA_PADRAO;
  } catch {
    // Navegação privada pode recusar o localStorage. Sem preferência, o sistema decide.
    return PREFERENCIA_PADRAO;
  }
}

/** Escreve o atributo que os tokens leem — ou o remove, que é como se diz "siga o sistema". */
export function aplicarPreferencia(preferencia: PreferenciaDeTema): void {
  const raiz = document.documentElement;
  if (preferencia === 'sistema') {
    raiz.removeAttribute('data-theme');
  } else {
    raiz.setAttribute('data-theme', preferencia);
  }
  try {
    localStorage.setItem(CHAVE_DO_TEMA, preferencia);
  } catch {
    // Sem persistência a escolha vale só para esta aba. É melhor que quebrar a tela.
  }
}

export function sistemaEstaEscuro(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}
