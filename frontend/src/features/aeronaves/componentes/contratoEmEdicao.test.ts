import { describe, expect, it } from 'vitest';

import type { ContratoResponse } from '../api/useContratos';

import {
  consequenciaDoSalvar,
  dividirEntreTodos,
  linhasDoVigente,
  mudaOContrato,
  pedidoDoContrato,
  semCandidatos,
  vizinhaDaRemovida,
} from './contratoEmEdicao';

const VIGENTE: ContratoResponse = {
  id: 10,
  participacoes: [
    {
      proprietarioId: 1,
      nome: 'Ricardo Meirelles',
      corDeIdentificacao: 'PETROLEO',
      percentual: 60,
    },
    {
      proprietarioId: 2,
      nome: 'Vetor Participações',
      corDeIdentificacao: 'AMBAR',
      percentual: 33.34,
    },
    { proprietarioId: 3, nome: 'Helena Sarraf', corDeIdentificacao: 'VERDE', percentual: 6.66 },
  ],
};

describe('contrato em edição', () => {
  it('parte do vigente com o percentual como se digita', () => {
    expect(linhasDoVigente(VIGENTE).map((linha) => linha.percentual)).toEqual([
      '60',
      '33,34',
      '6,66',
    ]);
  });

  it('só muda o contrato quem mexe em proprietário ou percentual', () => {
    const linhas = linhasDoVigente(VIGENTE);

    expect(mudaOContrato(linhas, VIGENTE)).toBe(false);
    expect(mudaOContrato([...linhas].reverse(), VIGENTE)).toBe(false);
    expect(mudaOContrato(linhas.slice(1), VIGENTE)).toBe(true);
    expect(mudaOContrato(linhas, undefined)).toBe(true);
  });

  it('o pedido leva o vigente de que partiu e nunca NaN', () => {
    const linhas = linhasDoVigente(VIGENTE).map((linha) =>
      linha.proprietarioId === 1 ? { ...linha, percentual: 'abc' } : linha,
    );

    expect(pedidoDoContrato(linhas, VIGENTE)).toEqual({
      contratoVigenteId: 10,
      participacoes: [
        { proprietarioId: 1, percentual: null },
        { proprietarioId: 2, percentual: 33.34 },
        { proprietarioId: 3, percentual: 6.66 },
      ],
    });
    expect(pedidoDoContrato([], undefined).contratoVigenteId).toBeNull();
  });

  it('dividir igualmente fecha a soma por construção', () => {
    expect(dividirEntreTodos(linhasDoVigente(VIGENTE)).map((linha) => linha.percentual)).toEqual([
      '33,34',
      '33,33',
      '33,33',
    ]);
  });

  it('ao remover, o foco vai à linha seguinte, senão à anterior', () => {
    const linhas = linhasDoVigente(VIGENTE);

    expect(vizinhaDaRemovida(linhas, 1)).toBe(2);
    expect(vizinhaDaRemovida(linhas, 3)).toBe(2);
    expect(vizinhaDaRemovida(linhas.slice(0, 1), 1)).toBeUndefined();
  });
});

describe('consequenciaDoSalvar', () => {
  const FECHA = { fecha: true, texto: 'Fechado em 100%.' };

  it('só fala em arquivar quando há vigente e mudança', () => {
    expect(consequenciaDoSalvar(FECHA, true, true)).toBe(
      'Fechado em 100%. Salvar cria um contrato novo e arquiva o atual no histórico.',
    );
    expect(consequenciaDoSalvar(FECHA, true, false)).toBe(
      'Fechado em 100%. Salvar define o primeiro contrato desta aeronave.',
    );
    expect(consequenciaDoSalvar(FECHA, false, true)).toBe(
      'Fechado em 100%, sem alteração: o contrato atual continua valendo.',
    );
  });

  it('sem fechar, diz o que falta', () => {
    expect(
      consequenciaDoSalvar({ fecha: false, texto: 'Faltam 10% para fechar 100%.' }, true, true),
    ).toBe('Faltam 10% para fechar 100%.');
  });
});

describe('semCandidatos', () => {
  const linhas = linhasDoVigente(VIGENTE);

  it('sem cadastro nenhum, o caminho é cadastrar', () => {
    expect(semCandidatos([], [])).toEqual({ motivo: 'nenhumCadastrado' });
  });

  it('com inativo fora do contrato, diz quem é para reativar', () => {
    const cadastrados = [
      { id: 1, nome: 'Ricardo Meirelles', situacao: 'ATIVO' as const },
      { id: 4, nome: 'Marina Costa', situacao: 'INATIVO' as const },
      { id: 5, nome: 'Paulo Reis', situacao: 'INATIVO' as const },
    ];
    expect(semCandidatos(cadastrados, linhas)).toEqual({
      motivo: 'inativosDeFora',
      nomes: 'Marina Costa, Paulo Reis',
    });
  });

  it('inativo que já está no contrato não conta: todos estão nele', () => {
    const cadastrados = [
      { id: 1, nome: 'Ricardo Meirelles', situacao: 'ATIVO' as const },
      { id: 3, nome: 'Helena Sarraf', situacao: 'INATIVO' as const },
    ];
    expect(semCandidatos(cadastrados, linhas)).toEqual({ motivo: 'todosNoContrato' });
  });
});
