import { describe, expect, it } from 'vitest';

import type { ContratoSemQuemSai } from './rebalanceamento';
import {
  campoDaSaidaNoServidor,
  rotulosDaSaida,
  validarSaida,
  valoresDaSaida,
} from './validacaoDaSaida';

function contrato(matricula: string, ...percentuais: [number, string][]): ContratoSemQuemSai {
  return {
    aeronaveId: matricula.length,
    contratoVigenteId: 1,
    matricula,
    liberado: 20,
    participacoes: percentuais.map(([proprietarioId, percentual]) => ({
      proprietarioId,
      percentual,
      incluida: false,
    })),
  };
}

const NOMES = new Map([
  [1, 'Ricardo Meirelles'],
  [2, 'Vetor Participações'],
]);

const COM_CANDIDATOS = () => true;

describe('validarSaida', () => {
  it('"50.5" + "49.5" fecha 100, como na tela do contrato — e não 1000', () => {
    const erros = validarSaida([contrato('PS-MEP', [1, '50.5'], [2, '49.5'])], COM_CANDIDATOS);

    expect(Object.values(erros).filter(Boolean)).toEqual([]);
  });

  it('cada linha responde pelo percentual dela, e a soma só fala com todos válidos', () => {
    const erros = validarSaida([contrato('PS-MEP', [1, '100'], [2, ''])], COM_CANDIDATOS);

    expect(erros['contratos[0].participacoes[1].percentual']).toBe('Informe o percentual.');
    expect(erros['contratos[0].participacoes']).toBeUndefined();
  });

  it('a soma diz o que falta, e a aeronave sem ninguém pede quem assuma', () => {
    const erros = validarSaida(
      [contrato('PS-MEP', [1, '60'], [2, '20']), contrato('PR-KRT')],
      COM_CANDIDATOS,
    );

    expect(erros['contratos[0].participacoes']).toBe('Faltam 20% para fechar 100%.');
    expect(erros['contratos[1].participacoes']).toBe(
      'Inclua quem assume a participação na PR-KRT.',
    );
  });

  it('sem ninguém que possa entrar, a soma não pede para incluir', () => {
    const erros = validarSaida([contrato('PR-KRT')], () => false);

    expect(erros['contratos[0].participacoes']).toBe(
      'Ninguém pode assumir a participação na PR-KRT agora.',
    );
  });
});

describe('rótulos, valores e campos do servidor na saída', () => {
  const contratos = [contrato('PS-MEP', [1, '60'], [2, '40'])];

  it('o resumo nomeia o proprietário e a aeronave', () => {
    expect(Object.values(rotulosDaSaida(contratos, NOMES))).toEqual([
      'Participação de Ricardo Meirelles na PS-MEP',
      'Participação de Vetor Participações na PS-MEP',
      'Soma da PS-MEP',
    ]);
  });

  it('o valor da linha muda quando alguém sai da frente dela', () => {
    const depois = valoresDaSaida([contrato('PS-MEP', [2, '40'])]);

    expect(depois['contratos[0].participacoes[0].percentual']).not.toBe(
      valoresDaSaida(contratos)['contratos[0].participacoes[0].percentual'],
    );
  });

  it('a recusa de uma linha cai no percentual dela; a do contrato, na soma', () => {
    expect(campoDaSaidaNoServidor('contratos[0].participacoes[1].percentual', contratos)).toBe(
      'contratos[0].participacoes[1].percentual',
    );
    expect(campoDaSaidaNoServidor('contratos[0].participacoes[0].proprietarioId', contratos)).toBe(
      'contratos[0].participacoes[0].percentual',
    );
    expect(campoDaSaidaNoServidor('contratos[0].aeronaveId', contratos)).toBe(
      'contratos[0].participacoes',
    );
    expect(campoDaSaidaNoServidor('contratos[3].participacoes', contratos)).toBeUndefined();
    expect(campoDaSaidaNoServidor('contratos', contratos)).toBeUndefined();
  });
});
