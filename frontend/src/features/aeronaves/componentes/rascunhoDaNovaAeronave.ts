import { lerNumero } from '@/compartilhado/formatacao/numero';
import type { ProprietarioResponse } from '@/compartilhado/proprietarios/useProprietarios';
import type { CorDeIdentificacao } from '@/design-system/primitivos/SeletorDeCor';

import type { DefinirContratoRequest } from '../api/useContratos';
import type {
  BaseDoRateio,
  CriarAeronaveRequest,
  ModeloDeAporte,
} from '../api/useDetalheDaAeronave';

export interface VinculoDoCadastro {
  proprietarioId: number;
  nome: string;
  cor: CorDeIdentificacao;
  percentual: string;
}

export type QuantidadeDeMotores = '1' | '2' | '3';

/**
 * O que a tela "Nova aeronave" tem preenchido, como texto de campo. Os nomes são os do JSON do
 * cadastro, para o `campos` de um 400 cair no campo certo.
 */
export interface RascunhoDaNovaAeronave {
  matricula: string;
  fabricante: string;
  modelo: string;
  numeroDeSerie: string;
  base: string;
  hangar: string;
  apoliceDoSeguro: string;
  vencimentoReta: string;
  vencimentoCva: string;
  pesoMaxDecolagemKg: string;
  pesoMaxPousoKg: string;
  horasDeCelula: string;
  ciclos: string;
  kmVoados: string;
  horasApu: string;
  quantidadeDeMotores: QuantidadeDeMotores;
  horasMotor1: string;
  horasMotor2: string;
  horasMotor3: string;
  baseDoRateio: BaseDoRateio;
  modeloDeAporte: ModeloDeAporte;
  periodicidadeDoAporteMeses: string;
  valorDoAporte: string;
  diaDeFechamento: string;
  saldoDeAbertura: string;
  vinculos: VinculoDoCadastro[];
}

export const RASCUNHO_INICIAL: RascunhoDaNovaAeronave = {
  matricula: '',
  fabricante: '',
  modelo: '',
  numeroDeSerie: '',
  base: '',
  hangar: '',
  apoliceDoSeguro: '',
  vencimentoReta: '',
  vencimentoCva: '',
  pesoMaxDecolagemKg: '',
  pesoMaxPousoKg: '',
  horasDeCelula: '',
  ciclos: '',
  kmVoados: '',
  horasApu: '',
  quantidadeDeMotores: '2',
  horasMotor1: '',
  horasMotor2: '',
  horasMotor3: '',
  baseDoRateio: 'POR_USO',
  modeloDeAporte: 'FIXO',
  periodicidadeDoAporteMeses: '1',
  valorDoAporte: '',
  diaDeFechamento: '1',
  saldoDeAbertura: '',
  vinculos: [],
};

/** Há o que perder ao sair: alguém já mexeu em algum campo. */
export function foiAlterado(rascunho: RascunhoDaNovaAeronave): boolean {
  return JSON.stringify(rascunho) !== JSON.stringify(RASCUNHO_INICIAL);
}

const MOTORES = ['horasMotor1', 'horasMotor2', 'horasMotor3'] as const;

export type CampoDeMotor = (typeof MOTORES)[number];

/** Os campos de horas dos motores que a aeronave tem, na ordem: o 1, o 2 e o 3. */
export function motoresEscolhidos(rascunho: RascunhoDaNovaAeronave): CampoDeMotor[] {
  return MOTORES.slice(0, Number(rascunho.quantidadeDeMotores));
}

/** O proprietário entra no fim da lista, com o percentual por preencher. */
export function comVinculo(
  vinculos: VinculoDoCadastro[],
  dono: ProprietarioResponse,
): VinculoDoCadastro[] {
  return [
    ...vinculos,
    {
      proprietarioId: dono.id ?? 0,
      nome: dono.nome ?? '',
      cor: (dono.corDeIdentificacao ?? 'CINZA') as CorDeIdentificacao,
      percentual: '',
    },
  ];
}

function textoOuAusente(texto: string): string | undefined {
  const limpo = texto.trim();
  return limpo === '' ? undefined : limpo;
}

function numeroOuAusente(texto: string): number | undefined {
  return lerNumero(texto) ?? undefined;
}

/**
 * O número de um campo que a validação já aprovou. Ilegível aqui é defeito de quem chamou antes de
 * validar — e nunca vai ao servidor como `NaN`, que o JSON transformaria em `null` calado.
 */
function numeroAprovado(texto: string): number {
  const valor = lerNumero(texto);
  if (valor === null) {
    throw new Error('O cadastro só é montado depois de validado.');
  }
  return valor;
}

/**
 * O corpo do `POST /aeronaves`. Só depois de `validarNovaAeronave` passar: o opcional vazio vai
 * ausente, e não como texto vazio; motor que a aeronave não tem e valor de aporte proporcional não
 * vão.
 */
export function paraCadastro(rascunho: RascunhoDaNovaAeronave): CriarAeronaveRequest {
  const motores = motoresEscolhidos(rascunho);
  const horasDoMotor = (campo: CampoDeMotor) =>
    motores.includes(campo) ? numeroAprovado(rascunho[campo]) : undefined;

  return {
    matricula: rascunho.matricula.trim().toUpperCase(),
    fabricante: textoOuAusente(rascunho.fabricante),
    modelo: rascunho.modelo.trim(),
    numeroDeSerie: textoOuAusente(rascunho.numeroDeSerie),
    base: rascunho.base.trim().toUpperCase(),
    hangar: textoOuAusente(rascunho.hangar),
    apoliceDoSeguro: textoOuAusente(rascunho.apoliceDoSeguro),
    pesoMaxDecolagemKg: numeroOuAusente(rascunho.pesoMaxDecolagemKg),
    pesoMaxPousoKg: numeroOuAusente(rascunho.pesoMaxPousoKg),
    vencimentoCva: rascunho.vencimentoCva,
    vencimentoReta: rascunho.vencimentoReta,
    contadores: {
      horasDeCelula: numeroAprovado(rascunho.horasDeCelula),
      ciclos: numeroAprovado(rascunho.ciclos),
      kmVoados: numeroAprovado(rascunho.kmVoados),
      horasMotor1: horasDoMotor('horasMotor1'),
      horasMotor2: horasDoMotor('horasMotor2'),
      horasMotor3: horasDoMotor('horasMotor3'),
      horasApu: numeroOuAusente(rascunho.horasApu),
    },
    configuracaoFinanceira: {
      baseDoRateio: rascunho.baseDoRateio,
      modeloDeAporte: rascunho.modeloDeAporte,
      periodicidadeDoAporteMeses: Number(rascunho.periodicidadeDoAporteMeses),
      valorDoAporte:
        rascunho.modeloDeAporte === 'FIXO' ? numeroOuAusente(rascunho.valorDoAporte) : undefined,
      diaDeFechamento: Number(rascunho.diaDeFechamento),
      saldoDeAbertura: numeroAprovado(rascunho.saldoDeAbertura),
    },
  };
}

/** O corpo do contrato, o segundo ato do cadastro, na rota dele. */
export function paraContrato(rascunho: RascunhoDaNovaAeronave): DefinirContratoRequest {
  return {
    participacoes: rascunho.vinculos.map((vinculo) => ({
      proprietarioId: vinculo.proprietarioId,
      percentual: numeroAprovado(vinculo.percentual),
    })),
  };
}
