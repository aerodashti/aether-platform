import { describe, expect, it } from 'vitest';

import { instantesDoTrecho } from './horarios';
import { rascunhoInicial, type RascunhoDoTrecho } from './rascunhoDoTrecho';
import { janelaDaData, validarTrecho, type MomentoDaValidacao } from './validacaoDoTrecho';

const MOMENTO: MomentoDaValidacao = {
  hoje: '2026-10-07',
  agora: new Date(2026, 9, 7, 12, 0).getTime(),
};

const VALIDO: RascunhoDoTrecho = {
  ...rascunhoInicial(undefined, '1'),
  relatorioDeVoo: 'RV-2026-044',
  data: '2026-10-05',
  origem: 'SBSP',
  destino: 'SBRJ',
  km: '365',
};

function errosDe(parcial: Partial<RascunhoDoTrecho>, momento = MOMENTO) {
  const rascunho = { ...VALIDO, ...parcial };
  return validarTrecho(rascunho, momento, instantesDoTrecho(rascunho.data, rascunho));
}

describe('validarTrecho', () => {
  it('o trecho preenchido não tem problema nenhum', () => {
    expect(Object.values(errosDe({})).filter(Boolean)).toEqual([]);
  });

  it('vazio, acusa cada obrigatório com o que fazer', () => {
    const erros = errosDe({
      aeronaveId: '',
      relatorioDeVoo: ' ',
      numeroDoTrecho: '',
      data: '',
      origem: '',
      destino: '',
      km: '',
    });

    expect(erros).toMatchObject({
      aeronaveId: 'Escolha a aeronave.',
      relatorioDeVoo: 'Informe o Rel. Voo.',
      numeroDoTrecho: 'Informe o nº do trecho.',
      data: 'Informe a data do trecho.',
      origem: 'Informe a origem.',
      destino: 'Informe o destino.',
      km: 'Informe a distância.',
    });
  });

  it('lê a distância como se escreve no Brasil e diz o limite da coluna', () => {
    expect(errosDe({ km: '1.962' }).km).toBeUndefined();
    expect(errosDe({ km: '1.962,5' }).km).toBeUndefined();
    // A mensagem é a da regra comum numero({ casas: 1 }), que a base passa a dizer no singular.
    expect(errosDe({ km: '12,34' }).km).toMatch(/^Use no máximo 1 casa/);
    expect(errosDe({ km: '0' }).km).toBe('Informe um valor maior que 0.');
    expect(errosDe({ km: '10.000.000' }).km).toBe('O máximo é 9.999.999,9.');
    expect(errosDe({ km: 'dez' }).km).toBe('Use só números, com vírgula para as casas decimais.');
  });

  it('o nº do trecho é um inteiro a partir de 1', () => {
    expect(errosDe({ numeroDoTrecho: '0' }).numeroDoTrecho).toBe('O mínimo é 1.');
    expect(errosDe({ numeroDoTrecho: '1,5' }).numeroDoTrecho).toBe('Use um número inteiro.');
    expect(errosDe({ numeroDoTrecho: 'um' }).numeroDoTrecho).toBe('Use só números inteiros.');
  });

  it('origem e destino são códigos ICAO de 4 letras, sem diferenciar caixa', () => {
    expect(errosDe({ origem: 'SB1P' }).origem).toBe('Use o código ICAO de 4 letras, como SBSP.');
    expect(errosDe({ destino: ' sbsp ' }).destino).toBeUndefined();
  });

  it('a data do planejado vai de um ano atrás a dez à frente; a do realizado, até hoje', () => {
    const voado = { partidaRealizada: '10:00', pousoRealizado: '11:00' };

    expect(errosDe({ data: '20266-01-01' }).data).toBe('Use uma data com o ano de 4 dígitos.');
    expect(errosDe({ data: '2025-10-06' }).data).toBe('Use uma data a partir de 07/10/2025.');
    expect(errosDe({ data: '2036-10-08' }).data).toBe('Use uma data até 07/10/2036.');
    expect(errosDe({ ...voado, data: '2026-10-08' }).data).toBe(
      'Um trecho já realizado não tem data futura.',
    );
    expect(errosDe({ ...voado, data: '2001-03-01' }).data).toBeUndefined();
    expect(janelaDaData(true, '2026-10-07')).toEqual({
      minimo: '2000-01-01',
      maximo: '2026-10-07',
    });
  });

  it('na correção, a data gravada não é julgada de novo; só a que mudou', () => {
    const correcao = { ...MOMENTO, dataGravada: '2024-03-01' };

    expect(errosDe({ data: '2024-03-01' }, correcao).data).toBeUndefined();
    expect(errosDe({ data: '2024-03-02' }, correcao).data).toBe(
      'Use uma data a partir de 07/10/2025.',
    );
  });

  it('pouso no mesmo horário da partida é erro, não um voo de 24 h', () => {
    expect(errosDe({ partidaPrevista: '10:00', pousoPrevisto: '10:00' }).pousoPrevisto).toBe(
      'O pouso não pode ser no mesmo horário da partida.',
    );
    expect(errosDe({ partidaRealizada: '10:00', pousoRealizado: '10:00' }).pousoRealizado).toBe(
      'O pouso não pode ser no mesmo horário da partida.',
    );
  });

  it('o realizado vem inteiro: a metade acusa o campo que falta', () => {
    expect(errosDe({ pousoRealizado: '11:00' }).partidaRealizada).toBe(
      'Informe também a partida realizada.',
    );
    expect(errosDe({ partidaRealizada: '10:00' }).pousoRealizado).toBe(
      'Informe também o pouso realizado.',
    );
  });

  it('pouso realizado no futuro é erro; a folga do relógio de bordo é de 15 minutos', () => {
    const hoje = { data: '2026-10-07', partidaRealizada: '11:00' };

    expect(errosDe({ ...hoje, pousoRealizado: '12:15' }).pousoRealizado).toBeUndefined();
    expect(errosDe({ ...hoje, pousoRealizado: '12:16' }).pousoRealizado).toBe(
      'O pouso realizado não pode estar no futuro.',
    );
  });

  it('as observações têm o limite da coluna', () => {
    expect(errosDe({ observacoes: 'a'.repeat(501) }).observacoes).toBe(
      'Use no máximo 500 caracteres.',
    );
  });
});
