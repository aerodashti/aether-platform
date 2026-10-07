import { useEffect, useRef, useState } from 'react';

import type { RendimentoResponse } from '../api/useAportes';

export type FormularioDeRendimentoAberto =
  { modo: 'novo' } | { modo: 'corrigir'; rendimento: RendimentoResponse };

/** Só devolve o foco a quem ainda está na página; senão ele cairia no `<body>`. */
function aindaNaPagina(elemento: Element | null): elemento is HTMLElement {
  return elemento instanceof HTMLElement && elemento.isConnected;
}

/**
 * O formulário de rendimento embutido abaixo da grade: quem o abriu recebe o foco de volta ao
 * fechar, e a correção de um rendimento que acabou de ser excluído fecha sozinha — salvar daria
 * "Rendimento não encontrado".
 *
 * <p>O "Registrar rendimento" sai de cena enquanto o formulário está aberto; ao fechar, é a ele que
 * o foco volta.
 */
export function useFormularioDeRendimento() {
  const [aberto, setAberto] = useState<FormularioDeRendimentoAberto | null>(null);
  const botaoDeRegistrar = useRef<HTMLButtonElement>(null);
  const origem = useRef<Element | null>(null);
  const devolverFoco = useRef(false);

  useEffect(() => {
    if (aberto !== null || !devolverFoco.current) {
      return;
    }
    devolverFoco.current = false;
    const alvo = aindaNaPagina(origem.current) ? origem.current : botaoDeRegistrar.current;
    alvo?.focus();
  }, [aberto]);

  function abrir(formulario: FormularioDeRendimentoAberto) {
    origem.current = document.activeElement;
    setAberto(formulario);
  }

  function fechar() {
    devolverFoco.current = true;
    setAberto(null);
  }

  function aoExcluir(id: number) {
    if (aberto?.modo === 'corrigir' && aberto.rendimento.id === id) {
      fechar();
    }
  }

  return { aberto, abrir, fechar, aoExcluir, botaoDeRegistrar };
}
