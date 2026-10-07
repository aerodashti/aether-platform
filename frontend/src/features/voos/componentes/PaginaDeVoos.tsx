import { useState } from 'react';

import { useAeronaves } from '@/compartilhado/aeronaves/useAeronaves';
import { competenciaLocal } from '@/compartilhado/formatacao/datas';
import { competenciaEntre } from '@/compartilhado/recorte/competencia';
import { RecorteInvalido } from '@/compartilhado/recorte/leituraDaFalha';
import { useRecorteDaUrl } from '@/compartilhado/recorte/useRecorteDaUrl';
import { useSessao } from '@/compartilhado/sessao/sessao';
import { Botao } from '@/design-system/primitivos/Botao';
import { CampoDeTexto } from '@/design-system/primitivos/CampoDeTexto';
import { Selecao } from '@/design-system/primitivos/Selecao';
import { Texto } from '@/design-system/primitivos/Texto';

import { useVoos, type TrechoResponse } from '../api/useVoos';

import estilos from './PaginaDeVoos.module.css';
import { PainelDeTrecho } from './PainelDeTrecho';
import { TabelaDeTrechos } from './TabelaDeTrechos';
import { diarioDoVoo, relatoriosDoRecorte, usoPorProprietario } from './usoDoRecorte';
import { UsoPorProprietario } from './UsoPorProprietario';

type Painel = { modo: 'novo' } | { modo: 'corrigir'; trecho: TrechoResponse } | null;

/** O filtro só confere o formato: qualquer mês existe, e o vazio é todo o histórico. */
const COMPETENCIA = competenciaEntre();

export function PaginaDeVoos() {
  const [painel, setPainel] = useState<Painel>(null);
  const { usuario } = useSessao();
  const aeronaves = useAeronaves();

  // Lançar inclui o piloto: é ele quem volta do voo com os horários realizados na mão.
  const podeLancar =
    usuario?.papel === 'ADMINISTRADOR' ||
    usuario?.papel === 'GESTOR' ||
    usuario?.papel === 'PILOTO';
  // O "+ Registrar" da casca chega aqui por ?registrar=1.
  const { aeronaveId, avisoDaAeronave, competencia, setAeronaveId, setCompetencia, limpar } =
    useRecorteDaUrl(competenciaLocal(), {
      podeRegistrar: podeLancar,
      aoPedir: () => setPainel({ modo: 'novo' }),
    });
  const erroDaCompetencia = COMPETENCIA(competencia);
  const consulta = useVoos({ aeronaveId, competencia }, erroDaCompetencia === undefined);
  // O filtro por voo é local: recorta a grade do recorte que já chegou, sem ir ao servidor.
  const [voo, setVoo] = useState('');
  const trechosDoRecorte = consulta.data?.trechos ?? [];
  const relatorios = relatoriosDoRecorte(trechosDoRecorte);
  const vooEscolhido = relatorios.includes(voo) ? voo : '';

  return (
    <div className={estilos.tela}>
      <div className={estilos.cabecalho}>
        <Texto variante="corpo" tom="suave" como="p">
          Um voo (Rel. Voo) agrupa todos os trechos voados enquanto a aeronave esteve com o
          proprietário; o diário alimenta o % de uso do rateio.
        </Texto>
        {podeLancar ? (
          <Botao aoClicar={() => setPainel({ modo: 'novo' })}>Registrar trecho</Botao>
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
          apoio={avisoDaAeronave}
        />
        <div className={estilos.competencia}>
          <CampoDeTexto
            rotulo="Competência"
            rotuloOculto
            tipo="mes"
            valor={competencia}
            aoMudar={setCompetencia}
            erro={erroDaCompetencia}
            apoio="Vazio mostra todo o histórico."
          />
        </div>
        <Selecao
          rotulo="Filtrar por voo"
          rotuloOculto
          valor={vooEscolhido}
          opcoes={[
            { valor: '', rotulo: 'Todos os voos' },
            ...relatorios.map((relatorio) => ({ valor: relatorio, rotulo: relatorio })),
          ]}
          aoMudar={setVoo}
        />
      </div>

      {/* % de uso só faz sentido dentro de uma aeronave: somar horas de aeronaves diferentes não
          diz nada sobre o rateio de nenhuma. */}
      {aeronaveId !== '' ? (
        <UsoPorProprietario usos={usoPorProprietario(trechosDoRecorte)} />
      ) : null}

      <div className={estilos.painel}>
        <TabelaDeTrechos
          diario={diarioDoVoo(consulta.data, vooEscolhido)}
          carregando={consulta.isPending}
          erro={erroDaCompetencia ? new RecorteInvalido(erroDaCompetencia) : consulta.error}
          mostraAeronave={aeronaveId === ''}
          podeLancar={podeLancar}
          aoCorrigir={(trecho) => setPainel({ modo: 'corrigir', trecho })}
          aoTentarDeNovo={() => void consulta.refetch()}
          aoLimparFiltros={limpar}
        />
      </div>

      {painel ? (
        <PainelDeTrecho
          key={painel.modo === 'corrigir' ? painel.trecho.id : 'novo'}
          trecho={painel.modo === 'corrigir' ? painel.trecho : undefined}
          aeronaveInicial={aeronaveId || undefined}
          aoFechar={() => setPainel(null)}
        />
      ) : null}
    </div>
  );
}
