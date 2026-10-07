import { describe, expect, it } from 'vitest';

import type { RascunhoDaManutencao } from './rascunhoDaManutencao';
import { validarManutencao, type ContextoDaManutencao } from './validacaoDaManutencao';

const HOJE = '2026-10-07';
const CONTEXTO: ContextoDaManutencao = { hoje: HOJE, horaIncompleta: false };
const VALIDO: RascunhoDaManutencao = {
  data: '2026-11-20',
  hora: '09:00',
  responsavel: 'Hangar Líder — SBSP',
  descricao: 'Inspeção de 100 h — célula',
  valor: '48.000,00',
};

function erros(alteracao: Partial<RascunhoDaManutencao>, contexto = CONTEXTO) {
  return validarManutencao({ ...VALIDO, ...alteracao }, contexto);
}

describe('validarManutencao', () => {
  it('o preenchimento completo e o mínimo (data e descrição) passam', () => {
    expect(Object.values(erros({})).filter(Boolean)).toEqual([]);
    expect(Object.values(erros({ hora: '', responsavel: '', valor: '' })).filter(Boolean)).toEqual(
      [],
    );
  });

  it('data e descrição são obrigatórias; descrição só de espaço é falta', () => {
    expect(erros({ data: '' }).data).toBe('Informe a data.');
    expect(erros({ descricao: '\u00a0 ' }).descricao).toBe('Informe a descrição.');
  });

  it('a data fica entre hoje − 1 ano e hoje + 10 anos, e o ano tem quatro dígitos', () => {
    expect(erros({ data: '2025-10-07' }).data).toBeUndefined();
    expect(erros({ data: '2036-10-07' }).data).toBeUndefined();
    expect(erros({ data: '2025-10-06' }).data).toBe('Use uma data a partir de 07/10/2025.');
    expect(erros({ data: '2036-10-08' }).data).toBe('Use uma data até 07/10/2036.');
    expect(erros({ data: '0001-01-01' }).data).toBe('Use uma data a partir de 07/10/2025.');
    // Como texto, "20266-…" ficaria entre "2025-…" e "2036-…".
    expect(erros({ data: '20266-10-07' }).data).toBe('Use um ano de quatro dígitos.');
  });

  it('na correção, a data gravada fora da janela não obriga a mudar a data', () => {
    const corrigindo = { ...CONTEXTO, dataGravada: '2024-01-10' };
    expect(erros({ data: '2024-01-10' }, corrigindo).data).toBeUndefined();
    expect(erros({ data: '2024-01-11' }, corrigindo).data).toBe(
      'Use uma data a partir de 07/10/2025.',
    );
  });

  it('o valor é lido em português e respeita a coluna NUMERIC(14,2)', () => {
    expect(erros({ valor: '48.000' }).valor).toBeUndefined();
    expect(erros({ valor: '1.500,00' }).valor).toBeUndefined();
    expect(erros({ valor: '0' }).valor).toBe('Informe um valor maior que 0.');
    expect(erros({ valor: '-10' }).valor).toBe('Informe um valor maior que 0.');
    expect(erros({ valor: '0,001' }).valor).toBe('Use no máximo 2 casas decimais.');
    expect(erros({ valor: '1e3' }).valor).toBe(
      'Use só números, com vírgula para as casas decimais.',
    );
    expect(erros({ valor: '1.000.000.000.000' }).valor).toBe('O máximo é 999.999.999.999,99.');
  });

  it('textos longos dizem o limite da coluna', () => {
    expect(erros({ descricao: 'x'.repeat(201) }).descricao).toBe('Use no máximo 200 caracteres.');
    expect(erros({ responsavel: 'x'.repeat(121) }).responsavel).toBe(
      'Use no máximo 120 caracteres.',
    );
  });

  it('o horário digitado pela metade é erro, em vez de virar "sem horário"', () => {
    expect(erros({ hora: '' }, { ...CONTEXTO, horaIncompleta: true }).hora).toBe(
      'Complete o horário ou apague-o: ele é opcional.',
    );
  });
});
