import { useEffect, useId, useRef } from 'react';

import { Botao } from '@/design-system/primitivos/Botao';
import { Texto } from '@/design-system/primitivos/Texto';

interface AcoesDoDocumentoProps {
  nome: string;
  confirmando: boolean;
  /** Só a remoção desta linha: a de outra linha em andamento não ocupa este "Sim". */
  removendo: boolean;
  aoPedirRemocao: () => void;
  aoDesistir: () => void;
  aoRemover: () => void;
}

/**
 * O "Remover" com a confirmação na própria linha, que avisa que não tem volta. O foco acompanha a
 * troca dos botões: ao abrir, vai para o "Não" — a opção segura —; ao fechar, volta ao "Remover".
 * Sem isso, o botão focado some e quem usa teclado ou leitor de tela cai no começo da página.
 */
export function AcoesDoDocumento({
  nome,
  confirmando,
  removendo,
  aoPedirRemocao,
  aoDesistir,
  aoRemover,
}: AcoesDoDocumentoProps) {
  const idDaPergunta = useId();
  const nao = useRef<HTMLButtonElement>(null);
  const remover = useRef<HTMLButtonElement>(null);
  const confirmavaAntes = useRef(confirmando);

  useEffect(() => {
    if (confirmando) {
      nao.current?.focus();
    } else if (confirmavaAntes.current && document.activeElement === document.body) {
      // Só se o foco ficou sem lugar: quem abriu a confirmação de outra linha já está nela.
      remover.current?.focus();
    }
    confirmavaAntes.current = confirmando;
  }, [confirmando]);

  if (!confirmando) {
    return (
      <Botao
        ref={remover}
        variante="fantasma"
        tamanho="pequeno"
        tom="critico"
        rotuloAcessivel={`Remover ${nome}`}
        aoClicar={aoPedirRemocao}
      >
        Remover
      </Botao>
    );
  }
  return (
    <>
      <Texto variante="apoio" tom="critico" como="span" id={idDaPergunta}>
        Remover? Não pode ser desfeito.
      </Texto>
      <Botao
        variante="fantasma"
        tamanho="pequeno"
        tom="critico"
        carregando={removendo}
        rotuloAcessivel={`Sim, remover ${nome}`}
        descritoPor={idDaPergunta}
        aoClicar={aoRemover}
      >
        Sim
      </Botao>
      <Botao
        ref={nao}
        variante="fantasma"
        tamanho="pequeno"
        rotuloAcessivel={`Não remover ${nome}`}
        descritoPor={idDaPergunta}
        aoClicar={aoDesistir}
      >
        Não
      </Botao>
    </>
  );
}
