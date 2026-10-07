import { TAMANHO_DO_PERCENTUAL } from '@/compartilhado/participacoes/percentuais';
import { juntarClasses } from '@/design-system/classes';
import { Botao } from '@/design-system/primitivos/Botao';
import { CampoDeTexto } from '@/design-system/primitivos/CampoDeTexto';
import { PontoDeCor } from '@/design-system/primitivos/SeletorDeCor';

import type { LinhaDoContrato } from './contratoEmEdicao';
import estilos from './SecaoDeContrato.module.css';

interface TabelaDaEdicaoProps {
  linhas: LinhaDoContrato[];
  erroDaLinha: (indice: number) => string | undefined;
  /** Guarda o campo de cada proprietário, para a edição levar o foco a ele. */
  registrarCampo: (proprietarioId: number, campo: HTMLInputElement | null) => void;
  aoMudarPercentual: (proprietarioId: number, percentual: string) => void;
  aoRemover: (linha: LinhaDoContrato) => void;
}

/** As linhas do contrato em edição: quem é dono, o percentual de cada um e o "Remover". */
export function TabelaDaEdicao({
  linhas,
  erroDaLinha,
  registrarCampo,
  aoMudarPercentual,
  aoRemover,
}: TabelaDaEdicaoProps) {
  return (
    <div className={estilos.rolagem}>
      <table role="table" className={juntarClasses(estilos.tabela, estilos.editando)}>
        <thead role="rowgroup" className={estilos.bloco}>
          <tr role="row" className={estilos.linhaDeCabecalho}>
            <th role="columnheader" scope="col">
              Proprietário
            </th>
            <th role="columnheader" scope="col" className={estilos.direita}>
              % de propriedade
            </th>
            <th role="columnheader" scope="col" className={estilos.apenasLeitor}>
              Ações
            </th>
          </tr>
        </thead>
        <tbody role="rowgroup" className={estilos.bloco}>
          {linhas.map((linha, indice) => (
            <tr role="row" key={linha.proprietarioId} className={estilos.linha}>
              <td role="cell" className={estilos.celula}>
                <span className={estilos.dono}>
                  <PontoDeCor cor={linha.cor} />
                  <span className={estilos.trunca}>{linha.nome}</span>
                </span>
              </td>
              <td role="cell" className={juntarClasses(estilos.celula, estilos.campo)}>
                <span className={estilos.campoDePercentual}>
                  <CampoDeTexto
                    rotulo={`Participação de ${linha.nome} em %`}
                    rotuloOculto
                    obrigatorio
                    ref={(campo) => registrarCampo(linha.proprietarioId, campo)}
                    valor={linha.percentual}
                    inputMode="decimal"
                    maxLength={TAMANHO_DO_PERCENTUAL}
                    alinhamento="direita"
                    erro={erroDaLinha(indice)}
                    aoMudar={(valor) => aoMudarPercentual(linha.proprietarioId, valor)}
                  />
                </span>
                <span className={estilos.unidade} aria-hidden="true">
                  %
                </span>
              </td>
              <td role="cell" className={juntarClasses(estilos.celula, estilos.acoes)}>
                <Botao
                  variante="fantasma"
                  tamanho="pequeno"
                  tom="critico"
                  rotuloAcessivel={`Remover ${linha.nome} do contrato`}
                  aoClicar={() => aoRemover(linha)}
                >
                  Remover
                </Botao>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
