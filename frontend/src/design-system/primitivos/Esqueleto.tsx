import estilos from './Esqueleto.module.css';

/**
 * Barra de carregamento de uma célula de grade.
 *
 * <p>Sempre `aria-hidden`: quem anuncia a espera é o `role="status"` da grade, uma vez só — uma
 * barra falante por célula viraria ruído no leitor de tela.
 *
 * <p>O brilho que percorre a barra vem do handoff (`.skel`); sob `prefers-reduced-motion` ele
 * desliga e fica a cor chapada.
 */
export function Esqueleto() {
  return <span className={estilos.esqueleto} aria-hidden="true" />;
}
