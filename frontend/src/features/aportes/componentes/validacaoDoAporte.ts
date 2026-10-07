import { somarMesesNaCompetencia } from '@/compartilhado/formatacao/datas';
import { obrigatorio, primeiraFalha, type Regra } from '@/compartilhado/formulario/regras';
import type { Erros } from '@/compartilhado/formulario/useValidacao';

import type { SituacaoDosDonos } from './donosDoAporte';
import type { RascunhoDoAporte } from './rascunhoDoAporte';
import { dataDoCredito, valorEmReais } from './regrasDoFundo';

export type CampoDoAporte = keyof RascunhoDoAporte;

/** Na ordem da tela: é a ordem em que o resumo os lista. */
export const ROTULOS_DO_APORTE: Record<CampoDoAporte, string> = {
  aeronaveId: 'Aeronave',
  proprietarioId: 'Proprietário',
  data: 'Data do crédito',
  competencia: 'Competência',
  valor: 'Valor (R$)',
};

/** Antes disso é ano digitado errado — o `Aporte.PRIMEIRA_COMPETENCIA` do servidor. */
export const PRIMEIRA_COMPETENCIA = '2000-01';

/** O aporte anual antecipado chega a um ano à frente da competência corrente; além disso, não. */
const MESES_DE_ANTECEDENCIA = 12;

export function ultimaCompetencia(hoje: string): string {
  return somarMesesNaCompetencia(hoje.slice(0, 7), MESES_DE_ANTECEDENCIA);
}

export interface ContextoDoAporte {
  /** Hoje, no fuso de quem usa (`hojeLocal()`). */
  hoje: string;
  donos: SituacaoDosDonos;
}

const FALTA_DO_PROPRIETARIO: Record<SituacaoDosDonos, string> = {
  carregando: 'Aguarde a lista de proprietários carregar.',
  falhou: 'A lista de proprietários não carregou: tente de novo.',
  semContrato: 'A aeronave não tem contrato vigente: cadastre o contrato antes do aporte.',
  pronta: 'Escolha o proprietário.',
};

/** "AAAA-MM", com mês de 01 a 12 — onde o campo de mês não existe, ele é texto livre. */
const FORMATO_DE_COMPETENCIA = /^\d{4}-(0[1-9]|1[0-2])$/;

/** "2026-10" → "10/2026", como a pessoa lê o mês. */
function mesEmTexto(competencia: string): string {
  const [ano, mes] = competencia.split('-');
  return `${mes}/${ano}`;
}

/** Competência no formato do campo e dentro da faixa — as competências se comparam como texto. */
function competenciaEntre(minimo: string, maximo: string): Regra {
  return (texto) => {
    const competencia = texto.trim();
    if (competencia === '') {
      return undefined;
    }
    if (!FORMATO_DE_COMPETENCIA.test(competencia)) {
      return 'Use o formato AAAA-MM, como 2026-09.';
    }
    return competencia < minimo || competencia > maximo
      ? `Use uma competência de ${mesEmTexto(minimo)} até ${mesEmTexto(maximo)}.`
      : undefined;
  };
}

/** Os limites do `AporteRequest`, das colunas e da entidade, ditos no campo antes do servidor. */
export function validarAporte(
  rascunho: RascunhoDoAporte,
  { hoje, donos }: ContextoDoAporte,
): Erros<CampoDoAporte> {
  return {
    aeronaveId: primeiraFalha(rascunho.aeronaveId, obrigatorio('Escolha a aeronave.')),
    // Sem aeronave, a seleção do proprietário nem abre: o que falta é a aeronave.
    proprietarioId:
      rascunho.aeronaveId === ''
        ? undefined
        : primeiraFalha(rascunho.proprietarioId, obrigatorio(FALTA_DO_PROPRIETARIO[donos])),
    data: primeiraFalha(
      rascunho.data,
      obrigatorio('Informe a data do crédito.'),
      dataDoCredito(hoje, 'O aporte é registrado como recebido: use uma data até hoje.'),
    ),
    competencia: primeiraFalha(
      rascunho.competencia,
      obrigatorio('Informe a competência.'),
      competenciaEntre(PRIMEIRA_COMPETENCIA, ultimaCompetencia(hoje)),
    ),
    valor: primeiraFalha(rascunho.valor, obrigatorio('Informe o valor.'), valorEmReais),
  };
}
