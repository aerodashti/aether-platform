import { useEffect, useRef, type ReactNode } from 'react';

import estilos from './PainelModal.module.css';

interface PainelModalProps {
  aberto: boolean;
  aoFechar: () => void;
  /** Nome acessível do painel — leitor de tela anuncia ao abrir. */
  rotulo: string;
  children: ReactNode;
}

/**
 * Painel modal sobre a tela.
 *
 * <p>É `<dialog>` nativo, aberto por `showModal()`: a armadilha de foco, o Esc que fecha e a
 * inércia do resto da página vêm do navegador. Reimplementar isso em JavaScript é uma das formas
 * mais comuns de quebrar teclado e leitor de tela sem perceber.
 *
 * <p>Nasceu em `usuarios/PainelDeConvite` e virou primitivo quando a segunda tela precisou —
 * exatamente o combinado em `docs/design-system.md`.
 */
export function PainelModal({ aberto, aoFechar, rotulo, children }: PainelModalProps) {
  const referencia = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialogo = referencia.current;
    if (!dialogo) {
      return;
    }
    if (aberto && !dialogo.open) {
      dialogo.showModal();
    }
    if (!aberto && dialogo.open) {
      dialogo.close();
    }
  }, [aberto]);

  return (
    <dialog ref={referencia} className={estilos.dialogo} onClose={aoFechar} aria-label={rotulo}>
      <div className={estilos.corpo}>{children}</div>
    </dialog>
  );
}
