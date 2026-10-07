import { useEffect, useRef, type ReactNode } from 'react';

import estilos from './PainelModal.module.css';

interface PainelModalProps {
  aberto: boolean;
  aoFechar: () => void;
  /** Nome acessível do painel — leitor de tela anuncia ao abrir. */
  rotulo: string;
  /**
   * Falso enquanto o painel não pode sair de cena — durante o envio, por exemplo: o Esc é
   * ignorado, para que a recusa do servidor não suma com o painel nem o registro seja criado
   * depois de a pessoa "cancelar".
   */
  podeFechar?: boolean;
  children: ReactNode;
}

/** Só devolve o foco a quem ainda está na página e visível; senão o foco cairia no `<body>`. */
function podeReceberFoco(elemento: Element | null): elemento is HTMLElement {
  return (
    elemento instanceof HTMLElement && elemento.isConnected && elemento.closest('[hidden]') === null
  );
}

/**
 * Painel modal sobre a tela.
 *
 * <p>É `<dialog>` nativo, aberto por `showModal()`: a armadilha de foco, o Esc que fecha e a
 * inércia do resto da página vêm do navegador. Reimplementar isso em JavaScript é uma das formas
 * mais comuns de quebrar teclado e leitor de tela sem perceber.
 *
 * <p>O que o nativo não cobre é o painel que sai do DOM ainda aberto — as telas o desmontam ao
 * salvar ou cancelar. Por isso ele guarda quem tinha o foco ao abrir e o devolve ao sair, como o
 * `close()` faria (WCAG 2.4.3).
 *
 * <p>Nasceu em `usuarios/PainelDeConvite` e virou primitivo quando a segunda tela precisou —
 * exatamente o combinado em `docs/design-system.md`.
 */
export function PainelModal({
  aberto,
  aoFechar,
  rotulo,
  podeFechar = true,
  children,
}: PainelModalProps) {
  const referencia = useRef<HTMLDialogElement>(null);
  const focoAnterior = useRef<Element | null>(null);

  useEffect(() => {
    const dialogo = referencia.current;
    if (!dialogo) {
      return;
    }
    if (aberto && !dialogo.open) {
      focoAnterior.current = document.activeElement;
      dialogo.showModal();
    }
    if (!aberto && dialogo.open) {
      dialogo.close();
    }
  }, [aberto]);

  useEffect(
    () => () => {
      const anterior = focoAnterior.current;
      if (podeReceberFoco(anterior)) {
        anterior.focus();
      }
    },
    [],
  );

  return (
    <dialog
      ref={referencia}
      className={estilos.dialogo}
      onClose={aoFechar}
      onCancel={(evento) => {
        if (!podeFechar) {
          evento.preventDefault();
        }
      }}
      aria-label={rotulo}
    >
      <div className={estilos.corpo}>{children}</div>
    </dialog>
  );
}
