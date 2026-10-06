import { useState } from 'react';
import { useParams } from 'react-router-dom';

import { enderecoDaApi, ErroDeApi } from '@/api/cliente';
import { useAeronaves } from '@/compartilhado/aeronaves/useAeronaves';
import { useDocumentos } from '@/compartilhado/documentos/useDocumentos';
import { Botao } from '@/design-system/primitivos/Botao';
import { BotaoDeLink } from '@/design-system/primitivos/BotaoDeLink';
import { Esqueleto } from '@/design-system/primitivos/Esqueleto';
import { SeletorDeArquivos } from '@/design-system/primitivos/SeletorDeArquivos';
import { Texto } from '@/design-system/primitivos/Texto';

import { useEnviarDocumentos, useRemoverDocumento } from '../api/useAcoesDeDocumentos';

import estilos from './PaginaDeDocumentos.module.css';
import { dataEmTexto, EXTENSOES_ACEITAS, LIMITE_EM_BYTES, tamanhoEmTexto } from './rotulos';

/**
 * Os documentos de uma aeronave, como no protótipo: o resumo, o "+ Adicionar documentos" e a
 * grade com nome, data e tamanho. O nome baixa o arquivo; remover pede confirmação na linha e
 * avisa que não tem volta — o arquivo sai do servidor.
 */
export function PaginaDeDocumentos() {
  const aeronaveId = Number(useParams().id);
  const consulta = useDocumentos(aeronaveId);
  const aeronaves = useAeronaves();
  const matricula = aeronaves.data?.find((aeronave) => aeronave.id === aeronaveId)?.matricula;
  const enviarDocumentos = useEnviarDocumentos(aeronaveId);
  const remover = useRemoverDocumento(aeronaveId);
  const [confirmando, setConfirmando] = useState<number | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const documentos = consulta.data?.documentos ?? [];

  function escolher(arquivos: File[]) {
    // O servidor recusa de novo; conferir aqui só poupa o envio de 100 MB para ouvir "não".
    const grande = arquivos.find((arquivo) => arquivo.size > LIMITE_EM_BYTES);
    if (grande) {
      setAviso(`"${grande.name}" passa de 20 MB.`);
      return;
    }
    setAviso(null);
    enviarDocumentos.mutate(arquivos);
  }

  const erroDoEnvio =
    enviarDocumentos.error instanceof ErroDeApi ? enviarDocumentos.error.message : null;
  const mensagem = aviso ?? erroDoEnvio;

  return (
    <div className={estilos.tela}>
      <div className={estilos.cabecalho}>
        <div className={estilos.resumo}>
          {matricula ? <span className={estilos.matricula}>{matricula}</span> : null}
          <Texto variante="apoio" tom="suave" como="span">
            {consulta.data
              ? `${documentos.length} ${documentos.length === 1 ? 'documento' : 'documentos'} · ${tamanhoEmTexto(consulta.data.tamanhoTotal)}`
              : ' '}
          </Texto>
        </div>
        <SeletorDeArquivos
          rotulo="+ Adicionar documentos"
          aoEscolher={escolher}
          multiplo
          aceita={EXTENSOES_ACEITAS}
          carregando={enviarDocumentos.isPending}
        />
      </div>
      {mensagem ? (
        <div className={estilos.alerta} role="alert">
          {mensagem}
        </div>
      ) : null}
      {enviarDocumentos.isPending ? (
        <div role="status" className={estilos.apenasLeitor}>
          Enviando os documentos…
        </div>
      ) : null}

      <div className={estilos.painel}>
        {consulta.isError ? (
          <div className={estilos.recado} role="alert">
            <Texto variante="corpo" como="p">
              Não foi possível carregar os documentos.
            </Texto>
            <Botao variante="secundario" tamanho="pequeno" aoClicar={() => void consulta.refetch()}>
              Tentar de novo
            </Botao>
          </div>
        ) : consulta.isPending ? (
          <div className={estilos.recado} role="status">
            <Esqueleto />
            <span className={estilos.apenasLeitor}>Carregando os documentos…</span>
          </div>
        ) : documentos.length === 0 ? (
          <div className={estilos.recado}>
            <Texto variante="corpo" como="p">
              Nenhum documento anexado a esta aeronave.
            </Texto>
            <Texto variante="apoio" tom="suave" como="p">
              PDF, imagens, planilhas e documentos do Office, até 20 MB cada.
            </Texto>
          </div>
        ) : (
          <table role="table" className={estilos.grade}>
            <thead role="rowgroup" className={estilos.corpo}>
              <tr role="row" className={estilos.cabecalhoDaGrade}>
                <th role="columnheader" scope="col">
                  Nome do documento
                </th>
                <th role="columnheader" scope="col">
                  Data de adição
                </th>
                <th role="columnheader" scope="col" className={estilos.aDireita}>
                  Tamanho
                </th>
                <th role="columnheader" scope="col" className={estilos.apenasLeitor}>
                  Ações
                </th>
              </tr>
            </thead>
            <tbody role="rowgroup" className={estilos.corpo}>
              {documentos.map((documento) => {
                const id = documento.id ?? 0;
                return (
                  <tr role="row" className={estilos.linha} key={id}>
                    <td role="cell" className={estilos.celula}>
                      <BotaoDeLink
                        aoClicar={() =>
                          window.location.assign(
                            enderecoDaApi(`/aeronaves/${aeronaveId}/documentos/${id}/conteudo`),
                          )
                        }
                      >
                        {documento.nome}
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
                    <td role="cell" className={estilos.celula}>
                      <span className={estilos.acoes}>
                        {confirmando === id ? (
                          <>
                            <Texto variante="apoio" tom="critico" como="span">
                              Remover? Não pode ser desfeito.
                            </Texto>
                            <Botao
                              variante="fantasma"
                              tamanho="pequeno"
                              tom="critico"
                              carregando={remover.isPending}
                              rotuloAcessivel={`Sim, remover ${documento.nome ?? ''}`}
                              aoClicar={() =>
                                remover.mutate(id, { onSettled: () => setConfirmando(null) })
                              }
                            >
                              Sim
                            </Botao>
                            <Botao
                              variante="fantasma"
                              tamanho="pequeno"
                              aoClicar={() => setConfirmando(null)}
                            >
                              Não
                            </Botao>
                          </>
                        ) : (
                          <Botao
                            variante="fantasma"
                            tamanho="pequeno"
                            tom="critico"
                            rotuloAcessivel={`Remover ${documento.nome ?? ''}`}
                            aoClicar={() => setConfirmando(id)}
                          >
                            Remover
                          </Botao>
                        )}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
