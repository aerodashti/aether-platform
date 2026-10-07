import { describe, expect, it } from 'vitest';

import type { RascunhoDoParametro } from './rascunhoDoParametro';
import { apoioDoLimite, situacaoPrevista } from './situacaoPrevista';

const HOJE = '2026-10-07';
const CONTADORES = { horasDeCelula: 3412.5, ciclos: 2890 };
const HORAS: RascunhoDoParametro = {
  nome: 'Célula',
  tipo: 'HORAS',
  limite: '4.000',
  dataLimite: '',
  aviso: '100',
};
const DATA: RascunhoDoParametro = { ...HORAS, tipo: 'DATA', limite: '', dataLimite: '2026-11-06' };

describe('situacaoPrevista', () => {
  it('julga como o servidor: estouro, faixa de aviso e em dia', () => {
    expect(situacaoPrevista({ ...HORAS, limite: '4' }, CONTADORES, HOJE)).toBe('ESTOURADO');
    expect(situacaoPrevista({ ...HORAS, limite: '3.500' }, CONTADORES, HOJE)).toBe('ATENCAO');
    expect(situacaoPrevista({ ...HORAS, limite: '3.412,5' }, CONTADORES, HOJE)).toBe('ATENCAO');
    expect(situacaoPrevista(HORAS, CONTADORES, HOJE)).toBe('REGULAR');
    expect(situacaoPrevista({ ...HORAS, tipo: 'CICLOS', limite: '2.889' }, CONTADORES, HOJE)).toBe(
      'ESTOURADO',
    );
  });

  it('a régua de data conta os dias a partir de hoje', () => {
    expect(situacaoPrevista({ ...DATA, dataLimite: '2026-10-06' }, CONTADORES, HOJE)).toBe(
      'ESTOURADO',
    );
    expect(situacaoPrevista({ ...DATA, aviso: '30' }, CONTADORES, HOJE)).toBe('ATENCAO');
    expect(situacaoPrevista({ ...DATA, aviso: '29' }, CONTADORES, HOJE)).toBe('REGULAR');
  });

  it('sem número ou sem data, não há o que prever', () => {
    expect(situacaoPrevista({ ...HORAS, limite: '' }, CONTADORES, HOJE)).toBeUndefined();
    expect(situacaoPrevista({ ...DATA, dataLimite: '' }, CONTADORES, HOJE)).toBeUndefined();
    expect(situacaoPrevista({ ...HORAS, aviso: '' }, CONTADORES, HOJE)).toBeUndefined();
  });
});

describe('apoioDoLimite', () => {
  it('mostra o contador de hoje e quanto falta, prova de como o número foi lido', () => {
    expect(apoioDoLimite({ ...HORAS, limite: '' }, CONTADORES, HOJE)).toBe(
      'A aeronave está com 3.412,5 h.',
    );
    expect(apoioDoLimite(HORAS, CONTADORES, HOJE)).toBe(
      'A aeronave está com 3.412,5 h. Faltam 587,5 h.',
    );
  });

  it('avisa antes de salvar o que nasce estourado ou em atenção', () => {
    expect(apoioDoLimite({ ...HORAS, limite: '4' }, CONTADORES, HOJE)).toBe(
      'A aeronave está com 3.412,5 h. O limite já passou: o parâmetro nasce estourado e a aeronave fica impedida de voar.',
    );
    expect(apoioDoLimite({ ...HORAS, limite: '3.500' }, CONTADORES, HOJE)).toBe(
      'A aeronave está com 3.412,5 h. Faltam 87,5 h. Já está dentro da faixa de aviso: o parâmetro nasce em atenção.',
    );
    expect(apoioDoLimite({ ...DATA, dataLimite: '2026-08-21' }, CONTADORES, HOJE)).toBe(
      'O limite já passou: o parâmetro nasce estourado e a aeronave fica impedida de voar.',
    );
    expect(apoioDoLimite({ ...DATA, dataLimite: '' }, CONTADORES, HOJE)).toBeUndefined();
  });
});
