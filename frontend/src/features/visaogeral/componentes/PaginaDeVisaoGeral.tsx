import { useAeronaves } from '@/compartilhado/aeronaves/useAeronaves';
import { useAvisos } from '@/compartilhado/avisos/useAvisos';
import { competenciaLocal } from '@/compartilhado/formatacao/datas';
import { competenciaAbreviada } from '@/compartilhado/fundo/useSaldosDoFundo';
import { juntarClasses } from '@/design-system/classes';
import { Botao } from '@/design-system/primitivos/Botao';
import { Esqueleto } from '@/design-system/primitivos/Esqueleto';
import { LinkDeTexto } from '@/design-system/primitivos/LinkDeTexto';
import { Texto } from '@/design-system/primitivos/Texto';

import { useResumoDaFrota, useTrechosDoMes } from '../api/useVisaoGeral';

import { CartaoDaFrota } from './CartaoDaFrota';
import { GraficoDeBarras } from './GraficoDeBarras';
import estilos from './PaginaDeVisaoGeral.module.css';
import { comparativo, custoPorHora, linhasDaFrota, porAtencao } from './regras';
import { horas, moedaCurta } from './rotulos';

/** Quantos cartões a "Frota gerenciada" mostra: os que mais pedem atenção. */
const CARTOES = 3;

/**
 * A Visão geral do Projeto final: a porta de entrada. Quatro indicadores da frota, as aeronaves que
 * mais pedem atenção — situação, fundo e cobertura — e o comparativo do mês. Tudo é leitura: o
 * dinheiro vem do fechamento (`/fechamentos/frota`), a situação da frota, os km do diário e os
 * alertas da Central.
 */
export function PaginaDeVisaoGeral() {
  const competencia = competenciaLocal();
  const aeronaves = useAeronaves();
  const resumos = useResumoDaFrota(competencia);
  const trechos = useTrechosDoMes(competencia);
  const avisos = useAvisos();

  if (aeronaves.isError || resumos.isError) {
    return (
      <div className={estilos.recado} role="alert">
        <Texto variante="corpo" como="p">
          Não foi possível carregar a visão geral.
        </Texto>
        <Botao
          variante="secundario"
          tamanho="pequeno"
          aoClicar={() => {
            void aeronaves.refetch();
            void resumos.refetch();
          }}
        >
          Tentar de novo
        </Botao>
      </div>
    );
  }
  if (aeronaves.isPending || resumos.isPending) {
    return (
      <div className={estilos.tela}>
        <div role="status" className={estilos.apenasLeitor}>
          Carregando a visão geral…
        </div>
        <div className={estilos.indicadores} aria-hidden="true">
          {Array.from({ length: 4 }, (_, indice) => (
            <div key={indice} className={estilos.indicador}>
              <Esqueleto />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const kmPorAeronave = new Map<number, number>();
  for (const trecho of trechos.data?.trechos ?? []) {
    kmPorAeronave.set(
      trecho.aeronaveId ?? 0,
      (kmPorAeronave.get(trecho.aeronaveId ?? 0) ?? 0) + (trecho.km ?? 0),
    );
  }
  const todosOsAvisos = avisos.data?.avisos ?? [];
  const linhas = linhasDaFrota(aeronaves.data, resumos.data, kmPorAeronave, todosOsAvisos);
  const saldoConsolidado = linhas.reduce((soma, linha) => soma + linha.saldo, 0);
  const descobertas = linhas.filter((linha) => linha.saldo < 0).length;
  const custoDoMes = linhas.reduce((soma, linha) => soma + linha.fixos + linha.variaveis, 0);
  const horasDoMes = linhas.reduce((soma, linha) => soma + linha.horas, 0);
  const vencidos = todosOsAvisos.filter((aviso) => aviso.gravidade === 'VENCIDO').length;
  const mes = competenciaAbreviada(competencia);
  const atencao = [...linhas].sort(porAtencao).slice(0, CARTOES);

  const indicadores = [
    {
      rotulo: 'Saldo consolidado dos fundos',
      valor: moedaCurta(saldoConsolidado),
      apoio:
        descobertas > 0
          ? `${descobertas} ${descobertas === 1 ? 'fundo descoberto' : 'fundos descobertos'}`
          : `${linhas.length} ${linhas.length === 1 ? 'aeronave' : 'aeronaves'}`,
      tom: saldoConsolidado < 0 ? estilos.critico : undefined,
    },
    {
      rotulo: `Custos ${mes}`,
      valor: moedaCurta(custoDoMes),
      apoio: 'fixos + variáveis, toda a frota',
      tom: undefined,
    },
    {
      rotulo: 'Horas voadas no mês',
      valor: horas(horasDoMes),
      apoio: `${trechos.data?.totais?.pousos ?? 0} pousos`,
      tom: undefined,
    },
    {
      rotulo: 'Alertas ativos',
      valor: String(todosOsAvisos.length),
      apoio: vencidos > 0 ? `${vencidos} vencidos — exigem ação` : 'nenhum vencido',
      tom: vencidos > 0 ? estilos.critico : undefined,
    },
  ];

  return (
    <div className={estilos.tela}>
      <dl className={estilos.indicadores} role="group" aria-label="Indicadores da frota">
        {indicadores.map((indicador) => (
          <div key={indicador.rotulo} className={estilos.indicador}>
            <dt className={estilos.rotuloDoIndicador}>{indicador.rotulo}</dt>
            <dd className={juntarClasses(estilos.valorDoIndicador, indicador.tom)}>
              {indicador.valor}
            </dd>
            <dd className={estilos.apoioDoIndicador}>{indicador.apoio}</dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="frota-gerenciada" className={estilos.secao}>
        <div className={estilos.cabecalhoDaSecao}>
          <div>
            <h2 id="frota-gerenciada" className={estilos.tituloDaSecao}>
              Frota gerenciada
            </h2>
            <Texto variante="apoio" tom="suave" como="p">
              {linhas.length > CARTOES
                ? `Mostrando as ${CARTOES} que exigem mais atenção de ${linhas.length}`
                : 'Todas as aeronaves, da que exige mais atenção à que exige menos'}
            </Texto>
          </div>
          <LinkDeTexto para="/aeronaves">Ver todas →</LinkDeTexto>
        </div>
        {linhas.length === 0 ? (
          <div className={estilos.recado}>
            <Texto variante="corpo" como="p">
              Nenhuma aeronave cadastrada
            </Texto>
          </div>
        ) : (
          <ul className={estilos.cartoes} aria-label="Frota gerenciada">
            {atencao.map((linha) => (
              <CartaoDaFrota key={linha.aeronaveId} linha={linha} />
            ))}
          </ul>
        )}
      </section>

      {linhas.length > 0 ? (
        <section aria-labelledby="comparativo" className={estilos.secao}>
          <h2 id="comparativo" className={estilos.tituloDaSecao}>
            Comparativo da frota — {mes}
          </h2>
          <ul className={estilos.graficos}>
            <GraficoDeBarras
              titulo="Maiores custos do mês — fixo vs variável"
              comparativo={comparativo(
                linhas,
                (linha) => linha.fixos + linha.variaveis,
                (linha) => [linha.fixos, linha.variaveis],
              )}
              formatar={moedaCurta}
              series={['Fixo', 'Variável']}
            />
            <GraficoDeBarras
              titulo="Maior custo por hora voada"
              comparativo={comparativo(linhas, custoPorHora)}
              formatar={moedaCurta}
              series={['R$ por hora']}
            />
            <GraficoDeBarras
              titulo="Mais horas voadas"
              comparativo={comparativo(linhas, (linha) => linha.horas)}
              formatar={horas}
              series={['Horas']}
            />
          </ul>
        </section>
      ) : null}
    </div>
  );
}
