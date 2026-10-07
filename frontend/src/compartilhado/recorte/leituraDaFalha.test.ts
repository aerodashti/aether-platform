import { describe, expect, it } from 'vitest';

import { ErroDeApi, SEM_CONEXAO } from '@/api/cliente';

import { lerFalhaDaConsulta, RecorteInvalido } from './leituraDaFalha';

const GENERICA = 'Não foi possível carregar os aportes.';

describe('lerFalhaDaConsulta', () => {
  it('a recusa do pedido é dita como veio e oferece limpar os filtros', () => {
    expect(
      lerFalhaDaConsulta(new ErroDeApi('Aeronave não encontrada.', 404, 'x'), GENERICA),
    ).toEqual({ mensagem: 'Aeronave não encontrada.', acao: 'limpar-filtros' });
    expect(lerFalhaDaConsulta(new RecorteInvalido('Use o formato AAAA-MM.'), GENERICA)).toEqual({
      mensagem: 'Use o formato AAAA-MM.',
      acao: 'limpar-filtros',
    });
  });

  it('sem sessão ou sem permissão, diz o que veio e não oferece ação', () => {
    const negado = new ErroDeApi('Seu perfil não tem permissão para esta ação.', 403, 'x');
    expect(lerFalhaDaConsulta(negado, GENERICA)).toEqual({
      mensagem: 'Seu perfil não tem permissão para esta ação.',
      acao: 'nenhuma',
    });
    expect(lerFalhaDaConsulta(new ErroDeApi('Entre de novo.', 401, 'x'), GENERICA).acao).toBe(
      'nenhuma',
    );
  });

  it('falha do servidor ganha a frase da tela; rede e 429 dizem o que houve e se repetem', () => {
    expect(lerFalhaDaConsulta(new ErroDeApi('Erro interno', 500, 'x'), GENERICA)).toEqual({
      mensagem: GENERICA,
      acao: 'tentar-de-novo',
    });
    expect(lerFalhaDaConsulta(new ErroDeApi('Sem conexão.', SEM_CONEXAO, null), GENERICA)).toEqual({
      mensagem: 'Sem conexão.',
      acao: 'tentar-de-novo',
    });
    expect(lerFalhaDaConsulta(new ErroDeApi('Calma.', 429, 'x'), GENERICA)).toEqual({
      mensagem: 'Calma.',
      acao: 'tentar-de-novo',
    });
    expect(lerFalhaDaConsulta(new Error('quebrou'), GENERICA).mensagem).toBe(GENERICA);
  });
});
