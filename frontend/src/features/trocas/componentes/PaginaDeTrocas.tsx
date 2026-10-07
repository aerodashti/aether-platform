import { useEffect, useRef, useState } from 'react';

import { useProprietarios } from '@/compartilhado/proprietarios/useProprietarios';
import { useRecorteDaUrl } from '@/compartilhado/recorte/useRecorteDaUrl';
import { useSessao } from '@/compartilhado/sessao/sessao';
import { Abas } from '@/design-system/primitivos/Abas';
import { Botao } from '@/design-system/primitivos/Botao';
import { Selecao } from '@/design-system/primitivos/Selecao';
import { Texto } from '@/design-system/primitivos/Texto';

import { useTrocas, type SituacaoDaTroca, type TrocaResponse } from '../api/useTrocas';

import estilos from './PaginaDeTrocas.module.css';
import { PainelDeConclusao } from './PainelDeConclusao';
import { PainelDeReabertura } from './PainelDeReabertura';
import { PainelDeTroca } from './PainelDeTroca';
import { fraseDoSaldo } from './rotulos';
import { TabelaDeTrocas } from './TabelaDeTrocas';

type Painel =
  { modo: 'nova' } | { modo: 'editar' | 'concluir' | 'reabrir'; troca: TrocaResponse } | null;

const ROTULO_DA_SITUACAO: Record<SituacaoDaTroca, string> = {
  PENDENTE: 'Trocas pendentes',
  CONCLUIDA: 'Trocas realizadas',
};

/**
 * As trocas de KM do protótipo: o filtro por proprietário, as abas Pendentes · Realizadas com a
 * contagem, e o saldo de horas a devolver de quem está no filtro. Sem paginação: trocas são
 * dezenas por ano.
 */
export function PaginaDeTrocas() {
  const [proprietarioId, setProprietarioId] = useState('');
  const [situacao, setSituacao] = useState<SituacaoDaTroca>('PENDENTE');
  const [painel, setPainel] = useState<Painel>(null);
  const [aviso, setAviso] = useState('');
  const [pedidosDeFoco, setPedidosDeFoco] = useState(0);
  const refDaLista = useRef<HTMLDivElement>(null);
  const { usuario } = useSessao();
  const podeGerir = usuario?.papel === 'ADMINISTRADOR' || usuario?.papel === 'GESTOR';
  // O "+ Registrar" da casca chega aqui por ?registrar=1.
  useRecorteDaUrl('', { podeRegistrar: podeGerir, aoPedir: () => abrir({ modo: 'nova' }) });

  const proprietarios = useProprietarios();
  const consulta = useTrocas(proprietarioId, situacao);
  const nome =
    (proprietarios.data ?? []).find((dono) => String(dono.id) === proprietarioId)?.nome ?? '';
  const saldo = consulta.data?.saldo?.horasADevolver;

  // Roda depois de o painel sair de cena — e de ele devolver o foco ao botão da linha.
  useEffect(() => {
    if (pedidosDeFoco > 0) {
      refDaLista.current?.focus();
    }
  }, [pedidosDeFoco]);

  function abrir(proximo: Painel) {
    setAviso('');
    setPainel(proximo);
  }

  function escolherSituacao(proxima: SituacaoDaTroca) {
    setAviso('');
    setSituacao(proxima);
  }

  /**
   * Concluir e reabrir tiram a troca da aba, e a linha leva junto o botão que tinha o foco: a
   * lista recebe o foco, e o aviso diz para onde a troca foi.
   */
  function anunciarMudanca(mensagem: string) {
    setPainel(null);
    setAviso(mensagem);
    setPedidosDeFoco((pedidos) => pedidos + 1);
  }

  return (
    <div className={estilos.tela}>
      <div className={estilos.cabecalho}>
        <Texto variante="corpo" tom="suave" como="p">
          Horas cedidas entre proprietários de uma aeronave, a devolver. O rateio não muda: o custo
          fica com quem voou.
        </Texto>
        {podeGerir ? (
          <Botao variante="contorno" aoClicar={() => abrir({ modo: 'nova' })}>
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
        aoEscolher={escolherSituacao}
        abas={[
          {
            valor: 'PENDENTE',
            rotulo: ROTULO_DA_SITUACAO.PENDENTE,
            contagem: consulta.data?.pendentes,
          },
          {
            valor: 'CONCLUIDA',
            rotulo: ROTULO_DA_SITUACAO.CONCLUIDA,
            contagem: consulta.data?.concluidas,
          },
        ]}
      />

      <div role="status">
        {aviso ? (
          <Texto variante="apoio" tom="positivo" como="p">
            {aviso}
          </Texto>
        ) : null}
      </div>

      <div
        ref={refDaLista}
        className={estilos.painel}
        role="region"
        aria-label={ROTULO_DA_SITUACAO[situacao]}
        tabIndex={-1}
      >
        <TabelaDeTrocas
          trocas={consulta.data?.trocas}
          situacao={situacao}
          carregando={consulta.isPending}
          erro={consulta.isError}
          filtrada={proprietarioId !== ''}
          podeGerir={podeGerir}
          aoEditar={(troca) => abrir({ modo: 'editar', troca })}
          aoConcluir={(troca) => abrir({ modo: 'concluir', troca })}
          aoReabrir={(troca) => abrir({ modo: 'reabrir', troca })}
          aoTentarDeNovo={() => void consulta.refetch()}
        />
      </div>

      {painel?.modo === 'nova' || painel?.modo === 'editar' ? (
        <PainelDeTroca
          key={painel.modo === 'editar' ? painel.troca.id : 'nova'}
          troca={painel.modo === 'editar' ? painel.troca : undefined}
          aoFechar={() => setPainel(null)}
        />
      ) : null}
      {painel?.modo === 'concluir' ? (
        <PainelDeConclusao
          troca={painel.troca}
          aoFechar={() => setPainel(null)}
          aoConcluir={() => anunciarMudanca('Troca concluída e movida para Trocas realizadas.')}
        />
      ) : null}
      {painel?.modo === 'reabrir' ? (
        <PainelDeReabertura
          troca={painel.troca}
          aoFechar={() => setPainel(null)}
          aoReabrir={() => anunciarMudanca('Troca reaberta e de volta em Trocas pendentes.')}
        />
      ) : null}
    </div>
  );
}
