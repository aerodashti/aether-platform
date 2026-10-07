import { useEffect, useId, useRef, useState } from 'react';

import { ErroDeApi } from '@/api/cliente';
import { useVinculosVigentes } from '@/compartilhado/participacoes/useVinculosVigentes';
import { Botao } from '@/design-system/primitivos/Botao';
import { PainelModal } from '@/design-system/primitivos/PainelModal';
import { Texto } from '@/design-system/primitivos/Texto';

import {
  useDesativarProprietario,
  useSairDosContratos,
  type ProprietarioResponse,
} from '../api/useProprietarios';

import { FormularioDeSaida } from './FormularioDeSaida';
import estilos from './PainelDeDesativacao.module.css';
import { pedidoDeSaida, type ContratoSemQuemSai } from './rebalanceamento';

interface PainelDeDesativacaoProps {
  proprietario: ProprietarioResponse;
  /** Todos os cadastrados: dão nome aos sócios e, os ativos, quem pode entrar no lugar. */
  proprietarios: ProprietarioResponse[];
  aoFechar: () => void;
}

const CONFLITO = 409;

type EstadoDosVinculos = 'carregando' | 'falha' | 'semParticipacao' | 'comParticipacao';

function instrucao(estado: EstadoDosVinculos, nome: string): string {
  switch (estado) {
    case 'carregando':
      return `Conferindo as participações de ${nome}…`;
    case 'falha':
      return `Não foi possível conferir as participações de ${nome}: sem elas, não dá para saber se há percentual a redistribuir.`;
    case 'semParticipacao':
      return 'Este proprietário não possui participações ativas. Desativar apenas o tornará inativo — o cadastro e o histórico são preservados.';
    case 'comParticipacao':
      return 'Os demais proprietários aparecem com a participação atual: distribua o percentual liberado até cada aeronave fechar em 100%, com até duas casas (33,34). Um contrato novo entra em vigor em cada aeronave, e o anterior vai para o histórico.';
  }
}

/**
 * O "Excluir proprietário" do protótipo, que aqui é desativar. Sem participação vigente, só
 * confirma. Com participação, mostra cada aeronave dele com os demais na participação atual, para
 * a pessoa distribuir o percentual liberado — entre eles ou para alguém que entra — até fechar
 * 100%. Confirmar cria um contrato novo por aeronave, arquiva o anterior e desativa, tudo de uma vez.
 *
 * <p>O modo depende dos vínculos: o formulário só nasce quando eles chegam. Abrir antes mostraria
 * "não possui participações" a quem tem, e o servidor recusaria a desativação com 409.
 */
export function PainelDeDesativacao({
  proprietario,
  proprietarios,
  aoFechar,
}: PainelDeDesativacaoProps) {
  const vinculos = useVinculosVigentes();
  const desativar = useDesativarProprietario();
  const sair = useSairDosContratos();
  // Recomeça o formulário quando o servidor diz que os contratos mudaram (409).
  const [versao, setVersao] = useState(0);
  const apresentacao = useRef<HTMLDivElement>(null);
  const idDoTitulo = useId();
  const idDaInstrucao = useId();

  const id = proprietario.id ?? 0;
  const nome = proprietario.nome ?? '';
  const enviando = desativar.isPending || sair.isPending;
  const participa = (vinculos.data ?? []).some((vinculo) => vinculo.proprietarioId === id);
  const estado: EstadoDosVinculos = vinculos.isPending
    ? 'carregando'
    : vinculos.isError
      ? 'falha'
      : participa
        ? 'comParticipacao'
        : 'semParticipacao';

  // O showModal leva o foco ao primeiro campo e pula o título e a instrução. Este efeito roda
  // depois do efeito do PainelModal — o de quem está acima roda por último — e o traz de volta.
  useEffect(() => {
    apresentacao.current?.focus();
  }, [versao]);

  function recomecarSeMudou(erro: Error) {
    if (erro instanceof ErroDeApi && erro.status === CONFLITO) {
      void vinculos.refetch().then(() => setVersao((atual) => atual + 1));
    }
  }

  function confirmar(contratos: ContratoSemQuemSai[]) {
    const aoTerminar = { onSuccess: aoFechar, onError: recomecarSeMudou };
    if (contratos.length === 0) {
      sair.reset();
      desativar.mutate(id, aoTerminar);
    } else {
      desativar.reset();
      sair.mutate(pedidoDeSaida(id, contratos), aoTerminar);
    }
  }

  return (
    <PainelModal aberto aoFechar={aoFechar} rotulo={`Desativar ${nome}`} podeFechar={!enviando}>
      <div
        ref={apresentacao}
        className={estilos.apresentacao}
        tabIndex={-1}
        role="group"
        aria-labelledby={idDoTitulo}
        aria-describedby={idDaInstrucao}
      >
        <Texto variante="titulo" como="h2" id={idDoTitulo}>
          Desativar proprietário · {nome}
        </Texto>
        <div role="status">
          <Texto variante="apoio" tom="suave" como="p" id={idDaInstrucao}>
            {instrucao(estado, nome)}
          </Texto>
        </div>
      </div>

      {vinculos.isSuccess ? (
        <FormularioDeSaida
          key={`${versao}:${participa}`}
          quemSai={proprietario}
          vinculos={vinculos.data}
          proprietarios={proprietarios}
          falha={sair.error ?? desativar.error}
          enviando={enviando}
          aoConfirmar={confirmar}
          aoCancelar={aoFechar}
        />
      ) : (
        <div className={estilos.acoes}>
          <Botao variante="secundario" aoClicar={aoFechar}>
            Cancelar
          </Botao>
          {vinculos.isError ? (
            <Botao aoClicar={() => void vinculos.refetch()}>Tentar de novo</Botao>
          ) : null}
        </div>
      )}
    </PainelModal>
  );
}
