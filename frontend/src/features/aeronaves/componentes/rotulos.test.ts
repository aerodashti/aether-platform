import { describe, expect, it } from 'vitest';

import {
  consequenciaDoVencimento,
  diasAte,
  mensagemDaSoma,
  nomeDaAeronave,
  prazoDaValidade,
  prazoEmPalavras,
  resumoDaFrota,
} from './rotulos';

describe('prazoEmPalavras', () => {
  it('trata passado e futuro como o mesmo eixo, sem mostrar sinal', () => {
    expect(prazoEmPalavras(12)).toBe('em 12 dias');
    expect(prazoEmPalavras(-3)).toBe('há 3 dias');
  });

  it('as bordas viram palavra, não número', () => {
    expect(prazoEmPalavras(0)).toBe('vence hoje');
    expect(prazoEmPalavras(1)).toBe('vence amanhã');
    expect(prazoEmPalavras(-1)).toBe('venceu ontem');
  });
});

describe('resumoDaFrota', () => {
  it('concorda em número', () => {
    expect(resumoDaFrota(1, 0).frota).toBe('1 aeronave');
    expect(resumoDaFrota(4, 0).frota).toBe('4 aeronaves');
    expect(resumoDaFrota(4, 1).impedimento).toBe('1 impedida de voar');
    expect(resumoDaFrota(4, 2).impedimento).toBe('2 impedidas de voar');
  });

  it('não mostra zero impedidas — é ruído, não informação', () => {
    expect(resumoDaFrota(4, 0).impedimento).toBeNull();
  });
});

describe('consequenciaDoVencimento', () => {
  it('diz qual documento e quando, numa frase só', () => {
    expect(consequenciaDoVencimento('RETA', 12)).toBe('RETA vence em 12 dias');
    expect(consequenciaDoVencimento('CVA', 0)).toBe('CVA vence hoje');
    expect(consequenciaDoVencimento('CVA', -3)).toBe('CVA venceu há 3 dias');
    expect(consequenciaDoVencimento('RETA', -1)).toBe('RETA venceu ontem');
    expect(consequenciaDoVencimento('RETA', undefined)).toBe('RETA vence primeiro');
  });
});

describe('mensagemDaSoma', () => {
  it('só libera com 100% e alguma mudança', () => {
    expect(mensagemDaSoma([70, 30], true).tom).toBe('positivo');
    expect(mensagemDaSoma([60, 40], false)).toEqual({
      tom: 'atencao',
      texto: 'Nenhuma alteração nas participações — contrato mantido.',
    });
    expect(mensagemDaSoma([50, 40], true).texto).toBe('Ajuste os percentuais para somar 100%.');
  });

  it('negativo é crítico; zero e vazio pedem participação', () => {
    expect(mensagemDaSoma([-1, 101], true).tom).toBe('critico');
    expect(mensagemDaSoma([0, 100], true).texto).toBe(
      'Todo proprietário precisa de participação maior que 0%.',
    );
    expect(mensagemDaSoma([], true).tom).toBe('atencao');
  });
});

describe('prazoDaValidade', () => {
  const hoje = new Date('2026-09-18T12:00:00');

  it('conta dias de calendário a partir de hoje', () => {
    expect(diasAte('2026-09-30', hoje)).toBe(12);
    expect(diasAte('2026-08-29', hoje)).toBe(-20);
    expect(diasAte(undefined, hoje)).toBeUndefined();
  });

  it('escreve o prazo com a palavra do servidor', () => {
    expect(prazoDaValidade('2026-10-28', false, hoje)).toBe('vence em 40 dias');
    expect(prazoDaValidade('2026-08-29', true, hoje)).toBe('vencida há 20 dias');
    expect(prazoDaValidade('2026-09-18', false, hoje)).toBe('vence hoje');
    expect(prazoDaValidade('2026-09-17', true, hoje)).toBe('vencida ontem');
    // Servidor em UTC já virou o dia; o cliente ainda conta 0.
    expect(prazoDaValidade('2026-09-18', true, hoje)).toBe('vencida hoje');
    expect(prazoDaValidade(undefined, false, hoje)).toBe('');
  });
});

describe('nomeDaAeronave', () => {
  it('não repete o fabricante que o modelo já traz', () => {
    expect(nomeDaAeronave('Cessna', 'Citation XLS+')).toBe('Cessna Citation XLS+');
    expect(nomeDaAeronave('Cessna', 'Cessna Citation XLS+')).toBe('Cessna Citation XLS+');
    expect(nomeDaAeronave(undefined, 'PC-24')).toBe('PC-24');
    expect(nomeDaAeronave('Pilatus', undefined)).toBe('Pilatus');
  });
});
