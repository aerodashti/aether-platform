import { useState } from 'react';

import { useAeronaves } from '@/compartilhado/aeronaves/useAeronaves';
import { contexto } from '@/compartilhado/observabilidade/observabilidade';
import { useSessao } from '@/compartilhado/sessao/sessao';
import { Abas } from '@/design-system/primitivos/Abas';
import { Botao } from '@/design-system/primitivos/Botao';
import { CampoDeTexto } from '@/design-system/primitivos/CampoDeTexto';
import { GrupoDeOpcoes } from '@/design-system/primitivos/GrupoDeOpcoes';
import { Selecao } from '@/design-system/primitivos/Selecao';
import { Texto } from '@/design-system/primitivos/Texto';

import {
  useCustos,
  type CategoriaDeCusto,
  type CustoResponse,
  type TipoDeCusto,
} from '../api/useCustos';

import estilos from './PaginaDeCustos.module.css';
import { PainelDeCusto } from './PainelDeCusto';
import { CATEGORIAS, competenciaAtual, csvDosLancamentos } from './rotulos';
import { TabelaDeCustos } from './TabelaDeCustos';

type Painel = { modo: 'novo' } | { modo: 'corrigir'; custo: CustoResponse } | null;
type Escopo = TipoDeCusto | 'TODOS';
type Categoria = CategoriaDeCusto | 'TODAS';

const ESCOPOS: Array<{ valor: Escopo; rotulo: string }> = [
  { valor: 'TODOS', rotulo: 'Todos' },
  { valor: 'FIXO', rotulo: 'Fixos' },
  { valor: 'VARIAVEL', rotulo: 'Variáveis' },
];

/**
 * Os lançamentos de custo, na composição do protótipo: filtros de recorte (aeronave e
 * competência, que vão ao servidor), o escopo e as abas de categoria (recortes locais, com a
 * contagem de cada uma), a grade e a faixa de totais.
 *
 * <p>A visão em cartões e a paginação do protótipo não estão aqui: a lista é do recorte de uma
 * competência, que cabe numa grade; e "visão" é opção experimental do próprio brief (DD-E02).
 */
export function PaginaDeCustos() {
  const [aeronaveId, setAeronaveId] = useState('');
  const [competencia, setCompetencia] = useState(competenciaAtual());
  const [painel, setPainel] = useState<Painel>(null);
  const [escopo, setEscopo] = useState<Escopo>('TODOS');
  const [categoria, setCategoria] = useState<Categoria>('TODAS');
  const { usuario } = useSessao();
  const aeronaves = useAeronaves();
  const consulta = useCustos({ aeronaveId, competencia });

  const podeGerir = usuario?.papel === 'ADMINISTRADOR' || usuario?.papel === 'GESTOR';

  const todos = consulta.data?.custos ?? [];
  const doEscopo = escopo === 'TODOS' ? todos : todos.filter((custo) => custo.tipo === escopo);
  // As abas listam só as categorias presentes no escopo, cada uma com quantos lançamentos tem.
  const categorias = (Object.keys(CATEGORIAS) as CategoriaDeCusto[])
    .map((chave) => ({
      valor: chave,
      rotulo: CATEGORIAS[chave].rotulo,
      contagem: doEscopo.filter((custo) => custo.categoria === chave).length,
    }))
    .filter((aba) => aba.contagem > 0);
  const categoriaAtiva = categorias.some((aba) => aba.valor === categoria) ? categoria : 'TODAS';
  const visiveis =
    categoriaAtiva === 'TODAS'
      ? doEscopo
      : doEscopo.filter((custo) => custo.categoria === categoriaAtiva);

  function exportarCsv() {
    void contexto.interacao('exportar-csv-de-custos', () => {
      const csv = csvDosLancamentos(visiveis);
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
          <Botao variante="contorno" aoClicar={() => setPainel({ modo: 'novo' })}>
            Registrar custo
          </Botao>
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
        <GrupoDeOpcoes
          rotulo="Escopo"
          valor={escopo}
          opcoes={ESCOPOS}
          aoEscolher={(valor) => setEscopo(valor as Escopo)}
        />
        <div className={estilos.exportar}>
          <Botao variante="secundario" aoClicar={exportarCsv} desabilitado={visiveis.length === 0}>
            Exportar CSV
          </Botao>
        </div>
      </div>

      {categorias.length > 0 ? (
        <Abas<Categoria>
          rotulo="Categorias"
          valor={categoriaAtiva}
          aoEscolher={setCategoria}
          abas={[{ valor: 'TODAS', rotulo: 'Todas', contagem: doEscopo.length }, ...categorias]}
        />
      ) : null}

      <div className={estilos.painel}>
        <TabelaDeCustos
          custos={visiveis}
          totais={consulta.data?.totais}
          carregando={consulta.isPending}
          erro={consulta.isError}
          podeGerir={podeGerir}
          aoCorrigir={(custo) => setPainel({ modo: 'corrigir', custo })}
          aoTentarDeNovo={() => void consulta.refetch()}
          aoLimparFiltros={() => {
            setAeronaveId('');
            setCompetencia('');
            setEscopo('TODOS');
            setCategoria('TODAS');
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
