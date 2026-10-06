import { Botao } from '@/design-system/primitivos/Botao';
import { Texto } from '@/design-system/primitivos/Texto';

import estilos from './Grade.module.css';

interface AcoesDaLinhaProps {
  /** Quem a linha é, para o nome acessível: "aporte de Ricardo Meirelles em 03/10/26". */
  descricao: string;
  confirmando: boolean;
  excluindo: boolean;
  aoEditar: () => void;
  aoPedirExclusao: () => void;
  aoConfirmar: () => void;
  aoDesistir: () => void;
}

/**
 * Editar e excluir, com a confirmação na própria linha — "Excluir?" — como no diário: modal para
 * isso seria cerimônia.
 */
export function AcoesDaLinha({
  descricao,
  confirmando,
  excluindo,
  aoEditar,
  aoPedirExclusao,
  aoConfirmar,
  aoDesistir,
}: AcoesDaLinhaProps) {
  return (
    <span className={estilos.acoes}>
      {confirmando ? (
        <>
          <Texto variante="apoio" tom="critico" como="span">
            Excluir?
          </Texto>
          <Botao
            variante="fantasma"
            tamanho="pequeno"
            tom="critico"
            carregando={excluindo}
            rotuloAcessivel={`Sim, excluir ${descricao}`}
            aoClicar={aoConfirmar}
          >
            Sim
          </Botao>
          <Botao variante="fantasma" tamanho="pequeno" aoClicar={aoDesistir}>
            Não
          </Botao>
        </>
      ) : (
        <>
          <Botao
            variante="fantasma"
            tamanho="pequeno"
            rotuloAcessivel={`Editar ${descricao}`}
            aoClicar={aoEditar}
          >
            Editar
          </Botao>
          <Botao
            variante="fantasma"
            tamanho="pequeno"
            tom="critico"
            rotuloAcessivel={`Excluir ${descricao}`}
            aoClicar={aoPedirExclusao}
          >
            Excluir
          </Botao>
        </>
      )}
    </span>
  );
}
