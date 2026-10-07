import { useState } from 'react';

import { useAeronaves } from '@/compartilhado/aeronaves/useAeronaves';
import { competenciaLocal } from '@/compartilhado/formatacao/datas';
import { janelaDeCompetencias } from '@/compartilhado/recorte/competencia';
import { FalhaDaConsulta } from '@/compartilhado/recorte/FalhaDaConsulta';
import { RecorteInvalido } from '@/compartilhado/recorte/leituraDaFalha';
import { useRecorteDaUrl, type ModoDoRecorte } from '@/compartilhado/recorte/useRecorteDaUrl';
import { CampoDeTexto } from '@/design-system/primitivos/CampoDeTexto';
import { Esqueleto } from '@/design-system/primitivos/Esqueleto';
import { GrupoDeOpcoes } from '@/design-system/primitivos/GrupoDeOpcoes';
import { Selecao } from '@/design-system/primitivos/Selecao';
import { Texto } from '@/design-system/primitivos/Texto';

import {
  useFechamentoDoPeriodo,
  useFechamentoMensal,
  type LinhaDoProprietario,
} from '../api/useFechamento';

import { ExtratoDoProprietario } from './ExtratoDoProprietario';
import estilos from './PaginaDeFechamento.module.css';
import {
  competenciaPorExtenso,
  horasEmTexto,
  moedaEmTexto,
  ROTULO_DA_BASE,
  ROTULO_DO_MODELO_DE_APORTE,
} from './rotulos';
import { TabelaDoPeriodo } from './TabelaDoPeriodo';
import { TabelaMensal } from './TabelaMensal';
import { validarRecorteDoFechamento } from './validarRecorteDoFechamento';

function Indicadores({ itens }: { itens: Array<[string, string]> }) {
  return (
    <dl className={estilos.indicadores} role="group" aria-label="Indicadores do fechamento">
      {itens.map(([rotulo, valor]) => (
        <div className={estilos.indicador} key={rotulo}>
          <dt className={estilos.indicadorRotulo}>{rotulo}</dt>
          <dd className={estilos.indicadorValor}>{valor}</dd>
        </div>
      ))}
    </dl>
  );
}

interface CarregandoProps {
  /** A falha da consulta, ou o recorte que a tela já sabe inválido. */
  falha: Error | null;
  aoTentarDeNovo: () => void;
  aoLimpar: () => void;
}

function Carregando({ falha, aoTentarDeNovo, aoLimpar }: CarregandoProps) {
  if (falha) {
    return (
      <div className={estilos.recado} role="alert">
        <FalhaDaConsulta
          falha={falha}
          generica="Não foi possível calcular o fechamento."
          aoTentarDeNovo={aoTentarDeNovo}
          aoLimpar={aoLimpar}
        />
      </div>
    );
  }
  return (
    <div className={estilos.recado} role="status">
      <Esqueleto />
      <span className={estilos.apenasLeitor}>Calculando o fechamento…</span>
    </div>
  );
}

/**
 * O fechamento, na composição do protótipo: uma aeronave, um mês (uma linha por proprietário) ou
 * um período (uma linha por competência). Calculado no servidor a cada leitura — muda um
 * lançamento antigo, muda o saldo de hoje.
 *
 * <p>Fora daqui, e documentado: a seleção de linhas e o "Baixar extratos" (exportação em Excel e
 * PDF) e o ciclo de fatura pelo dia de fechamento — a competência é o mês civil.
 */
export function PaginaDeFechamento() {
  const recorte = useRecorteDaUrl(competenciaLocal());
  const aeronaves = useAeronaves();
  const [extrato, setExtrato] = useState<LinhaDoProprietario | null>(null);

  // Fechamento é sempre de uma aeronave: sem escolha na URL, vale a primeira da frota.
  const aeronaveId = recorte.aeronaveId || String(aeronaves.data?.[0]?.id ?? '');
  const competencia = recorte.competencia || competenciaLocal();
  const { modo, de, ate } = recorte;
  const janela = janelaDeCompetencias();
  const erros = validarRecorteDoFechamento({ modo, competencia, de, ate }, janela);
  const erroDoRecorte = erros.competencia ?? erros.de ?? erros.ate;
  const falhaDoRecorte = erroDoRecorte ? new RecorteInvalido(erroDoRecorte) : null;
  const consultar = (doModo: ModoDoRecorte) =>
    modo === doModo && aeronaveId !== '' && !falhaDoRecorte;
  const mensal = useFechamentoMensal(aeronaveId, competencia, consultar('MENSAL'));
  const periodo = useFechamentoDoPeriodo(aeronaveId, de, ate, consultar('PERIODO'));
  const atual = modo === 'MENSAL' ? mensal.data : periodo.data;

  return (
    <div className={estilos.tela}>
      <div className={estilos.filtros}>
        <Selecao
          rotulo="Aeronave"
          rotuloOculto
          valor={aeronaveId}
          opcoes={(aeronaves.data ?? []).map((aeronave) => ({
            valor: String(aeronave.id),
            rotulo: `${aeronave.matricula} — ${aeronave.modelo}`,
          }))}
          aoMudar={recorte.setAeronaveId}
          apoio={recorte.avisoDaAeronave}
        />
        <GrupoDeOpcoes
          rotulo="Recorte do fechamento"
          rotuloOculto
          variante="segmentado"
          valor={modo}
          opcoes={[
            { valor: 'MENSAL', rotulo: 'Mensal' },
            { valor: 'PERIODO', rotulo: 'Período' },
          ]}
          aoEscolher={(valor) => recorte.setModo(valor as ModoDoRecorte)}
        />
        {modo === 'MENSAL' ? (
          <div className={estilos.competencia}>
            <CampoDeTexto
              rotulo="Competência"
              rotuloOculto
              tipo="mes"
              valor={competencia}
              aoMudar={recorte.setCompetencia}
              minimo={janela.primeira}
              maximo={janela.ultima}
              erro={erros.competencia}
            />
          </div>
        ) : (
          <>
            <div className={estilos.competencia}>
              <CampoDeTexto
                rotulo="De"
                tipo="mes"
                valor={de}
                aoMudar={recorte.setDe}
                minimo={janela.primeira}
                maximo={janela.ultima}
                erro={erros.de}
                obrigatorio
              />
            </div>
            <div className={estilos.competencia}>
              <CampoDeTexto
                rotulo="Até"
                tipo="mes"
                valor={ate}
                aoMudar={recorte.setAte}
                minimo={janela.primeira}
                maximo={janela.ultima}
                erro={erros.ate}
                apoio="Até dez anos de uma vez."
                obrigatorio
              />
            </div>
          </>
        )}
        {atual ? (
          <div className={estilos.regras}>
            <span className={estilos.chip}>
              Rateio: {ROTULO_DA_BASE[atual.baseDoRateio ?? ''] ?? '—'}
            </span>
            <span className={estilos.chip}>
              Aporte: {ROTULO_DO_MODELO_DE_APORTE[atual.modeloDeAporte ?? ''] ?? '—'}
            </span>
          </div>
        ) : null}
      </div>

      {aeronaves.isError ? (
        <div className={estilos.recado} role="alert">
          <FalhaDaConsulta
            falha={aeronaves.error}
            generica="Não foi possível carregar a frota."
            aoTentarDeNovo={() => void aeronaves.refetch()}
          />
        </div>
      ) : aeronaves.data?.length === 0 ? (
        <div className={estilos.recado}>
          <Texto variante="corpo" como="p">
            Cadastre uma aeronave para ver o fechamento.
          </Texto>
        </div>
      ) : modo === 'MENSAL' ? (
        mensal.data ? (
          <>
            <Texto variante="apoio" tom="suave" como="p">
              {competenciaPorExtenso(mensal.data.competencia)} · {mensal.data.matricula}
            </Texto>
            <Indicadores
              itens={[
                ['Horas voadas no mês', horasEmTexto(mensal.data.indicadores?.horas)],
                ['Custos fixos', moedaEmTexto(mensal.data.indicadores?.custosFixos)],
                ['Custos variáveis', moedaEmTexto(mensal.data.indicadores?.custosVariaveis)],
                [
                  'Aportes e rendimentos',
                  moedaEmTexto(
                    (mensal.data.indicadores?.aportes ?? 0) +
                      (mensal.data.indicadores?.rendimentos ?? 0),
                  ),
                ],
                ['Saldo do fundo', moedaEmTexto(mensal.data.saldoFinalDoFundo)],
              ]}
            />
            {(mensal.data.naoRateado ?? 0) > 0 ? (
              <div className={estilos.aviso} role="note">
                {moedaEmTexto(mensal.data.naoRateado)} em custos ficaram sem rateio: a aeronave não
                tinha contrato de participação. Eles pesam no saldo do fundo, mas na conta de
                ninguém.
              </div>
            ) : null}
            <div className={estilos.painel}>
              {(mensal.data.linhas ?? []).length > 0 ? (
                <TabelaMensal fechamento={mensal.data} aoAbrirExtrato={setExtrato} />
              ) : (
                <div className={estilos.recado}>
                  <Texto variante="corpo" como="p">
                    Nenhum proprietário com movimento ou saldo nesta competência.
                  </Texto>
                </div>
              )}
            </div>
            <Texto variante="apoio" tom="suave" como="p">
              Saldo acum. = saldo anterior + aportes + rendimentos − total do mês. As horas de cada
              proprietário não contam voo de manutenção, que entra só nas horas da aeronave. Clique
              no nome para abrir o extrato.
            </Texto>
          </>
        ) : (
          <Carregando
            falha={falhaDoRecorte ?? mensal.error}
            aoTentarDeNovo={() => void mensal.refetch()}
            aoLimpar={recorte.limpar}
          />
        )
      ) : periodo.data ? (
        <>
          <Texto variante="apoio" tom="suave" como="p">
            {competenciaPorExtenso(periodo.data.de)} a {competenciaPorExtenso(periodo.data.ate)} ·{' '}
            {periodo.data.matricula}
          </Texto>
          <Indicadores
            itens={[
              ['Horas voadas no período', horasEmTexto(periodo.data.totais?.horas)],
              ['Custo total do período', moedaEmTexto(periodo.data.totais?.totalDeCustos)],
              [
                'Aportes e rendimentos',
                moedaEmTexto(
                  (periodo.data.totais?.aportes ?? 0) + (periodo.data.totais?.rendimentos ?? 0),
                ),
              ],
              ['Resultado consolidado', moedaEmTexto(periodo.data.totais?.resultado)],
            ]}
          />
          <div className={estilos.painel}>
            <TabelaDoPeriodo periodo={periodo.data} aoAbrirCompetencia={recorte.abrirCompetencia} />
          </div>
          <Texto variante="apoio" tom="suave" como="p">
            Clique em uma competência para abrir o fechamento mensal correspondente.
          </Texto>
        </>
      ) : (
        <Carregando
          falha={falhaDoRecorte ?? periodo.error}
          aoTentarDeNovo={() => void periodo.refetch()}
          aoLimpar={recorte.limpar}
        />
      )}

      {extrato ? (
        <ExtratoDoProprietario
          linha={extrato}
          matricula={mensal.data?.matricula}
          competencia={mensal.data?.competencia}
          aoFechar={() => setExtrato(null)}
        />
      ) : null}
    </div>
  );
}
