import type { ContratoResponse } from '../api/useContratos';

import { CartaoDeSecao } from './CartaoDeSecao';
import estilos from './HistoricoDeContratos.module.css';
import { dataCompleta, percentualEmTexto, periodoDoContrato } from './rotulos';

/**
 * Os contratos arquivados, sempre à vista quando existem — o histórico é a própria tabela de
 * contratos (ADR-0016), e a tela o conta do mais recente para o mais antigo.
 */
export function HistoricoDeContratos({ historico }: { historico: ContratoResponse[] }) {
  return (
    <CartaoDeSecao titulo="Histórico de contratos de participação">
      <ul className={estilos.lista}>
        {historico.map((contrato) => (
          <li key={contrato.id} className={estilos.item}>
            <span className={estilos.periodo}>
              {periodoDoContrato(contrato.inicioDaVigencia, contrato.fimDaVigencia)}
            </span>
            <span className={estilos.alteracao}>
              Arquivado em {dataCompleta(contrato.fimDaVigencia)} · criado por {contrato.criadoPor}
            </span>
            <ul className={estilos.participacoes}>
              {(contrato.participacoes ?? []).map((participacao) => (
                <li key={participacao.proprietarioId} className={estilos.participacao}>
                  {participacao.nome} ·{' '}
                  <span className={estilos.percentual}>
                    {percentualEmTexto(participacao.percentual)}
                  </span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </CartaoDeSecao>
  );
}
