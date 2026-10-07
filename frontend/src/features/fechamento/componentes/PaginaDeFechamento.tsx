import { useState } from 'react';

import { useAeronaves } from '@/compartilhado/aeronaves/useAeronaves';
import { useRecorteDaUrl } from '@/compartilhado/recorte/useRecorteDaUrl';
import { Botao } from '@/design-system/primitivos/Botao';
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
  competenciaAtual,
  competenciaPorExtenso,
  deslocarCompetencia,
  horasEmTexto,
  moedaEmTexto,
  ROTULO_DA_BASE,
  ROTULO_DO_MODELO_DE_APORTE,
} from './rotulos';
import { TabelaDoPeriodo } from './TabelaDoPeriodo';
import { TabelaMensal } from './TabelaMensal';

type Modo = 'MENSAL' | 'PERIODO';

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

function Carregando({ erro, aoTentarDeNovo }: { erro: boolean; aoTentarDeNovo: () => void }) {
  if (erro) {
    return (
      <div className={estilos.recado} role="alert">
        <Texto variante="corpo" como="p">
          Não foi possível calcular o fechamento.
        </Texto>
        <Botao variante="secundario" tamanho="pequeno" aoClicar={aoTentarDeNovo}>
          Tentar de novo
        </Botao>
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
  const recorte = useRecorteDaUrl(competenciaAtual());
  const aeronaves = useAeronaves();
  const [modo, setModo] = useState<Modo>('MENSAL');
  const [de, setDe] = useState(deslocarCompetencia(competenciaAtual(), -11));
  const [ate, setAte] = useState(competenciaAtual());
  const [extrato, setExtrato] = useState<LinhaDoProprietario | null>(null);

  // Fechamento é sempre de uma aeronave: sem escolha na URL, vale a primeira da frota.
  const aeronaveId = recorte.aeronaveId || String(aeronaves.data?.[0]?.id ?? '');
  const competencia = recorte.competencia || competenciaAtual();
  const mensal = useFechamentoMensal(modo === 'MENSAL' ? aeronaveId : '', competencia);
  const periodo = useFechamentoDoPeriodo(modo === 'PERIODO' ? aeronaveId : '', de, ate);
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
        />
        <GrupoDeOpcoes
          rotulo="Recorte do fechamento"
          variante="segmentado"
          valor={modo}
          opcoes={[
            { valor: 'MENSAL', rotulo: 'Mensal' },
            { valor: 'PERIODO', rotulo: 'Período' },
          ]}
          aoEscolher={(valor) => setModo(valor as Modo)}
        />
        {modo === 'MENSAL' ? (
          <div className={estilos.competencia}>
            <CampoDeTexto
              rotulo="Competência"
              rotuloOculto
              tipo="mes"
              valor={competencia}
              aoMudar={recorte.setCompetencia}
            />
          </div>
        ) : (
          <>
            <div className={estilos.competencia}>
              <CampoDeTexto rotulo="De" tipo="mes" valor={de} aoMudar={setDe} />
            </div>
            <div className={estilos.competencia}>
              <CampoDeTexto rotulo="Até" tipo="mes" valor={ate} aoMudar={setAte} />
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

      {modo === 'MENSAL' ? (
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
          <Carregando erro={mensal.isError} aoTentarDeNovo={() => void mensal.refetch()} />
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
            <TabelaDoPeriodo
              periodo={periodo.data}
              aoAbrirCompetencia={(escolhida) => {
                recorte.setCompetencia(escolhida);
                setModo('MENSAL');
              }}
            />
          </div>
          <Texto variante="apoio" tom="suave" como="p">
            Clique em uma competência para abrir o fechamento mensal correspondente.
          </Texto>
        </>
      ) : de > ate ? (
        <div className={estilos.aviso} role="alert">
          A competência inicial vem depois da final.
        </div>
      ) : (
        <Carregando erro={periodo.isError} aoTentarDeNovo={() => void periodo.refetch()} />
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
