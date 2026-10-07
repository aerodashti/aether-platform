import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useRecorteDaUrl } from './useRecorteDaUrl';

function respostaDe(corpo: unknown) {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Headers(),
    json: () => Promise.resolve(corpo),
  } as unknown as Response;
}

function montar(url: string, competenciaPadrao = '2026-10') {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(respostaDe([{ id: 1, matricula: 'PS-MEP' }]))),
  );
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const envolver = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={cliente}>
      <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>
    </QueryClientProvider>
  );
  return renderHook(
    () => ({ recorte: useRecorteDaUrl(competenciaPadrao), busca: useLocation().search }),
    { wrapper: envolver },
  ).result;
}

describe('useRecorteDaUrl', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('ignora a aeronave do link que não está na frota, e avisa', async () => {
    const resultado = montar('/custos?aeronave=9999');

    await waitFor(() => expect(resultado.current.recorte.aeronaveId).toBe(''));
    expect(resultado.current.recorte.avisoDaAeronave).toBe(
      'A aeronave do link não foi encontrada.',
    );
  });

  it('a aeronave da frota vale, sem aviso', async () => {
    const resultado = montar('/custos?aeronave=1');

    await waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalled());
    expect(resultado.current.recorte.aeronaveId).toBe('1');
    expect(resultado.current.recorte.avisoDaAeronave).toBeUndefined();
  });

  it('o período mora na URL, e o padrão são os últimos doze meses', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 7));
    const resultado = montar('/aportes');

    expect(resultado.current.recorte).toMatchObject({
      modo: 'MENSAL',
      de: '2025-11',
      ate: '2026-10',
    });
    act(() => resultado.current.recorte.setModo('PERIODO'));
    act(() => resultado.current.recorte.setDe(''));

    expect(resultado.current.busca).toBe('?modo=periodo&de=');
    expect(resultado.current.recorte).toMatchObject({ modo: 'PERIODO', de: '', ate: '2026-10' });
  });

  it('abrir uma competência do período volta ao mensal numa mudança só', () => {
    const resultado = montar('/fechamento?modo=periodo&de=2026-01&ate=2026-09');

    act(() => resultado.current.recorte.abrirCompetencia('2026-08'));

    expect(resultado.current.busca).toBe('?de=2026-01&ate=2026-09&competencia=2026-08');
    expect(resultado.current.recorte.modo).toBe('MENSAL');
  });

  it('limpar tira os filtros e deixa todo o histórico', () => {
    const resultado = montar('/aportes?aeronave=1&proprietario=7&modo=periodo&de=2026-01');

    act(() => resultado.current.recorte.limpar());

    expect(resultado.current.busca).toBe('?competencia=');
  });
});
