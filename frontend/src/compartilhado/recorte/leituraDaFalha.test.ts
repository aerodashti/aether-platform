import { describe, expect, it } from 'vitest';

import { ErroDeApi, SEM_CONEXAO } from '@/api/cliente';

import { lerFalhaDaConsulta, RecorteInvalido } from './leituraDaFalha';

const GENERICA = 'Não foi possível carregar os aportes.';

describe('lerFalhaDaConsulta', () => {
  it('a recusa do pedido é dita como veio e não se repete', () => {
    expect(
      lerFalhaDaConsulta(new ErroDeApi('Aeronave não encontrada.', 404, 'x'), GENERICA),
    ).toEqual({ mensagem: 'Aeronave não encontrada.', repetivel: false });
    expect(lerFalhaDaConsulta(new RecorteInvalido('Use o formato AAAA-MM.'), GENERICA)).toEqual({
      mensagem: 'Use o formato AAAA-MM.',
      repetivel: false,
    });
  });

  it('falha do servidor ganha a frase da tela; rede e 429 dizem o que houve e se repetem', () => {
    expect(lerFalhaDaConsulta(new ErroDeApi('Erro interno', 500, 'x'), GENERICA)).toEqual({
      mensagem: GENERICA,
      repetivel: true,
    });
    expect(lerFalhaDaConsulta(new ErroDeApi('Sem conexão.', SEM_CONEXAO, null), GENERICA)).toEqual({
      mensagem: 'Sem conexão.',
      repetivel: true,
    });
    expect(lerFalhaDaConsulta(new ErroDeApi('Calma.', 429, 'x'), GENERICA).repetivel).toBe(true);
    expect(lerFalhaDaConsulta(new Error('quebrou'), GENERICA).mensagem).toBe(GENERICA);
  });
});
