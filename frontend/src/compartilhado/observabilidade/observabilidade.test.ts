import { afterEach, describe, expect, it, vi } from 'vitest';

import { contexto } from './observabilidade';

describe('contexto de observabilidade', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('emite uma linha só por interação, com o que foi acumulado', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});

    contexto.interacao('consultar-saude', () => {
      contexto.registrar('http.status', 200);
      contexto.decisao('saude.operante', true);
    });

    expect(info).toHaveBeenCalledTimes(1);
    expect(info).toHaveBeenCalledWith('interacao consultar-saude', {
      'http.status': 200,
      'decisao.saude.operante': true,
    });
  });

  it('espera a Promise antes de encerrar a interação', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});

    await contexto.interacao('consultar-saude', async () => {
      await Promise.resolve();
      contexto.registrar('http.status', 500);
    });

    expect(info).toHaveBeenCalledWith('interacao consultar-saude', { 'http.status': 500 });
  });

  it('não vaza o acumulado de uma interação para a seguinte', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});

    contexto.interacao('primeira', () => contexto.registrar('http.status', 200));
    contexto.interacao('segunda', () => contexto.registrar('http.caminho', '/saude'));

    expect(info).toHaveBeenLastCalledWith('interacao segunda', { 'http.caminho': '/saude' });
  });

  it('registra erro no console com o contexto acumulado', () => {
    const erro = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});

    contexto.interacao('consultar-saude', () => {
      contexto.registrar('http.status', 500);
      contexto.erro('Falha na requisição à API', { requisicao: 'abc-123' });
    });

    expect(erro).toHaveBeenCalledWith('Falha na requisição à API', {
      'http.status': 500,
      requisicao: 'abc-123',
    });
  });

  it('não propaga traceparent quando não há endpoint configurado', () => {
    expect(contexto.cabecalhosDeTrace()).toEqual({});
  });
});
