import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LayoutDaAplicacao } from './LayoutDaAplicacao';

function respostaDe(corpo: unknown) {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Headers({ 'X-Request-Id': 'abc-123' }),
    json: () => Promise.resolve(corpo),
  } as unknown as Response;
}

/** Mostra onde a navegação parou, com a query — é o que o "+ Registrar" produz. */
function Endereco() {
  const { pathname, search } = useLocation();
  return <p data-testid="endereco">{`${pathname}${search}`}</p>;
}

function montar(papel: string, url: string) {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(respostaDe({ nome: 'Patrícia', email: 'p@x.com.br', papel }))),
  );
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={cliente}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route element={<LayoutDaAplicacao />}>
            <Route path="*" element={<Endereco />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('LayoutDaAplicacao', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('o voltar só aparece em tela interna e, sem histórico, leva à tela de cima', async () => {
    montar('GESTOR', '/aeronaves/3');

    await userEvent.click(await screen.findByRole('button', { name: 'Voltar' }));
    expect(screen.getByTestId('endereco')).toHaveTextContent(/^\/aeronaves$/);
    expect(screen.queryByRole('button', { name: 'Voltar' })).not.toBeInTheDocument();
  });

  it('o "+ Registrar" leva ao formulário da tela dona, já na aeronave aberta', async () => {
    montar('GESTOR', '/aeronaves/3');

    await userEvent.click(await screen.findByRole('button', { name: /Registrar/ }));
    await userEvent.click(screen.getByRole('button', { name: /^Custo/ }));
    expect(screen.getByTestId('endereco')).toHaveTextContent('/custos?aeronave=3&registrar=1');
  });

  it('o piloto só registra trecho', async () => {
    montar('PILOTO', '/');
    await userEvent.click(await screen.findByRole('button', { name: /Registrar/ }));
    expect(screen.getByRole('button', { name: /^Trecho/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Custo/ })).not.toBeInTheDocument();
  });

  it('o proprietário não vê o "+ Registrar"', async () => {
    montar('PROPRIETARIO', '/');
    await screen.findByText('Patrícia');
    expect(screen.queryByRole('button', { name: /Registrar/ })).not.toBeInTheDocument();
  });
});
