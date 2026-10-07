import { afterEach, describe, expect, it, vi } from 'vitest';

import { buscar, enviar, ErroDeApi, SEM_CONEXAO } from './cliente';

function respostaDe(corpo: unknown, status: number) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: 'Bad Request',
    headers: new Headers({ 'X-Request-Id': 'abc-123' }),
    json: () => Promise.resolve(corpo),
  } as unknown as Response;
}

describe('cliente da API', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('num 400 de validação, a mensagem diz qual campo falhou, não só "verifique os campos"', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          respostaDe(
            {
              title: 'Dados inválidos',
              detail: 'Verifique os campos informados e tente novamente.',
              campos: { km: 'Os quilômetros precisam ser maiores que zero.' },
            },
            400,
          ),
        ),
      ),
    );

    const erro = await enviar('/voos', {}).catch((falha: unknown) => falha);

    expect(erro).toBeInstanceOf(ErroDeApi);
    expect((erro as ErroDeApi).message).toBe('Os quilômetros precisam ser maiores que zero.');
    expect((erro as ErroDeApi).campos).toEqual({
      km: 'Os quilômetros precisam ser maiores que zero.',
    });
    expect((erro as ErroDeApi).titulo).toBe('Dados inválidos');
  });

  it('sem campos, a mensagem é o detalhe do servidor', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(respostaDe({ detail: 'Aeronave não encontrada.' }, 404))),
    );

    const erro = await enviar('/voos', {}).catch((falha: unknown) => falha);

    expect((erro as ErroDeApi).message).toBe('Aeronave não encontrada.');
    expect((erro as ErroDeApi).campos).toEqual({});
  });

  it('sem rede, o erro é um ErroDeApi com mensagem em português, e não um TypeError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))),
    );

    const erro = await buscar('/voos').catch((falha: unknown) => falha);

    expect(erro).toBeInstanceOf(ErroDeApi);
    expect((erro as ErroDeApi).status).toBe(SEM_CONEXAO);
    expect((erro as ErroDeApi).message).toMatch(/Não foi possível falar com o servidor/);
  });

  it('resposta de erro que não é JSON vira mensagem pelo status, não o statusText em inglês', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ...respostaDe(null, 502),
          statusText: 'Bad Gateway',
          json: () => Promise.reject(new SyntaxError('Unexpected token <')),
        } as unknown as Response),
      ),
    );

    const erro = await enviar('/voos', {}).catch((falha: unknown) => falha);

    expect((erro as ErroDeApi).message).toBe(
      'O servidor não conseguiu responder agora. Tente de novo em instantes.',
    );
  });
});
