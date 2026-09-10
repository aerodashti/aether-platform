import { useState } from 'react';
import { useParams } from 'react-router-dom';

import { useSessao } from '@/compartilhado/sessao/sessao';
import { juntarClasses } from '@/design-system/classes';
import { Botao } from '@/design-system/primitivos/Botao';
import { LinkDeTexto } from '@/design-system/primitivos/LinkDeTexto';
import { Texto } from '@/design-system/primitivos/Texto';

import { useDetalheDaAeronave } from '../api/useDetalheDaAeronave';

import { CartaoDeFichaTecnica } from './CartaoDeFichaTecnica';
import { CartaoFinanceiro } from './CartaoFinanceiro';
import estilos from './PaginaDeDetalheDaAeronave.module.css';
import { PainelDeFichaTecnica } from './PainelDeFichaTecnica';
import { PainelFinanceiro } from './PainelFinanceiro';
import { dataCurta, prazoEmPalavras, ROTULO_DA_SITUACAO, ROTULO_DO_DOCUMENTO } from './rotulos';
import { SecaoDeContrato } from './SecaoDeContrato';
import { SecaoDeTripulacao } from './SecaoDeTripulacao';

type PainelAberto = 'ficha' | 'financeiro' | null;

const CLASSE_DA_SITUACAO = {
  REGULAR: 'regular',
  ATENCAO: 'atencao',
  VENCIDO: 'vencido',
} as const;

/**
 * O detalhe de uma aeronave: identidade e conformidade no cabeçalho; contrato de participações,
 * tripulação, ficha técnica e configuração financeira no corpo.
 *
 * <p>As abas de Voos, Custos, Rateio e Documentos do protótipo não estão aqui: cada uma vira
 * link quando a tela dona existir — aba para tela que não existe é porta pintada na parede.
 */
export function PaginaDeDetalheDaAeronave() {
  const { id } = useParams();
  const aeronaveId = Number(id);
  const consulta = useDetalheDaAeronave(aeronaveId);
  const { usuario, ehAdministrador } = useSessao();
  const [painel, setPainel] = useState<PainelAberto>(null);

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
      <div role="status" className={estilos.carregando}>
        <Texto variante="apoio" tom="suave" como="p">
          Carregando a aeronave…
        </Texto>
      </div>
    );
  }

  const situacao = detalhe.situacaoRegular ?? 'REGULAR';

  return (
    <div className={estilos.tela}>
      <nav aria-label="Trilha">
        <LinkDeTexto para="/aeronaves">← Aeronaves</LinkDeTexto>
      </nav>

      <header className={estilos.cabecalho}>
        <div className={estilos.identidade}>
          <span className={estilos.matricula}>{detalhe.matricula}</span>
          <div className={estilos.nomeada}>
            <Texto variante="subtitulo" como="h1">
              {[detalhe.fabricante, detalhe.modelo].filter(Boolean).join(' ')}
            </Texto>
            <span
              className={juntarClasses(estilos.situacao, estilos[CLASSE_DA_SITUACAO[situacao]])}
            >
              <span className={estilos.ponto} aria-hidden="true" />
              {ROTULO_DA_SITUACAO[situacao]}
            </span>
          </div>
        </div>
        <dl className={estilos.metricas}>
          <div className={estilos.metrica}>
            <dt className={estilos.metricaRotulo}>Vencimento CVA</dt>
            <dd className={estilos.metricaValor}>{dataCurta(detalhe.vencimentoCva)}</dd>
          </div>
          <div className={estilos.metrica}>
            <dt className={estilos.metricaRotulo}>Vencimento RETA</dt>
            <dd className={estilos.metricaValor}>{dataCurta(detalhe.vencimentoReta)}</dd>
          </div>
          <div className={estilos.metrica}>
            <dt className={estilos.metricaRotulo}>
              {detalhe.documentoDoProximoVencimento
                ? `${ROTULO_DO_DOCUMENTO[detalhe.documentoDoProximoVencimento]} vence primeiro`
                : 'Próximo vencimento'}
            </dt>
            <dd
              className={juntarClasses(
                estilos.metricaValor,
                situacao !== 'REGULAR' && estilos.metricaCritica,
              )}
            >
              {prazoEmPalavras(detalhe.diasAteOProximoVencimento) || '—'}
            </dd>
          </div>
        </dl>
      </header>

      <SecaoDeContrato aeronaveId={aeronaveId} podeGerir={podeGerir} />
      <SecaoDeTripulacao aeronaveId={aeronaveId} podeGerir={podeGerir} />

      <div className={estilos.cartoes}>
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
