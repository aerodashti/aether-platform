import { useState } from 'react';

import { useProprietarios } from '@/compartilhado/proprietarios/useProprietarios';
import { useRecorteDaUrl } from '@/compartilhado/recorte/useRecorteDaUrl';
import { useSessao } from '@/compartilhado/sessao/sessao';
import { Abas } from '@/design-system/primitivos/Abas';
import { Botao } from '@/design-system/primitivos/Botao';
import { Selecao } from '@/design-system/primitivos/Selecao';
import { Texto } from '@/design-system/primitivos/Texto';

import { useTrocas, type SituacaoDaTroca, type TrocaResponse } from '../api/useTrocas';

import estilos from './PaginaDeTrocas.module.css';
import { PainelDeTroca } from './PainelDeTroca';
import { fraseDoSaldo } from './rotulos';
import { TabelaDeTrocas } from './TabelaDeTrocas';

type Painel = { modo: 'nova' } | { modo: 'editar'; troca: TrocaResponse } | null;

/**
 * As trocas de KM do protótipo: o filtro por proprietário, as abas Pendentes · Realizadas com a
 * contagem, e o saldo de horas a devolver de quem está no filtro. Sem paginação: trocas são
 * dezenas por ano.
 */
export function PaginaDeTrocas() {
  const [proprietarioId, setProprietarioId] = useState('');
  const [situacao, setSituacao] = useState<SituacaoDaTroca>('PENDENTE');
  const [painel, setPainel] = useState<Painel>(null);
  const { usuario } = useSessao();
  const podeGerir = usuario?.papel === 'ADMINISTRADOR' || usuario?.papel === 'GESTOR';
  // O "+ Registrar" da casca chega aqui por ?registrar=1.
  useRecorteDaUrl('', { podeRegistrar: podeGerir, aoPedir: () => setPainel({ modo: 'nova' }) });

  const proprietarios = useProprietarios();
  const consulta = useTrocas(proprietarioId, situacao);
  const nome =
    (proprietarios.data ?? []).find((dono) => String(dono.id) === proprietarioId)?.nome ?? '';
  const saldo = consulta.data?.saldo?.horasADevolver;

  return (
    <div className={estilos.tela}>
      <div className={estilos.cabecalho}>
        <Texto variante="corpo" tom="suave" como="p">
          Horas cedidas entre proprietários de uma aeronave, a devolver. O rateio não muda: o custo
          fica com quem voou.
        </Texto>
        {podeGerir ? (
          <Botao variante="contorno" aoClicar={() => setPainel({ modo: 'nova' })}>
            Registrar troca
          </Botao>
        ) : null}
      </div>

      <div className={estilos.filtros}>
        <Selecao
          rotulo="Filtrar por proprietário"
          rotuloOculto
          valor={proprietarioId}
          opcoes={[
            { valor: '', rotulo: 'Todos os proprietários' },
            ...(proprietarios.data ?? []).map((dono) => ({
              valor: String(dono.id),
              rotulo: dono.nome ?? '',
            })),
          ]}
          aoMudar={setProprietarioId}
        />
        <Texto variante="apoio" tom="suave" como="p">
          <span role="status">
            {proprietarioId && saldo != null
              ? fraseDoSaldo(nome, saldo)
              : 'Selecione um proprietário para ver o saldo de horas a devolver.'}
          </span>
        </Texto>
      </div>

      <Abas<SituacaoDaTroca>
        rotulo="Situação das trocas"
        variante="trilho"
        valor={situacao}
        aoEscolher={setSituacao}
        abas={[
          { valor: 'PENDENTE', rotulo: 'Trocas pendentes', contagem: consulta.data?.pendentes },
          { valor: 'CONCLUIDA', rotulo: 'Trocas realizadas', contagem: consulta.data?.concluidas },
        ]}
      />

      <div className={estilos.painel}>
        <TabelaDeTrocas
          trocas={consulta.data?.trocas}
          situacao={situacao}
          carregando={consulta.isPending}
          erro={consulta.isError}
          filtrada={proprietarioId !== ''}
          podeGerir={podeGerir}
          aoEditar={(troca) => setPainel({ modo: 'editar', troca })}
          aoTentarDeNovo={() => void consulta.refetch()}
        />
      </div>

      {painel ? (
        <PainelDeTroca
          key={painel.modo === 'editar' ? painel.troca.id : 'nova'}
          troca={painel.modo === 'editar' ? painel.troca : undefined}
          aoFechar={() => setPainel(null)}
        />
      ) : null}
    </div>
  );
}
