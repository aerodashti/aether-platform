import { Botao } from '@/design-system/primitivos/Botao';
import { Texto } from '@/design-system/primitivos/Texto';

import type { DetalheDaAeronaveResponse } from '../api/useDetalheDaAeronave';

import estilos from './CartaoFinanceiro.module.css';
import {
  moedaEmTexto,
  PERIODICIDADES,
  ROTULO_DA_BASE_DO_RATEIO,
  ROTULO_DO_MODELO_DE_APORTE,
} from './rotulos';

interface CartaoFinanceiroProps {
  detalhe: DetalheDaAeronaveResponse;
  podeGerir: boolean;
  aoEditar: () => void;
}

/**
 * A configuração financeira em linhas rótulo–valor. A fatura e a cobertura do fundo do protótipo
 * não estão aqui: pertencem a aportes e rateio, que ainda não existem.
 */
export function CartaoFinanceiro({ detalhe, podeGerir, aoEditar }: CartaoFinanceiroProps) {
  const financeiro = detalhe.configuracaoFinanceira;
  const periodicidade =
    PERIODICIDADES.find((opcao) => opcao.valor === financeiro?.periodicidadeDoAporteMeses)
      ?.rotulo ?? '—';

  const linhas: Array<[string, string]> = [
    [
      'Base do rateio',
      financeiro ? ROTULO_DA_BASE_DO_RATEIO[financeiro.baseDoRateio ?? 'POR_USO'] : '—',
    ],
    [
      'Modelo de aporte',
      financeiro ? ROTULO_DO_MODELO_DE_APORTE[financeiro.modeloDeAporte ?? 'FIXO'] : '—',
    ],
    ['Periodicidade do aporte', periodicidade],
    ['Valor do aporte', moedaEmTexto(financeiro?.valorDoAporte)],
    ['Dia de fechamento da fatura', financeiro ? `Dia ${financeiro.diaDeFechamento}` : '—'],
  ];

  return (
    <section className={estilos.cartao} aria-label="Configuração financeira">
      <div className={estilos.cabecalho}>
        <Texto variante="legenda" tom="suave" como="h2">
          Configuração financeira
        </Texto>
        {podeGerir ? (
          <Botao variante="fantasma" tamanho="pequeno" aoClicar={aoEditar}>
            Alterar
          </Botao>
        ) : null}
      </div>
      <dl className={estilos.linhas}>
        {linhas.map(([rotulo, valor]) => (
          <div key={rotulo} className={estilos.linha}>
            <dt className={estilos.rotulo}>{rotulo}</dt>
            <dd className={estilos.valor}>{valor}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
