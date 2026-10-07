import { obrigatorio, primeiraFalha } from '@/compartilhado/formulario/regras';
import type { Erros } from '@/compartilhado/formulario/useValidacao';
import {
  competenciaEntre,
  janelaDeCompetencias,
  type JanelaDeCompetencias,
} from '@/compartilhado/recorte/competencia';

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

/**
 * As competências que o aporte aceita: a mesma janela dos recortes do fundo, de 01/2000 até um ano
 * à frente da corrente — o aporte anual antecipado.
 */
export function janelaDoAporte(hoje: string): JanelaDeCompetencias {
  return janelaDeCompetencias(hoje.slice(0, 7));
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
      competenciaEntre(janelaDoAporte(hoje)),
    ),
    valor: primeiraFalha(rascunho.valor, obrigatorio('Informe o valor.'), valorEmReais),
  };
}
