import { useState } from 'react';

import { useAeronaves } from '@/compartilhado/aeronaves/useAeronaves';
import { useSessao } from '@/compartilhado/sessao/sessao';
import { Botao } from '@/design-system/primitivos/Botao';
import { CampoDeTexto } from '@/design-system/primitivos/CampoDeTexto';
import { Selecao } from '@/design-system/primitivos/Selecao';
import { Texto } from '@/design-system/primitivos/Texto';

import { useVoos, type TrechoResponse } from '../api/useVoos';

import estilos from './PaginaDeVoos.module.css';
import { PainelDeTrecho } from './PainelDeTrecho';
import { competenciaAtual } from './rotulos';
import { TabelaDeTrechos } from './TabelaDeTrechos';

type Painel = { modo: 'novo' } | { modo: 'corrigir'; trecho: TrechoResponse } | null;

export function PaginaDeVoos() {
  const [aeronaveId, setAeronaveId] = useState('');
  const [competencia, setCompetencia] = useState(competenciaAtual());
  const [painel, setPainel] = useState<Painel>(null);
  const { usuario } = useSessao();
  const aeronaves = useAeronaves();
  const consulta = useVoos({ aeronaveId, competencia });

  // Lançar inclui o piloto: é ele quem volta do voo com os horários realizados na mão.
  const podeLancar =
    usuario?.papel === 'ADMINISTRADOR' ||
    usuario?.papel === 'GESTOR' ||
    usuario?.papel === 'PILOTO';

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
      </div>

      <div className={estilos.painel}>
        <TabelaDeTrechos
          diario={consulta.data}
          carregando={consulta.isPending}
          erro={consulta.isError}
          mostraAeronave={aeronaveId === ''}
          podeLancar={podeLancar}
          aoCorrigir={(trecho) => setPainel({ modo: 'corrigir', trecho })}
          aoTentarDeNovo={() => void consulta.refetch()}
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
