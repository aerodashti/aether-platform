import { describe, expect, it } from 'vitest';

import type { LinhaDoContrato } from './contratoEmEdicao';
import {
  campoDoContratoNoServidor,
  rotulosDoContrato,
  SEM_PROPRIETARIO,
  validarContrato,
  valoresDoContrato,
} from './validacaoDoContrato';

function linha(proprietarioId: number, nome: string, percentual: string): LinhaDoContrato {
  return { proprietarioId, nome, cor: 'CINZA', percentual };
}

const RICARDO = linha(1, 'Ricardo Meirelles', '60');
const VETOR = linha(2, 'Vetor Participações', '40');

describe('validarContrato', () => {
  it('contrato que fecha em 100 não tem erro', () => {
    expect(Object.values(validarContrato([RICARDO, VETOR])).filter(Boolean)).toEqual([]);
  });

  it('cada linha responde pelo próprio percentual, no nome do JSON do pedido', () => {
    const erros = validarContrato([RICARDO, { ...VETOR, percentual: '' }]);

    expect(erros['participacoes[0].percentual']).toBeUndefined();
    expect(erros['participacoes[1].percentual']).toBe('Informe o percentual.');
    // Com uma linha errada, a soma não acusa: quem fala é o campo.
    expect(erros.participacoes).toBeUndefined();
  });

  it('o "33.5" vale 33,5 aqui também, e três casas são recusadas antes do servidor', () => {
    const erros = validarContrato([
      { ...RICARDO, percentual: '33.5' },
      { ...VETOR, percentual: '66,333' },
    ]);

    expect(erros['participacoes[0].percentual']).toBeUndefined();
    expect(erros['participacoes[1].percentual']).toBe('Use no máximo 2 casas decimais.');
  });

  it('soma fora de 100 e lista vazia são erros da lista', () => {
    expect(validarContrato([RICARDO, { ...VETOR, percentual: '30' }]).participacoes).toBe(
      'Faltam 10% para fechar 100%.',
    );
    expect(validarContrato([]).participacoes).toBe(SEM_PROPRIETARIO);
  });
});

describe('rótulos e valores do contrato', () => {
  it('o resumo nomeia o proprietário de cada linha e põe a soma por último', () => {
    expect(Object.entries(rotulosDoContrato([RICARDO, VETOR]))).toEqual([
      ['participacoes[0].percentual', 'Participação de Ricardo Meirelles'],
      ['participacoes[1].percentual', 'Participação de Vetor Participações'],
      ['participacoes', 'Soma das participações'],
    ]);
  });

  it('remover alguém muda o valor do índice, para o erro do servidor não passar a outro', () => {
    const antes = valoresDoContrato([RICARDO, VETOR, linha(3, 'Helena', '40')]);
    const depois = valoresDoContrato([RICARDO, linha(3, 'Helena', '40')]);

    expect(depois['participacoes[1].percentual']).not.toBe(antes['participacoes[1].percentual']);
  });
});

describe('campoDoContratoNoServidor', () => {
  it('qualquer recusa de uma linha cai no percentual dela', () => {
    expect(campoDoContratoNoServidor('participacoes[1].percentual', 2)).toBe(
      'participacoes[1].percentual',
    );
    expect(campoDoContratoNoServidor('participacoes[0].proprietarioId', 2)).toBe(
      'participacoes[0].percentual',
    );
    expect(campoDoContratoNoServidor('participacoes[0]', 2)).toBe('participacoes[0].percentual');
    expect(campoDoContratoNoServidor('participacoes', 2)).toBe('participacoes');
  });

  it('o que não tem campo na tela fica para o resumo', () => {
    expect(campoDoContratoNoServidor('participacoes[5].percentual', 2)).toBeUndefined();
    expect(campoDoContratoNoServidor('contratoVigenteId', 2)).toBeUndefined();
  });
});
