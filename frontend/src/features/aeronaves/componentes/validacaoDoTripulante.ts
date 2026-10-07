import { somarMeses } from '@/compartilhado/formatacao/datas';
import {
  dataEntre,
  email,
  numero,
  obrigatorio,
  primeiraFalha,
  tamanhoMaximo,
  telefone,
  type Regra,
} from '@/compartilhado/formulario/regras';
import type { Erros } from '@/compartilhado/formulario/useValidacao';

import type { CampoDeValidade, RascunhoDoTripulante } from './rascunhoDoTripulante';

export type CampoDoTripulante = Exclude<keyof RascunhoDoTripulante, 'datasIncompletas'>;

/** O nome de cada campo como a pessoa o lê — o rótulo no painel e o resumo do que falta. */
export const ROTULOS_DO_TRIPULANTE: Record<CampoDoTripulante, string> = {
  nome: 'Nome completo',
  canac: 'Código ANAC (CANAC)',
  funcao: 'Função na aeronave',
  validadeCma: 'Validade do CMA',
  validadeCht: 'Validade da habilitação (CHT)',
  horasTotais: 'Horas totais de voo (h)',
  telefone: 'Telefone',
  email: 'E-mail',
  situacao: 'Situação',
};

/** Os limites do `TripulanteRequest` e do `Tripulante.aceitaValidade` no backend. */
export const PRIMEIRA_VALIDADE = '2000-01-01';
const MESES_DE_VALIDADE_A_FRENTE = 5 * 12;
const HORAS_MAXIMAS = 60_000;

export function ultimaValidade(hoje: string): string {
  return somarMeses(hoje, MESES_DE_VALIDADE_A_FRENTE);
}

/** A mesma expressão de `FormatoDoCanac`: seis dígitos, com ponto, hífen ou espaço entre eles. */
const FORMATO_DO_CANAC = /^[ .-]*(?:\d[ .-]*){6}$/;

const canac: Regra = (texto) =>
  texto.trim() === '' || FORMATO_DO_CANAC.test(texto.trim())
    ? undefined
    : 'O CANAC tem 6 dígitos, como 123456.';

function erroDaValidade(
  rascunho: RascunhoDoTripulante,
  campo: CampoDeValidade,
  hoje: string,
): string | undefined {
  if (rascunho.datasIncompletas[campo]) {
    return 'Data incompleta ou inexistente: complete-a ou apague o campo.';
  }
  return primeiraFalha(
    rascunho[campo],
    dataEntre({ minimo: PRIMEIRA_VALIDADE, maximo: ultimaValidade(hoje) }),
  );
}

/** O que impede salvar o tripulante agora, campo a campo. `hoje` é a data local de quem preenche. */
export function validarTripulante(
  rascunho: RascunhoDoTripulante,
  hoje: string,
): Erros<CampoDoTripulante> {
  return {
    nome: primeiraFalha(
      rascunho.nome,
      obrigatorio('Informe o nome do tripulante.'),
      tamanhoMaximo(120),
    ),
    canac: canac(rascunho.canac),
    validadeCma: erroDaValidade(rascunho, 'validadeCma', hoje),
    validadeCht: erroDaValidade(rascunho, 'validadeCht', hoje),
    horasTotais: primeiraFalha(
      rascunho.horasTotais,
      numero({ minimo: 0, maximo: HORAS_MAXIMAS, casas: 1 }),
    ),
    telefone: telefone()(rascunho.telefone),
    email: primeiraFalha(rascunho.email, tamanhoMaximo(180), email()),
  };
}
