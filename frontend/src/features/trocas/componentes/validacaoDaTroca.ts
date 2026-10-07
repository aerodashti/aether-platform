import { casasDecimais } from '@/compartilhado/formatacao/numero';
import {
  dataEntre,
  numero,
  obrigatorio,
  primeiraFalha,
  tamanhoMaximo,
  type Regra,
} from '@/compartilhado/formulario/regras';
import type { Erros } from '@/compartilhado/formulario/useValidacao';

import type { SituacaoDaLista } from './opcoesDaTroca';
import type { RascunhoDaTroca } from './rascunhoDaTroca';
import { dataCompleta } from './rotulos';

export type CampoDaTroca = keyof RascunhoDaTroca;

/** Na ordem da tela: é a ordem em que o resumo os lista. */
export const ROTULOS_DA_TROCA: Record<CampoDaTroca, string> = {
  aeronaveId: 'Aeronave',
  data: 'Data',
  cedenteId: 'Cedeu',
  recebedorId: 'Recebeu',
  horas: 'Horas voadas',
  km: 'KM voados',
  valorPorHora: 'R$ por hora',
  relatorioDeVoo: 'Rel. Voo',
  observacao: 'Observação',
};

/** Antes disso é ano digitado errado — o mesmo limite de `TrocaDeKm`. */
export const PRIMEIRA_DATA_DA_TROCA = '2000-01-01';
/** Acima disso é dígito a mais, não hora cedida (D6) — o `@DecimalMax` do `TrocaRequest`. */
export const HORAS_MAXIMAS = 1000;
/** O teto de `NUMERIC(10,1)`, a coluna do KM. */
export const KM_MAXIMO = 999_999_999.9;
/** O teto de `NUMERIC(12,2)`, a coluna do R$/hora. */
export const VALOR_POR_HORA_MAXIMO = 9_999_999_999.99;

export interface ContextoDaTroca {
  /** Hoje, no fuso de quem usa (`hojeLocal()`). */
  hoje: string;
  /** Na correção de uma troca concluída: a troca não pode ser depois da devolução. */
  concluidaEm?: string;
  /** Quantos proprietários a aeronave escolhida oferece: com menos de dois, não há troca. */
  proprietariosDisponiveis: number;
  /** Proprietários e vínculos: sem eles, Cedeu e Recebeu não têm o que oferecer. */
  proprietarios: SituacaoDaLista;
}

const LISTA_INDISPONIVEL: Record<SituacaoDaLista, string | undefined> = {
  carregando: 'Aguarde a lista de proprietários carregar.',
  falhou: 'A lista de proprietários não carregou: tente de novo antes de salvar.',
  pronta: undefined,
};

const SEM_DOIS_PROPRIETARIOS =
  'Esta aeronave não tem dois proprietários no contrato vigente: cadastre o contrato antes de registrar a troca.';

/** A coluna guarda uma casa; a regra comum diria "1 casas", e na hora vale lembrar o que é 2h30. */
function umaCasaDecimal(mensagem: string): Regra {
  return (texto) => (casasDecimais(texto) > 1 ? mensagem : undefined);
}

/** A última data aceita: hoje, ou a devolução, se a troca já foi devolvida antes de hoje. */
export function ultimaDataDaTroca(hoje: string, concluidaEm?: string): string {
  return concluidaEm !== undefined && concluidaEm < hoje ? concluidaEm : hoje;
}

function erroDaData(data: string, { hoje, concluidaEm }: ContextoDaTroca): string | undefined {
  const maximo = ultimaDataDaTroca(hoje, concluidaEm);
  const mensagemDeMaximo =
    maximo === hoje
      ? 'A troca registra horas já voadas: a data não pode ser futura.'
      : `A devolução foi registrada em ${dataCompleta(maximo)}: a troca não pode ser depois dela.`;
  return primeiraFalha(
    data,
    obrigatorio('Informe a data da troca.'),
    dataEntre({ minimo: PRIMEIRA_DATA_DA_TROCA, maximo, mensagemDeMaximo }),
  );
}

function erroDoProprietario(
  id: string,
  mensagemDeFalta: string,
  { proprietarios }: ContextoDaTroca,
): string | undefined {
  return id === '' ? (LISTA_INDISPONIVEL[proprietarios] ?? mensagemDeFalta) : undefined;
}

/** Com a aeronave escolhida e as listas carregadas, menos de dois donos é beco sem saída. */
function semDoisProprietarios(rascunho: RascunhoDaTroca, contexto: ContextoDaTroca): boolean {
  return (
    rascunho.aeronaveId !== '' &&
    contexto.proprietarios === 'pronta' &&
    contexto.proprietariosDisponiveis < 2
  );
}

function erroDoRecebedor(rascunho: RascunhoDaTroca, contexto: ContextoDaTroca): string | undefined {
  const mesmoProprietario =
    rascunho.recebedorId !== '' && rascunho.recebedorId === rascunho.cedenteId;
  return (
    erroDoProprietario(rascunho.recebedorId, 'Escolha quem recebeu as horas.', contexto) ??
    (mesmoProprietario ? 'Quem recebe precisa ser outro proprietário, não quem cedeu.' : undefined)
  );
}

/** Os limites do `TrocaRequest` e das colunas, ditos no campo antes da ida ao servidor. */
export function validarTroca(
  rascunho: RascunhoDaTroca,
  contexto: ContextoDaTroca,
): Erros<CampoDaTroca> {
  const semTroca = semDoisProprietarios(rascunho, contexto);
  return {
    aeronaveId:
      rascunho.aeronaveId === ''
        ? 'Escolha a aeronave.'
        : semTroca
          ? SEM_DOIS_PROPRIETARIOS
          : undefined,
    data: erroDaData(rascunho.data, contexto),
    cedenteId: semTroca
      ? undefined
      : erroDoProprietario(rascunho.cedenteId, 'Escolha quem cedeu as horas.', contexto),
    recebedorId: semTroca ? undefined : erroDoRecebedor(rascunho, contexto),
    horas: primeiraFalha(
      rascunho.horas,
      obrigatorio('Informe as horas voadas.'),
      umaCasaDecimal('Use no máximo uma casa decimal, em décimos de hora: 2h30 é 2,5.'),
      numero({ maiorQue: 0, maximo: HORAS_MAXIMAS }),
    ),
    km: primeiraFalha(
      rascunho.km,
      umaCasaDecimal('Use no máximo uma casa decimal.'),
      numero({ minimo: 0, maximo: KM_MAXIMO }),
    ),
    valorPorHora: primeiraFalha(
      rascunho.valorPorHora,
      numero({ maiorQue: 0, maximo: VALOR_POR_HORA_MAXIMO, casas: 2 }),
    ),
    relatorioDeVoo: primeiraFalha(rascunho.relatorioDeVoo, tamanhoMaximo(20)),
    observacao: primeiraFalha(rascunho.observacao, tamanhoMaximo(300)),
  };
}
