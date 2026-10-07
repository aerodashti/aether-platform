import { somarMeses } from '@/compartilhado/formatacao/datas';
import {
  dataEntre,
  obrigatorio,
  primeiraFalha,
  tamanhoMaximo,
} from '@/compartilhado/formulario/regras';
import type { Erros } from '@/compartilhado/formulario/useValidacao';
import { erroDaParticipacao, erroDaSoma } from '@/compartilhado/participacoes/percentuais';

import {
  motoresEscolhidos,
  type RascunhoDaNovaAeronave,
  type VinculoDoCadastro,
} from './rascunhoDaNovaAeronave';
import {
  ateOPesoDeDecolagem,
  CICLOS,
  CODIGO_ICAO,
  HORAS,
  MATRICULA,
  PESO,
  QUILOMETROS,
  SALDO,
  VALOR_DO_APORTE,
} from './regrasDaAeronave';

/** O percentual de cada vínculo, com o nome que o contrato usa no JSON. */
export type CampoDaParticipacao = `participacoes[${number}].percentual`;

/** O rótulo de cada campo fixo: a tela e o resumo de erros leem o mesmo nome. */
export const ROTULOS_DA_NOVA_AERONAVE = {
  matricula: 'Matrícula',
  fabricante: 'Fabricante',
  modelo: 'Modelo',
  numeroDeSerie: 'Nº de série',
  base: 'Base (ICAO)',
  hangar: 'Hangar',
  apoliceDoSeguro: 'Apólice do seguro',
  vencimentoReta: 'Vigência do seguro (vencimento)',
  vencimentoCva: 'Vencimento do CVA',
  pesoMaxDecolagemKg: 'Peso máx. de decolagem (kg)',
  pesoMaxPousoKg: 'Peso máx. de pouso (kg)',
  horasDeCelula: 'Horas de célula (h)',
  ciclos: 'Ciclos (pousos)',
  kmVoados: 'Quilômetros voados (km)',
  horasApu: 'Horas de APU (h)',
  horasMotor1: 'Motor 1 (h)',
  horasMotor2: 'Motor 2 (h)',
  horasMotor3: 'Motor 3 (h)',
  baseDoRateio: 'Base do rateio',
  modeloDeAporte: 'Modelo de aporte',
  periodicidadeDoAporteMeses: 'Aporte a cada quantos meses',
  valorDoAporte: 'Valor de cada aporte (R$)',
  diaDeFechamento: 'Dia de fechamento da fatura',
  saldoDeAbertura: 'Saldo atual do fundo (R$)',
};

export type CampoDoCadastro = keyof typeof ROTULOS_DA_NOVA_AERONAVE;

export type CampoDaNovaAeronave = CampoDoCadastro | CampoDaParticipacao | 'participacoes';

export function campoDaParticipacao(indice: number): CampoDaParticipacao {
  return `participacoes[${indice}].percentual`;
}

export function rotuloDaParticipacao(nome: string): string {
  return `Participação de ${nome} (%)`;
}

/** Antes de 2000 é ano digitado errado; depois da validade máxima, também. */
const PRIMEIRO_VENCIMENTO = '2000-01-01';

/** As janelas dos vencimentos: o CVA vale 12 meses (+1 de tolerância) e a apólice até 5 anos. */
export function limitesDosVencimentos(hoje: string) {
  return {
    minimo: PRIMEIRO_VENCIMENTO,
    maximoDoCva: somarMeses(hoje, 13),
    maximoDoSeguro: somarMeses(hoje, 60),
  };
}

/** As regras do contrato, as mesmas da edição dele; sem vínculo nenhum, não há soma a cobrar. */
function validarParticipacoes(
  vinculos: VinculoDoCadastro[],
): Erros<CampoDaParticipacao | 'participacoes'> {
  const erros: Erros<CampoDaParticipacao | 'participacoes'> = {};
  vinculos.forEach((vinculo, indice) => {
    erros[campoDaParticipacao(indice)] = erroDaParticipacao(vinculo.percentual);
  });
  if (vinculos.length > 0) {
    erros.participacoes = erroDaSoma(
      vinculos.map((vinculo) => vinculo.percentual),
      '',
    );
  }
  return erros;
}

function validarMotores(rascunho: RascunhoDaNovaAeronave): Erros<CampoDoCadastro> {
  return Object.fromEntries(
    motoresEscolhidos(rascunho).map((campo, indice) => [
      campo,
      primeiraFalha(
        rascunho[campo],
        obrigatorio(`Informe as horas do motor ${indice + 1} (0 se for novo).`),
        ...HORAS,
      ),
    ]),
  );
}

/**
 * Os problemas do cadastro agora — as mesmas regras do `CriarAeronaveRequest`, do contrato e das
 * regras da aeronave no servidor, ditas antes da ida e volta. `hoje` vem de fora para a regra ser
 * pura.
 */
export function validarNovaAeronave(
  rascunho: RascunhoDaNovaAeronave,
  hoje: string,
): Erros<CampoDaNovaAeronave> {
  const limites = limitesDosVencimentos(hoje);
  const aporteFixo = rascunho.modeloDeAporte === 'FIXO';
  return {
    matricula: primeiraFalha(rascunho.matricula, obrigatorio('Informe a matrícula.'), MATRICULA),
    fabricante: primeiraFalha(rascunho.fabricante, tamanhoMaximo(80)),
    modelo: primeiraFalha(rascunho.modelo, obrigatorio('Informe o modelo.'), tamanhoMaximo(120)),
    numeroDeSerie: primeiraFalha(rascunho.numeroDeSerie, tamanhoMaximo(40)),
    base: primeiraFalha(rascunho.base, obrigatorio('Informe a base.'), CODIGO_ICAO),
    hangar: primeiraFalha(rascunho.hangar, tamanhoMaximo(60)),
    apoliceDoSeguro: primeiraFalha(rascunho.apoliceDoSeguro, tamanhoMaximo(40)),
    vencimentoReta: primeiraFalha(
      rascunho.vencimentoReta,
      obrigatorio('Informe a vigência do seguro.'),
      dataEntre({ minimo: limites.minimo, maximo: limites.maximoDoSeguro }),
    ),
    vencimentoCva: primeiraFalha(
      rascunho.vencimentoCva,
      obrigatorio('Informe o vencimento do CVA.'),
      dataEntre({ minimo: limites.minimo, maximo: limites.maximoDoCva }),
    ),
    pesoMaxDecolagemKg: primeiraFalha(rascunho.pesoMaxDecolagemKg, PESO),
    pesoMaxPousoKg: primeiraFalha(
      rascunho.pesoMaxPousoKg,
      PESO,
      ateOPesoDeDecolagem(rascunho.pesoMaxDecolagemKg),
    ),
    horasDeCelula: primeiraFalha(
      rascunho.horasDeCelula,
      obrigatorio('Informe as horas de célula.'),
      ...HORAS,
    ),
    ciclos: primeiraFalha(rascunho.ciclos, obrigatorio('Informe os ciclos (pousos).'), CICLOS),
    kmVoados: primeiraFalha(
      rascunho.kmVoados,
      obrigatorio('Informe os quilômetros voados.'),
      QUILOMETROS,
    ),
    horasApu: primeiraFalha(rascunho.horasApu, ...HORAS),
    ...validarMotores(rascunho),
    valorDoAporte: aporteFixo
      ? primeiraFalha(
          rascunho.valorDoAporte,
          obrigatorio('Informe o valor de cada aporte.'),
          VALOR_DO_APORTE,
        )
      : undefined,
    saldoDeAbertura: primeiraFalha(
      rascunho.saldoDeAbertura,
      obrigatorio('Informe o saldo atual do fundo.'),
      SALDO,
    ),
    ...validarParticipacoes(rascunho.vinculos),
  };
}

/** Os rótulos na ordem da tela — é a ordem em que o resumo lista o que falta. */
export function rotulosDaNovaAeronave(
  rascunho: RascunhoDaNovaAeronave,
): Record<CampoDaNovaAeronave, string> {
  const participacoes = rascunho.vinculos.map((vinculo, indice) => [
    campoDaParticipacao(indice),
    rotuloDaParticipacao(vinculo.nome),
  ]);
  return {
    ...ROTULOS_DA_NOVA_AERONAVE,
    ...Object.fromEntries(participacoes),
    participacoes: 'Soma das participações',
  } as Record<CampoDaNovaAeronave, string>;
}

/** Os valores de agora, por campo: o erro do servidor some quando o valor do campo muda. */
export function valoresDaNovaAeronave(
  rascunho: RascunhoDaNovaAeronave,
): Record<CampoDaNovaAeronave, unknown> {
  const { vinculos, ...campos } = rascunho;
  const participacoes = vinculos.map((vinculo, indice) => [
    campoDaParticipacao(indice),
    vinculo.percentual,
  ]);
  return {
    ...campos,
    ...Object.fromEntries(participacoes),
    participacoes: vinculos.map((v) => `${v.proprietarioId}:${v.percentual}`).join('|'),
  } as Record<CampoDaNovaAeronave, unknown>;
}

/**
 * O `campos` de um 400 do cadastro traz o caminho do JSON ("contadores.horasDeCelula",
 * "configuracaoFinanceira.diaDeFechamento"); no formulário o campo é a folha.
 */
export function campoDoServidor(rotulos: Record<CampoDaNovaAeronave, string>) {
  return (nome: string): CampoDaNovaAeronave | undefined => {
    const folha = nome.replace(/^(contadores|configuracaoFinanceira)\./, '');
    return folha in rotulos ? (folha as CampoDaNovaAeronave) : undefined;
  };
}
