import {
  dataEntre,
  numero,
  obrigatorio,
  primeiraFalha,
  tamanhoMaximo,
  type Regra,
} from '@/compartilhado/formulario/regras';
import type { Erros } from '@/compartilhado/formulario/useValidacao';

import {
  anoDeQuatroDigitos,
  primeiraDataProgramavel,
  ultimaDataProgramavel,
} from './datasDaManutencao';
import type { RascunhoDaManutencao } from './rascunhoDaManutencao';

export type CampoDaManutencao = keyof RascunhoDaManutencao;

/** Na ordem da tela: é a ordem em que o resumo os lista. */
export const ROTULOS_DA_MANUTENCAO: Record<CampoDaManutencao, string> = {
  data: 'Data',
  hora: 'Horário',
  responsavel: 'Responsável',
  descricao: 'Descrição',
  valor: 'Valor',
};

/** O teto de `NUMERIC(14,2)`, a coluna do valor — o `@Digits` do `ManutencaoRequest`. */
export const VALOR_MAXIMO = 999_999_999_999.99;

export interface ContextoDaManutencao {
  /** Hoje, no fuso de quem usa (`hojeLocal()`). */
  hoje: string;
  /** Na correção, a data gravada: a janela vale só para uma data nova, como no servidor. */
  dataGravada?: string;
  /** O horário digitado pela metade, que o campo nativo entrega vazio. */
  horaIncompleta: boolean;
}

function erroDaData(data: string, { hoje, dataGravada }: ContextoDaManutencao) {
  // Corrigir a descrição de uma manutenção antiga não obriga a mudar a data dela.
  const janela: Regra =
    data === dataGravada
      ? () => undefined
      : dataEntre({ minimo: primeiraDataProgramavel(hoje), maximo: ultimaDataProgramavel(hoje) });
  return primeiraFalha(data, obrigatorio('Informe a data.'), anoDeQuatroDigitos, janela);
}

/** As regras do `ManutencaoRequest` e da janela de `Manutencao`, ditas no campo. */
export function validarManutencao(
  rascunho: RascunhoDaManutencao,
  contexto: ContextoDaManutencao,
): Erros<CampoDaManutencao> {
  return {
    data: erroDaData(rascunho.data, contexto),
    hora: contexto.horaIncompleta ? 'Complete o horário ou apague-o: ele é opcional.' : undefined,
    responsavel: tamanhoMaximo(120)(rascunho.responsavel),
    descricao: primeiraFalha(
      rascunho.descricao,
      obrigatorio('Informe a descrição.'),
      tamanhoMaximo(200),
    ),
    valor: numero({ maiorQue: 0, maximo: VALOR_MAXIMO, casas: 2 })(rascunho.valor),
  };
}
