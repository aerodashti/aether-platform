import { useId } from 'react';

import { ResumoDoFormulario } from '@/compartilhado/formulario/ResumoDoFormulario';
import { Botao } from '@/design-system/primitivos/Botao';
import { PainelModal } from '@/design-system/primitivos/PainelModal';
import { Texto } from '@/design-system/primitivos/Texto';

import {
  useExcluirManutencao,
  useExcluirParametro,
  type ManutencaoResponse,
  type ParametroResponse,
} from '../api/useManutencao';

import estilos from './Painel.module.css';
import { nomeDaManutencao } from './rotulos';

interface ConfirmacaoProps {
  titulo: string;
  item: string;
  consequencia: string;
  excluindo: boolean;
  falha: Error | null;
  aoConfirmar: () => void;
  aoFechar: () => void;
}

/**
 * A exclusão é física e não tem desfazer (D8): um clique errado ao lado de Editar ou Reabrir não
 * pode apagar sozinho. O painel nomeia o item, diz o que se perde, e a recusa do servidor — o
 * registro já apagado em outra aba, a sessão que terminou — aparece aqui dentro.
 */
function Confirmacao({
  titulo,
  item,
  consequencia,
  excluindo,
  falha,
  aoConfirmar,
  aoFechar,
}: ConfirmacaoProps) {
  const idDoResumo = useId();
  return (
    <PainelModal aberto aoFechar={aoFechar} rotulo={titulo} podeFechar={!excluindo}>
      <Texto variante="titulo" como="h2">
        {titulo}
      </Texto>
      <Texto variante="corpo" como="p">
        {item}
      </Texto>
      <Texto variante="apoio" tom="suave" como="p">
        {consequencia}
      </Texto>
      <ResumoDoFormulario
        resumo={falha ? `Não foi possível excluir. ${falha.message}` : undefined}
        id={idDoResumo}
      />
      <div className={estilos.acoes}>
        <Botao variante="secundario" aoClicar={aoFechar} desabilitado={excluindo}>
          Cancelar
        </Botao>
        <Botao aoClicar={aoConfirmar} carregando={excluindo} descritoPor={idDoResumo}>
          {titulo}
        </Botao>
      </div>
    </PainelModal>
  );
}

function consequenciaDaExclusao(manutencao: ManutencaoResponse): string {
  return manutencao.status === 'CONCLUIDA'
    ? 'Ela sai do histórico de vez, e não há como desfazer. Se a conclusão foi engano, reabra-a em vez de excluir.'
    : 'Ela sai da agenda e do calendário de voos de vez, e não há como desfazer.';
}

export function ExclusaoDeManutencao({
  manutencao,
  aoFechar,
  aoExcluir,
}: {
  manutencao: ManutencaoResponse;
  aoFechar: () => void;
  aoExcluir: () => void;
}) {
  const excluir = useExcluirManutencao();
  return (
    <Confirmacao
      titulo="Excluir manutenção"
      item={nomeDaManutencao(manutencao)}
      consequencia={consequenciaDaExclusao(manutencao)}
      excluindo={excluir.isPending}
      falha={excluir.error}
      aoConfirmar={() =>
        manutencao.id != null && excluir.mutate(manutencao.id, { onSuccess: aoExcluir })
      }
      aoFechar={aoFechar}
    />
  );
}

export function ExclusaoDeParametro({
  parametro,
  aoFechar,
  aoExcluir,
}: {
  parametro: ParametroResponse;
  aoFechar: () => void;
  aoExcluir: () => void;
}) {
  const excluir = useExcluirParametro();
  return (
    <Confirmacao
      titulo="Excluir parâmetro"
      item={parametro.nome ?? 'Parâmetro de controle'}
      consequencia="O limite deixa de ser monitorado: some da tabela, da situação da aeronave e da Central de avisos. Não há como desfazer."
      excluindo={excluir.isPending}
      falha={excluir.error}
      aoConfirmar={() =>
        parametro.id != null && excluir.mutate(parametro.id, { onSuccess: aoExcluir })
      }
      aoFechar={aoFechar}
    />
  );
}
