import { useId, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

import { ErroDeApi } from '@/api/cliente';
import { useAeronaves } from '@/compartilhado/aeronaves/useAeronaves';
import { useDocumentos, type DocumentoResponse } from '@/compartilhado/documentos/useDocumentos';
import { FalhaDaConsulta } from '@/compartilhado/recorte/FalhaDaConsulta';
import { useSessao } from '@/compartilhado/sessao/sessao';
import { Esqueleto } from '@/design-system/primitivos/Esqueleto';
import { LinkDeTexto } from '@/design-system/primitivos/LinkDeTexto';
import { SeletorDeArquivos } from '@/design-system/primitivos/SeletorDeArquivos';
import { Texto } from '@/design-system/primitivos/Texto';

import {
  useBaixarDocumento,
  useEnviarDocumentos,
  useRemoverDocumento,
} from '../api/useAcoesDeDocumentos';

import { GradeDeDocumentos } from './GradeDeDocumentos';
import estilos from './PaginaDeDocumentos.module.css';
import { EXTENSOES_ACEITAS, quantidadeDeDocumentos, tamanhoEmTexto } from './rotulos';
import {
  ARQUIVOS_POR_ENVIO,
  MEGABYTES_POR_ARQUIVO,
  MEGABYTES_POR_ENVIO,
  validarEnvio,
} from './validarEnvio';

const LIMITES =
  `PDF, imagens, planilhas e documentos do Office. Até ${MEGABYTES_POR_ARQUIVO} MB cada; ` +
  `por envio, até ${ARQUIVOS_POR_ENVIO} arquivos e ${MEGABYTES_POR_ENVIO} MB.`;

/** O que o alerta da tela diz, e se é a recusa da última escolha de arquivos. */
interface Aviso {
  mensagem: string;
  doEnvio: boolean;
}

/** Só um inteiro positivo é id: "abc" ou "0" na rota não chegam a virar consulta. */
function idDaRota(texto: string | undefined): number | null {
  return texto && /^[1-9]\d*$/.test(texto) ? Number(texto) : null;
}

function AeronaveNaoEncontrada() {
  return (
    <div className={estilos.recado} role="alert">
      <Texto variante="corpo" como="p">
        Aeronave não encontrada.
      </Texto>
      <LinkDeTexto para="/aeronaves">Voltar para a frota</LinkDeTexto>
    </div>
  );
}

/**
 * Os documentos de uma aeronave, como no protótipo: o resumo, o "+ Adicionar documentos" e a
 * grade com nome, data e tamanho. O nome baixa o arquivo; remover pede confirmação na linha e
 * avisa que não tem volta — o arquivo sai do servidor. Enviar e remover são de quem gere.
 */
export function PaginaDeDocumentos() {
  const aeronaveId = idDaRota(useParams().id);
  return aeronaveId === null ? (
    <AeronaveNaoEncontrada />
  ) : (
    <DocumentosDaAeronave aeronaveId={aeronaveId} />
  );
}

function DocumentosDaAeronave({ aeronaveId }: { aeronaveId: number }) {
  const consulta = useDocumentos(aeronaveId);
  const aeronaves = useAeronaves();
  const { usuario } = useSessao();
  const podeGerir = usuario?.papel === 'ADMINISTRADOR' || usuario?.papel === 'GESTOR';
  const enviarDocumentos = useEnviarDocumentos(aeronaveId);
  const remover = useRemoverDocumento(aeronaveId);
  const baixar = useBaixarDocumento(aeronaveId);
  const [confirmando, setConfirmando] = useState<number | null>(null);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  // O que o leitor de tela ouve ao fim de cada ação: a lista atualizada só se vê.
  const [anuncio, setAnuncio] = useState('');
  const refDaGrade = useRef<HTMLDivElement>(null);
  const idDosLimites = useId();
  const idDoAviso = useId();

  if (consulta.error instanceof ErroDeApi && consulta.error.status === 404) {
    return <AeronaveNaoEncontrada />;
  }

  const matricula = aeronaves.data?.find((aeronave) => aeronave.id === aeronaveId)?.matricula;
  const documentos = consulta.data?.documentos ?? [];

  function escolher(arquivos: File[]) {
    const recusa = validarEnvio(arquivos).arquivos;
    setAviso(recusa ? { mensagem: recusa, doEnvio: true } : null);
    if (recusa) {
      return;
    }
    setAnuncio(`Enviando ${quantidadeDeDocumentos(arquivos.length)}…`);
    enviarDocumentos.mutate(arquivos, {
      onSuccess: (salvos) =>
        setAnuncio(
          `${quantidadeDeDocumentos(salvos.length)} ${salvos.length === 1 ? 'enviado' : 'enviados'}.`,
        ),
      onError: (falha) => {
        setAnuncio('');
        setAviso({ mensagem: falha.message, doEnvio: true });
      },
    });
  }

  function pedirRemocao(id: number) {
    setAviso(null);
    setConfirmando(id);
  }

  function removerDocumento({ id = 0, nome }: DocumentoResponse) {
    remover.mutate(id, {
      onSuccess: () => {
        setAnuncio(`"${nome}" removido.`);
        // A linha sai com o botão que tinha o foco: a grade o recebe, em vez do começo da página.
        refDaGrade.current?.focus();
      },
      onError: (falha) =>
        setAviso({
          mensagem: `Não foi possível remover "${nome}": ${falha.message}`,
          doEnvio: false,
        }),
      onSettled: () => setConfirmando((atual) => (atual === id ? null : atual)),
    });
  }

  function baixarDocumento({ id = 0, nome = '' }: DocumentoResponse) {
    setAviso(null);
    baixar.mutate(
      { id, nome },
      {
        onError: (falha) =>
          setAviso({
            mensagem: `Não foi possível baixar "${nome}": ${falha.message}`,
            doEnvio: false,
          }),
      },
    );
  }

  return (
    <div className={estilos.tela}>
      <div className={estilos.cabecalho}>
        <div className={estilos.resumo}>
          {matricula ? <span className={estilos.matricula}>{matricula}</span> : null}
          <Texto variante="apoio" tom="suave" como="span">
            {consulta.data
              ? `${quantidadeDeDocumentos(documentos.length)} · ${tamanhoEmTexto(consulta.data.tamanhoTotal)}`
              : ' '}
          </Texto>
        </div>
        {podeGerir ? (
          <div className={estilos.envio}>
            <SeletorDeArquivos
              rotulo="+ Adicionar documentos"
              aoEscolher={escolher}
              multiplo
              aceita={EXTENSOES_ACEITAS}
              carregando={enviarDocumentos.isPending}
              descritoPor={aviso?.doEnvio ? `${idDoAviso} ${idDosLimites}` : idDosLimites}
              invalido={aviso?.doEnvio}
            />
            <Texto variante="apoio" tom="suave" como="p" id={idDosLimites}>
              {LIMITES}
            </Texto>
          </div>
        ) : null}
      </div>
      <div role="alert" id={idDoAviso}>
        {aviso ? <p className={estilos.alerta}>{aviso.mensagem}</p> : null}
      </div>
      <div role="status" className={estilos.apenasLeitor}>
        {anuncio}
      </div>

      <div
        ref={refDaGrade}
        className={estilos.painel}
        role="region"
        aria-label="Documentos da aeronave"
        tabIndex={-1}
      >
        {consulta.error ? (
          <div className={estilos.recado} role="alert">
            <FalhaDaConsulta
              falha={consulta.error}
              generica="Não foi possível carregar os documentos."
              aoTentarDeNovo={() => void consulta.refetch()}
            />
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
          </div>
        ) : (
          <GradeDeDocumentos
            documentos={documentos}
            podeGerir={podeGerir}
            confirmando={confirmando}
            removendo={remover.isPending ? (remover.variables ?? null) : null}
            aoBaixar={baixarDocumento}
            aoPedirRemocao={pedirRemocao}
            aoDesistir={() => setConfirmando(null)}
            aoRemover={removerDocumento}
          />
        )}
      </div>
    </div>
  );
}
