import { describe, expect, it } from 'vitest';

import { RASCUNHO_INICIAL, type RascunhoDaNovaAeronave } from './rascunhoDaNovaAeronave';
import {
  campoDoServidor,
  rotulosDaNovaAeronave,
  situacaoDaSoma,
  validarNovaAeronave,
  valoresDaNovaAeronave,
} from './validacaoDaNovaAeronave';

const HOJE = '2026-10-07';

const VALIDO: RascunhoDaNovaAeronave = {
  ...RASCUNHO_INICIAL,
  matricula: 'PS-AER',
  modelo: 'Phenom 300E',
  base: 'SBJD',
  vencimentoReta: '2027-08-01',
  vencimentoCva: '2027-06-01',
  horasDeCelula: '1200',
  ciclos: '950',
  kmVoados: '510000',
  horasMotor1: '1180',
  horasMotor2: '1180',
  valorDoAporte: '45.000,00',
  saldoDeAbertura: '-12.500,00',
};

function errosDe(mudanca: Partial<RascunhoDaNovaAeronave>) {
  const erros = validarNovaAeronave({ ...VALIDO, ...mudanca }, HOJE);
  return Object.fromEntries(Object.entries(erros).filter(([, mensagem]) => mensagem));
}

function vinculos(...percentuais: string[]) {
  return percentuais.map((percentual, indice) => ({
    proprietarioId: indice + 1,
    nome: `Sócio ${indice + 1}`,
    cor: 'PETROLEO' as const,
    percentual,
  }));
}

describe('validarNovaAeronave', () => {
  it('o cadastro completo passa', () => {
    expect(errosDe({})).toEqual({});
  });

  it('vazio, acusa todos os obrigatórios — inclusive ciclos, motores e o aporte fixo', () => {
    expect(Object.keys(errosDe(RASCUNHO_INICIAL))).toEqual([
      'matricula',
      'modelo',
      'base',
      'vencimentoReta',
      'vencimentoCva',
      'horasDeCelula',
      'ciclos',
      'kmVoados',
      'horasMotor1',
      'horasMotor2',
      'valorDoAporte',
      'saldoDeAbertura',
    ]);
  });

  it('matrícula e base têm o formato do servidor; espaço nas pontas não é erro', () => {
    expect(errosDe({ matricula: 'PSABC' }).matricula).toBe('Use o padrão do RAB: PS-MEP.');
    expect(errosDe({ matricula: ' ps-abc ' }).matricula).toBeUndefined();
    expect(errosDe({ base: 'SB1P' }).base).toBe(
      'A base é um código ICAO de quatro letras, como SBSP.',
    );
  });

  it('lê o número brasileiro: ponto de milhar não vira decimal', () => {
    expect(errosDe({ horasDeCelula: '3.500', pesoMaxDecolagemKg: '12.000' })).toEqual({});
    expect(errosDe({ horasDeCelula: '1.234,5', kmVoados: '1.482.300,5' })).toEqual({});
  });

  it('recusa no campo o que a coluna não guarda, dizendo o limite', () => {
    expect(errosDe({ horasDeCelula: '1234,56' }).horasDeCelula).toBe(
      'Use no máximo 1 casa decimal.',
    );
    expect(errosDe({ horasDeCelula: '1e10' }).horasDeCelula).toBe(
      'Use só números, com vírgula para as casas decimais.',
    );
    expect(errosDe({ kmVoados: '100.000.000.000' }).kmVoados).toBe('O máximo é 99.999.999.999,9.');
    expect(errosDe({ saldoDeAbertura: '10,555' }).saldoDeAbertura).toBe(
      'Use no máximo 2 casas decimais.',
    );
    expect(errosDe({ ciclos: '12,5' }).ciclos).toBe('Use um número inteiro.');
  });

  it('pesos são inteiros até 600.000 kg, e o pouso não passa da decolagem', () => {
    expect(errosDe({ pesoMaxDecolagemKg: '600.001' }).pesoMaxDecolagemKg).toBe(
      'O máximo é 600.000.',
    );
    expect(errosDe({ pesoMaxDecolagemKg: '1500,7' }).pesoMaxDecolagemKg).toBe(
      'Use um número inteiro.',
    );
    expect(errosDe({ pesoMaxDecolagemKg: '1.000', pesoMaxPousoKg: '90.000' }).pesoMaxPousoKg).toBe(
      'O peso máximo de pouso não pode passar do peso máximo de decolagem.',
    );
    expect(errosDe({ pesoMaxPousoKg: '90.000' }).pesoMaxPousoKg).toBeUndefined();
  });

  it('o CVA vai até 13 meses e a apólice até 5 anos; vencido é aceito', () => {
    expect(errosDe({ vencimentoCva: '2027-11-07' })).toEqual({});
    expect(errosDe({ vencimentoCva: '2027-11-08' }).vencimentoCva).toBe(
      'Use uma data até 07/11/2027.',
    );
    expect(errosDe({ vencimentoCva: '1999-12-31' }).vencimentoCva).toBe(
      'Use uma data a partir de 01/01/2000.',
    );
    expect(errosDe({ vencimentoCva: '2026-01-01', vencimentoReta: '2031-10-07' })).toEqual({});
    expect(errosDe({ vencimentoReta: '2031-10-08' }).vencimentoReta).toBeDefined();
  });

  it('cada motor escolhido precisa das horas; o que não foi escolhido não conta', () => {
    expect(errosDe({ quantidadeDeMotores: '3' }).horasMotor3).toBe(
      'Informe as horas do motor 3 (0 se for novo).',
    );
    expect(errosDe({ quantidadeDeMotores: '1', horasMotor2: '' })).toEqual({});
    expect(errosDe({ horasMotor1: '0' })).toEqual({});
  });

  it('o valor do aporte é exigido no fixo, maior que zero, e some no proporcional', () => {
    expect(errosDe({ valorDoAporte: '0' }).valorDoAporte).toBe('Informe um valor maior que 0.');
    expect(errosDe({ modeloDeAporte: 'PROPORCIONAL_AO_USO', valorDoAporte: '' })).toEqual({});
  });

  it('cada participação segue o contrato, e a soma só é cobrada com todas legíveis', () => {
    const invalidas = errosDe({ vinculos: vinculos('abc', '0', '33,333', '') });
    expect(invalidas).toEqual({
      'participacoes[0].percentual': 'Use só números, com vírgula para as casas decimais.',
      'participacoes[1].percentual': 'O mínimo é 0,01.',
      'participacoes[2].percentual': 'Use no máximo 2 casas decimais.',
      'participacoes[3].percentual': 'Informe a participação.',
    });
    expect(errosDe({ vinculos: vinculos('60', '30') }).participacoes).toBe(
      'As participações precisam fechar em 100%.',
    );
    expect(errosDe({ vinculos: vinculos('33,34', '33,33', '33,33') })).toEqual({});
  });
});

describe('situacaoDaSoma', () => {
  it('diz o que falta, o que sobra ou que fechou', () => {
    expect(situacaoDaSoma(90)).toEqual({ fechada: false, texto: 'faltam 10%' });
    expect(situacaoDaSoma(105.5)).toEqual({ fechada: false, texto: 'sobram 5,5%' });
    expect(situacaoDaSoma(100)).toEqual({ fechada: true, texto: 'fechada' });
  });
});

describe('campoDoServidor', () => {
  it('o caminho aninhado do 400 cai no campo do formulário', () => {
    const rascunho = { ...VALIDO, vinculos: vinculos('100') };
    const traduzir = campoDoServidor(rotulosDaNovaAeronave(rascunho));

    expect(traduzir('contadores.horasDeCelula')).toBe('horasDeCelula');
    expect(traduzir('configuracaoFinanceira.diaDeFechamento')).toBe('diaDeFechamento');
    expect(traduzir('participacoes[0].percentual')).toBe('participacoes[0].percentual');
    expect(traduzir('participacoes[1].percentual')).toBeUndefined();
    expect(traduzir('requisicao')).toBeUndefined();
  });

  it('os valores mudam quando o campo muda — é o que apaga o erro do servidor', () => {
    const antes = valoresDaNovaAeronave({ ...VALIDO, vinculos: vinculos('60') });
    const depois = valoresDaNovaAeronave({ ...VALIDO, vinculos: vinculos('70') });

    expect(antes.matricula).toBe(depois.matricula);
    expect(antes['participacoes[0].percentual']).not.toBe(depois['participacoes[0].percentual']);
    expect(antes.participacoes).not.toBe(depois.participacoes);
  });
});
