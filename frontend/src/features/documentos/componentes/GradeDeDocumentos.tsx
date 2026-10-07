import type { DocumentoResponse } from '@/compartilhado/documentos/useDocumentos';
import { juntarClasses } from '@/design-system/classes';
import { BotaoDeLink } from '@/design-system/primitivos/BotaoDeLink';

import { AcoesDoDocumento } from './AcoesDoDocumento';
import estilos from './PaginaDeDocumentos.module.css';
import { dataEmTexto, tamanhoEmTexto } from './rotulos';

interface GradeDeDocumentosProps {
  documentos: DocumentoResponse[];
  /** Sem permissão para remover, a coluna de ações nem aparece. */
  podeGerir: boolean;
  /** O documento cuja remoção está sendo confirmada. */
  confirmando: number | null;
  /** O documento cuja remoção está em andamento. */
  removendo: number | null;
  aoBaixar: (documento: DocumentoResponse) => void;
  aoPedirRemocao: (id: number) => void;
  aoDesistir: () => void;
  aoRemover: (documento: DocumentoResponse) => void;
}

/** A grade do protótipo: nome (que baixa o arquivo), data, tamanho e, para quem gere, remover. */
export function GradeDeDocumentos({
  documentos,
  podeGerir,
  confirmando,
  removendo,
  aoBaixar,
  aoPedirRemocao,
  aoDesistir,
  aoRemover,
}: GradeDeDocumentosProps) {
  const colunas = juntarClasses(!podeGerir && estilos.semAcoes);

  return (
    <table role="table" className={estilos.grade}>
      <thead role="rowgroup" className={estilos.corpo}>
        <tr role="row" className={juntarClasses(estilos.cabecalhoDaGrade, colunas)}>
          <th role="columnheader" scope="col">
            Nome do documento
          </th>
          <th role="columnheader" scope="col">
            Data de adição
          </th>
          <th role="columnheader" scope="col" className={estilos.aDireita}>
            Tamanho
          </th>
          {podeGerir ? (
            <th role="columnheader" scope="col" className={estilos.apenasLeitor}>
              Ações
            </th>
          ) : null}
        </tr>
      </thead>
      <tbody role="rowgroup" className={estilos.corpo}>
        {documentos.map((documento) => {
          const id = documento.id ?? 0;
          const nome = documento.nome ?? '';
          return (
            <tr role="row" className={juntarClasses(estilos.linha, colunas)} key={id}>
              <td role="cell" className={estilos.celula}>
                <BotaoDeLink aoClicar={() => aoBaixar(documento)}>
                  {nome}
                  <span className={estilos.apenasLeitor}> — baixar</span>
                </BotaoDeLink>
                <span className={estilos.sub}>enviado por {documento.enviadoPor}</span>
              </td>
              <td role="cell" className={estilos.celula}>
                <span className={estilos.dado}>{dataEmTexto(documento.criadoEm)}</span>
              </td>
              <td role="cell" className={estilos.celula}>
                <span className={estilos.numero}>{tamanhoEmTexto(documento.tamanho)}</span>
              </td>
              {podeGerir ? (
                <td role="cell" className={estilos.celula}>
                  <span className={estilos.acoes}>
                    <AcoesDoDocumento
                      nome={nome}
                      confirmando={confirmando === id}
                      removendo={removendo === id}
                      aoPedirRemocao={() => aoPedirRemocao(id)}
                      aoDesistir={aoDesistir}
                      aoRemover={() => aoRemover(documento)}
                    />
                  </span>
                </td>
              ) : null}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
