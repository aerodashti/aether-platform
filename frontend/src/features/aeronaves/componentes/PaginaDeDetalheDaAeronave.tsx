import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { EtiquetaDeSituacao } from '@/compartilhado/aeronaves/EtiquetaDeSituacao';
import { useDocumentos } from '@/compartilhado/documentos/useDocumentos';
import { saldoDaAeronave, useSaldosDoFundo } from '@/compartilhado/fundo/useSaldosDoFundo';
import { useSessao } from '@/compartilhado/sessao/sessao';
import { juntarClasses } from '@/design-system/classes';
import { Botao } from '@/design-system/primitivos/Botao';
import { Esqueleto } from '@/design-system/primitivos/Esqueleto';
import { LinkDeTexto } from '@/design-system/primitivos/LinkDeTexto';
import { Texto } from '@/design-system/primitivos/Texto';

import { useDetalheDaAeronave } from '../api/useDetalheDaAeronave';

import { CartaoDeFichaTecnica } from './CartaoDeFichaTecnica';
import { CartaoFinanceiro } from './CartaoFinanceiro';
import estilos from './PaginaDeDetalheDaAeronave.module.css';
import { PainelDeFichaTecnica } from './PainelDeFichaTecnica';
import { PainelFinanceiro } from './PainelFinanceiro';
import {
  consequenciaDoVencimento,
  dataCurta,
  moedaEmTexto,
  nomeDaAeronave,
  pendenciaQueGoverna,
} from './rotulos';
import { SecaoDeContrato } from './SecaoDeContrato';
import { SecaoDeTripulacao } from './SecaoDeTripulacao';

type PainelAberto = 'ficha' | 'financeiro' | null;

/**
 * O detalhe de uma aeronave, na estrutura do protótipo: cabeçalho de entidade numa linha
 * (matrícula, modelo · base, situação e a sua consequência, vencimentos à direita) e duas
 * colunas — contrato, histórico e tripulação à esquerda; ficha técnica e configuração
 * financeira à direita.
 *
 * <p>"Documentos (n)" abre a tela de documentos da aeronave; o saldo do fundo vem do fechamento.
 */
export function PaginaDeDetalheDaAeronave() {
  const { id } = useParams();
  const aeronaveId = Number(id);
  const consulta = useDetalheDaAeronave(aeronaveId);
  const { usuario, ehAdministrador } = useSessao();
  const [painel, setPainel] = useState<PainelAberto>(null);
  const saldos = useSaldosDoFundo();
  const documentos = useDocumentos(aeronaveId);
  const navegar = useNavigate();
  const saldo = saldoDaAeronave(saldos.data, aeronaveId);

  const podeGerir = usuario?.papel === 'ADMINISTRADOR' || usuario?.papel === 'GESTOR';
  const detalhe = consulta.data;

  if (consulta.isError) {
    return (
      <div className={estilos.recado} role="alert">
        <Texto variante="corpo" como="p">
          Não foi possível carregar a aeronave.
        </Texto>
        <div className={estilos.recadoAcoes}>
          <Botao variante="secundario" tamanho="pequeno" aoClicar={() => void consulta.refetch()}>
            Tentar de novo
          </Botao>
          <LinkDeTexto para="/aeronaves">Voltar para a frota</LinkDeTexto>
        </div>
      </div>
    );
  }

  if (consulta.isPending || !detalhe) {
    return (
      <div className={estilos.tela}>
        <div role="status" className={estilos.apenasLeitor}>
          Carregando a aeronave…
        </div>
        <div className={estilos.esqueletoDoCabecalho} aria-hidden="true">
          <Esqueleto />
        </div>
        <div className={estilos.grade} aria-hidden="true">
          <div className={estilos.cartaoDoEsqueleto}>
            <Esqueleto />
            <Esqueleto />
          </div>
          <div className={estilos.cartaoDoEsqueleto}>
            <Esqueleto />
          </div>
        </div>
      </div>
    );
  }

  const situacao = detalhe.situacaoRegular ?? 'REGULAR';
  const subtitulo = [
    nomeDaAeronave(detalhe.fabricante, detalhe.modelo),
    detalhe.base,
    detalhe.hangar,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className={estilos.tela}>
      <header className={estilos.cabecalho}>
        <span className={estilos.matricula}>{detalhe.matricula}</span>
        <span className={estilos.subtitulo}>{subtitulo}</span>
        <EtiquetaDeSituacao situacao={situacao} />
        {/* "Atenção" sozinho é estado sem consequência: a linha diz o motivo — o documento e
            quando, ou a pendência de manutenção ou de tripulação que tirou a aeronave do regular. */}
        {situacao !== 'REGULAR' && detalhe.documentoDoProximoVencimento ? (
          <Texto variante="apoio" tom={situacao === 'VENCIDO' ? 'critico' : 'atencao'} como="span">
            {pendenciaQueGoverna(detalhe) ??
              consequenciaDoVencimento(
                detalhe.documentoDoProximoVencimento,
                detalhe.diasAteOProximoVencimento,
              )}
          </Texto>
        ) : null}
        <Botao
          variante="secundario"
          tamanho="pequeno"
          aoClicar={() => void navegar(`/aeronaves/${aeronaveId}/documentos`)}
        >
          {documentos.data
            ? `Documentos (${documentos.data.documentos?.length ?? 0})`
            : 'Documentos'}
        </Botao>
        <span className={estilos.espaco} />
        <dl className={estilos.vencimentos}>
          <div className={estilos.vencimento}>
            <dt className={estilos.vencimentoRotulo}>Vencimento CVA</dt>
            <dd className={estilos.vencimentoValor}>{dataCurta(detalhe.vencimentoCva)}</dd>
          </div>
          <div className={estilos.vencimento}>
            <dt className={estilos.vencimentoRotulo}>Vencimento RETA</dt>
            <dd className={estilos.vencimentoValor}>{dataCurta(detalhe.vencimentoReta)}</dd>
          </div>
          {saldo ? (
            <div className={estilos.vencimento}>
              <dt className={estilos.vencimentoRotulo}>Saldo do fundo</dt>
              <dd
                className={juntarClasses(
                  estilos.saldoValor,
                  (saldo.saldoDoFundo ?? 0) < 0 && estilos.saldoDevedor,
                )}
              >
                {moedaEmTexto(saldo.saldoDoFundo)}
              </dd>
            </div>
          ) : null}
        </dl>
      </header>

      <div className={estilos.grade}>
        <div className={estilos.coluna}>
          <SecaoDeContrato aeronaveId={aeronaveId} podeGerir={podeGerir} />
          <SecaoDeTripulacao aeronaveId={aeronaveId} podeGerir={podeGerir} />
        </div>
        <div className={estilos.coluna}>
          <CartaoDeFichaTecnica
            detalhe={detalhe}
            podeGerir={podeGerir}
            aoEditar={() => setPainel('ficha')}
          />
          <CartaoFinanceiro
            detalhe={detalhe}
            podeGerir={podeGerir}
            aoEditar={() => setPainel('financeiro')}
          />
          {/* Os registros desta aeronave moram nas telas donas deles; o link chega já filtrado. */}
          <nav className={estilos.atalhos} aria-label="Registros desta aeronave">
            <LinkDeTexto para={`/custos?aeronave=${aeronaveId}`}>Lançamentos →</LinkDeTexto>
            <LinkDeTexto para={`/voos?aeronave=${aeronaveId}`}>Voos →</LinkDeTexto>
          </nav>
        </div>
      </div>

      {painel === 'ficha' ? (
        <PainelDeFichaTecnica
          detalhe={detalhe}
          ehAdministrador={ehAdministrador}
          aoFechar={() => setPainel(null)}
        />
      ) : null}
      {painel === 'financeiro' ? (
        <PainelFinanceiro detalhe={detalhe} aoFechar={() => setPainel(null)} />
      ) : null}
    </div>
  );
}
