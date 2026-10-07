import { describe, expect, it } from 'vitest';

import type { RascunhoDaTroca } from './rascunhoDaTroca';
import { ultimaDataDaTroca, validarTroca, type ContextoDaTroca } from './validacaoDaTroca';

const HOJE = '2026-10-07';

const PRONTO: ContextoDaTroca = {
  hoje: HOJE,
  proprietariosDisponiveis: 2,
  proprietarios: 'pronta',
};

const COMPLETO: RascunhoDaTroca = {
  aeronaveId: '1',
  data: '2026-09-20',
  cedenteId: '1',
  recebedorId: '2',
  horas: '2,5',
  km: '1.320',
  valorPorHora: '14.800,00',
  relatorioDeVoo: 'RV-2026-031',
  observacao: '',
};

function erros(mudanca: Partial<RascunhoDaTroca>, contexto: Partial<ContextoDaTroca> = {}) {
  return validarTroca({ ...COMPLETO, ...mudanca }, { ...PRONTO, ...contexto });
}

describe('validarTroca', () => {
  it('a troca completa não tem problema', () => {
    expect(Object.values(erros({})).filter(Boolean)).toEqual([]);
  });

  it('vazia, diz o que falta em cada obrigatório', () => {
    const vazia = erros({ aeronaveId: '', data: '', cedenteId: '', recebedorId: '', horas: '' });

    expect(vazia).toMatchObject({
      aeronaveId: 'Escolha a aeronave.',
      data: 'Informe a data da troca.',
      cedenteId: 'Escolha quem cedeu as horas.',
      recebedorId: 'Escolha quem recebeu as horas.',
      horas: 'Informe as horas voadas.',
    });
    expect(vazia.km).toBeUndefined();
    expect(vazia.valorPorHora).toBeUndefined();
  });

  it('horas: texto, casas, zero e o teto de 1.000', () => {
    expect(erros({ horas: '2:30' }).horas).toBe(
      'Use só números, com vírgula para as casas decimais.',
    );
    expect(erros({ horas: '2,25' }).horas).toBe(
      'Use no máximo uma casa decimal, em décimos de hora: 2h30 é 2,5.',
    );
    expect(erros({ horas: '0' }).horas).toBe('Informe um valor maior que 0.');
    expect(erros({ horas: '1.000,1' }).horas).toBe('O máximo é 1.000.');
    expect(erros({ horas: '1.000' }).horas).toBeUndefined();
  });

  it('KM: opcional, nunca negativo, uma casa e dentro da coluna', () => {
    expect(erros({ km: '' }).km).toBeUndefined();
    expect(erros({ km: '610 km' }).km).toBe('Use só números, com vírgula para as casas decimais.');
    expect(erros({ km: '-5' }).km).toBe('O mínimo é 0.');
    expect(erros({ km: '1320,05' }).km).toBe('Use no máximo uma casa decimal.');
    expect(erros({ km: '1.000.000.000' }).km).toBe('O máximo é 999.999.999,9.');
  });

  it('R$ por hora: opcional, maior que zero, duas casas e dentro da coluna', () => {
    expect(erros({ valorPorHora: '' }).valorPorHora).toBeUndefined();
    expect(erros({ valorPorHora: '0' }).valorPorHora).toBe('Informe um valor maior que 0.');
    expect(erros({ valorPorHora: '0,001' }).valorPorHora).toBe('Use no máximo 2 casas decimais.');
    expect(erros({ valorPorHora: '10.000.000.000' }).valorPorHora).toBe(
      'O máximo é 9.999.999.999,99.',
    );
  });

  it('data: de 01/01/2000 até hoje, e o ano de cinco dígitos não passa', () => {
    expect(erros({ data: '1999-12-31' }).data).toBe('Use uma data a partir de 01/01/2000.');
    expect(erros({ data: '2026-10-08' }).data).toBe(
      'A troca registra horas já voadas: a data não pode ser futura.',
    );
    expect(erros({ data: '20261-01-01' }).data).toBeDefined();
    expect(erros({ data: HOJE }).data).toBeUndefined();
  });

  it('na correção de uma concluída, a troca não vai para depois da devolução', () => {
    const concluida = { concluidaEm: '2026-10-03' };

    expect(erros({ data: '2026-10-05' }, concluida).data).toBe(
      'A devolução foi registrada em 03/10/2026: a troca não pode ser depois dela.',
    );
    expect(erros({ data: '2026-10-03' }, concluida).data).toBeUndefined();
    expect(ultimaDataDaTroca(HOJE, '2026-10-03')).toBe('2026-10-03');
    expect(ultimaDataDaTroca(HOJE)).toBe(HOJE);
  });

  it('aeronave sem dois proprietários no contrato: o problema é a aeronave, não Cedeu', () => {
    const semContrato = erros({ cedenteId: '', recebedorId: '' }, { proprietariosDisponiveis: 0 });

    expect(semContrato.aeronaveId).toMatch(/não tem dois proprietários no contrato vigente/);
    expect(semContrato.cedenteId).toBeUndefined();
    expect(semContrato.recebedorId).toBeUndefined();
  });

  it('sem a lista de proprietários, Cedeu diz por que está vazio', () => {
    expect(erros({ cedenteId: '' }, { proprietarios: 'carregando' }).cedenteId).toBe(
      'Aguarde a lista de proprietários carregar.',
    );
    expect(erros({ cedenteId: '' }, { proprietarios: 'falhou' }).cedenteId).toBe(
      'A lista de proprietários não carregou: tente de novo antes de salvar.',
    );
    expect(erros({}, { proprietarios: 'falhou' }).cedenteId).toBeUndefined();
  });

  it('quem recebe não pode ser quem cedeu', () => {
    expect(erros({ recebedorId: '1' }).recebedorId).toBe(
      'Quem recebe precisa ser outro proprietário, não quem cedeu.',
    );
  });

  it('textos no limite das colunas', () => {
    expect(erros({ relatorioDeVoo: 'R'.repeat(21) }).relatorioDeVoo).toBe(
      'Use no máximo 20 caracteres.',
    );
    expect(erros({ observacao: 'o'.repeat(301) }).observacao).toBe('Use no máximo 300 caracteres.');
  });
});
