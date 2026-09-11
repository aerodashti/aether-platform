import { useState } from 'react';

import { useAeronaves } from '@/compartilhado/aeronaves/useAeronaves';
import { contexto } from '@/compartilhado/observabilidade/observabilidade';
import { useSessao } from '@/compartilhado/sessao/sessao';
import { Botao } from '@/design-system/primitivos/Botao';
import { CampoDeTexto } from '@/design-system/primitivos/CampoDeTexto';
import { Selecao } from '@/design-system/primitivos/Selecao';
import { Texto } from '@/design-system/primitivos/Texto';

import { useCustos, type CustoResponse } from '../api/useCustos';

import estilos from './PaginaDeCustos.module.css';
import { PainelDeCusto } from './PainelDeCusto';
import { competenciaAtual, csvDosLancamentos } from './rotulos';
import { TabelaDeCustos } from './TabelaDeCustos';

type Painel = { modo: 'novo' } | { modo: 'corrigir'; custo: CustoResponse } | null;

export function PaginaDeCustos() {
  const [aeronaveId, setAeronaveId] = useState('');
  const [competencia, setCompetencia] = useState(competenciaAtual());
  const [painel, setPainel] = useState<Painel>(null);
  const { usuario } = useSessao();
  const aeronaves = useAeronaves();
  const consulta = useCustos({ aeronaveId, competencia });

  const podeGerir = usuario?.papel === 'ADMINISTRADOR' || usuario?.papel === 'GESTOR';

  function exportarCsv() {
    void contexto.interacao('exportar-csv-de-custos', () => {
      const csv = csvDosLancamentos(consulta.data?.custos ?? []);
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      const ancora = document.createElement('a');
      ancora.href = url;
      ancora.download = `custos-${competencia || 'todos'}.csv`;
      ancora.click();
      URL.revokeObjectURL(url);
      return Promise.resolve();
    });
  }

  return (
    <div className={estilos.tela}>
      <div className={estilos.cabecalho}>
        <Texto variante="corpo" tom="suave" como="p">
          Cada lançamento é uma despesa da aeronave, classificada para o rateio e as análises.
        </Texto>
        {podeGerir ? (
          <Botao aoClicar={() => setPainel({ modo: 'novo' })}>Registrar custo</Botao>
        ) : null}
      </div>

      <div className={estilos.filtros}>
        <Selecao
          rotulo="Filtrar por aeronave"
          rotuloOculto
          valor={aeronaveId}
          opcoes={[
            { valor: '', rotulo: 'Todas as aeronaves' },
            ...(aeronaves.data ?? []).map((aeronave) => ({
              valor: String(aeronave.id),
              rotulo: `${aeronave.matricula} — ${aeronave.modelo}`,
            })),
          ]}
          aoMudar={setAeronaveId}
        />
        <div className={estilos.competencia}>
          <CampoDeTexto
            rotulo="Competência"
            rotuloOculto
            tipo="mes"
            valor={competencia}
            aoMudar={setCompetencia}
            apoio="Vazio mostra todo o histórico."
          />
        </div>
        <div className={estilos.exportar}>
          <Botao
            variante="secundario"
            tamanho="pequeno"
            aoClicar={exportarCsv}
            desabilitado={(consulta.data?.custos ?? []).length === 0}
          >
            Exportar CSV
          </Botao>
        </div>
      </div>

      <div className={estilos.painel}>
        <TabelaDeCustos
          lancamentos={consulta.data}
          carregando={consulta.isPending}
          erro={consulta.isError}
          podeGerir={podeGerir}
          aoCorrigir={(custo) => setPainel({ modo: 'corrigir', custo })}
          aoTentarDeNovo={() => void consulta.refetch()}
          aoLimparFiltros={() => {
            setAeronaveId('');
            setCompetencia('');
          }}
        />
      </div>

      {painel ? (
        <PainelDeCusto
          key={painel.modo === 'corrigir' ? painel.custo.id : 'novo'}
          custo={painel.modo === 'corrigir' ? painel.custo : undefined}
          aeronaveInicial={aeronaveId || undefined}
          aoFechar={() => setPainel(null)}
        />
      ) : null}
    </div>
  );
}
