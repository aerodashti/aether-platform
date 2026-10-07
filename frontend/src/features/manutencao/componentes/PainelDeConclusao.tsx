import { useId, useState } from 'react';

import { hojeLocal } from '@/compartilhado/formatacao/datas';
import { Formulario } from '@/compartilhado/formulario/Formulario';
import { ResumoDoFormulario } from '@/compartilhado/formulario/ResumoDoFormulario';
import { useValidacao } from '@/compartilhado/formulario/useValidacao';
import { Botao } from '@/design-system/primitivos/Botao';
import { CampoDeTexto } from '@/design-system/primitivos/CampoDeTexto';
import { PainelModal } from '@/design-system/primitivos/PainelModal';
import { Texto } from '@/design-system/primitivos/Texto';

import { useConcluirManutencao, type ManutencaoResponse } from '../api/useManutencao';

import { primeiraDataDeConclusao } from './datasDaManutencao';
import estilos from './Painel.module.css';
import { dataCompleta } from './rotulos';
import { ROTULOS_DA_CONCLUSAO, validarConclusao } from './validacaoDaConclusao';

interface PainelDeConclusaoProps {
  manutencao: ManutencaoResponse;
  aoFechar: () => void;
  /** Depois que o servidor registrou a conclusão, com o dia informado. */
  aoConcluir: (concluidaEm: string) => void;
}

const TITULO = 'Concluir manutenção';

function apoioDaConclusao(minimo: string, hoje: string): string {
  return minimo > hoje
    ? `Só se conclui a partir de ${dataCompleta(minimo)}. Se ela já foi feita, corrija antes a data programada.`
    : `Entre ${dataCompleta(minimo)} e hoje.`;
}

/**
 * Concluir registra o dia em que a manutenção foi feita (D9): quem registra dias depois não fica
 * com a data do clique, e a conclusão de uma programada para o futuro não entra no histórico com
 * data futura. Padrão hoje, nunca no futuro nem mais de um ano antes da data programada.
 */
export function PainelDeConclusao({ manutencao, aoFechar, aoConcluir }: PainelDeConclusaoProps) {
  const idDoResumo = useId();
  const hoje = hojeLocal();
  const dataProgramada = manutencao.data ?? hoje;
  const minimo = primeiraDataDeConclusao(dataProgramada);
  const [concluidaEm, setConcluidaEm] = useState(hoje);
  const concluir = useConcluirManutencao();
  const rascunho = { concluidaEm };
  const validacao = useValidacao({
    erros: validarConclusao(rascunho, { hoje, dataProgramada }),
    valores: rascunho,
    rotulos: ROTULOS_DA_CONCLUSAO,
    falha: concluir.error,
  });

  function salvar() {
    if (manutencao.id != null) {
      concluir.mutate(
        { id: manutencao.id, conclusao: rascunho },
        { onSuccess: () => aoConcluir(concluidaEm) },
      );
    }
  }

  return (
    <PainelModal aberto aoFechar={aoFechar} rotulo={TITULO} podeFechar={!concluir.isPending}>
      <Formulario referencia={validacao.refDoFormulario} aoEnviar={() => validacao.enviar(salvar)}>
        <Texto variante="titulo" como="h2">
          {TITULO}
        </Texto>
        <Texto variante="corpo" como="p">
          {manutencao.descricao}, programada para {dataCompleta(manutencao.data)}. Ela sai da agenda
          e entra no histórico com o dia em que foi feita.
        </Texto>
        <Texto variante="apoio" tom="suave" como="p">
          Valor e responsável ficam como estão: para mudá-los, corrija a manutenção antes de
          concluir.
        </Texto>

        <div className={estilos.campos}>
          <CampoDeTexto
            rotulo="Data da conclusão"
            tipo="data"
            obrigatorio
            valor={concluidaEm}
            aoMudar={setConcluidaEm}
            minimo={minimo}
            maximo={hoje}
            apoio={apoioDaConclusao(minimo, hoje)}
            erro={validacao.erroDe('concluidaEm')}
          />
        </div>

        <ResumoDoFormulario resumo={validacao.resumo} id={idDoResumo} />
        <div className={estilos.acoes}>
          <Botao variante="secundario" aoClicar={aoFechar} desabilitado={concluir.isPending}>
            Cancelar
          </Botao>
          <Botao
            tom="positivo"
            tipo="submit"
            carregando={concluir.isPending}
            descritoPor={idDoResumo}
          >
            Concluir manutenção
          </Botao>
        </div>
      </Formulario>
    </PainelModal>
  );
}
