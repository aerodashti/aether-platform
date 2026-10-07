import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RotaAutenticada } from './RotaAutenticada';
import { RotaDeAdministrador } from './RotaDeAdministrador';

function respostaDe(corpo: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Erro',
    headers: new Headers({ 'X-Request-Id': 'abc-123' }),
    json: () => Promise.resolve(corpo),
  } as unknown as Response;
}

/** A tela de entrada de mentira mostra para onde a pessoa voltará depois de entrar. */
function TelaDeEntrada() {
  const estado = useLocation().state as { de?: string } | null;
  return <p>Tela de entrada · volta para {estado?.de}</p>;
}

function montar(rotaInicial = '/usuarios') {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={cliente}>
      <MemoryRouter initialEntries={[rotaInicial]}>
        <Routes>
          <Route path="/entrar" element={<TelaDeEntrada />} />
          <Route element={<RotaAutenticada />}>
            <Route path="/" element={<p>Área logada</p>} />
            <Route element={<RotaDeAdministrador />}>
              <Route path="/usuarios" element={<p>Tela restrita</p>} />
            </Route>
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('guardas de rota', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sem sessão, manda para a tela de entrada', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(respostaDe({ detail: 'expirou' }, 401))),
    );

    montar();

    expect(await screen.findByText(/Tela de entrada/)).toBeInTheDocument();
  });

  it('guarda a tela pedida com o recorte da URL, para voltar a ela depois de entrar', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(respostaDe({ detail: 'expirou' }, 401))),
    );

    montar('/?aeronave=1&competencia=2026-09');

    expect(
      await screen.findByText('Tela de entrada · volta para /?aeronave=1&competencia=2026-09'),
    ).toBeInTheDocument();
  });

  it('com sessão de administrador, a tela restrita aparece', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(respostaDe({ nome: 'Leonardo', email: 'l@a.br', papel: 'ADMINISTRADOR' })),
      ),
    );

    montar();

    expect(await screen.findByText('Tela restrita')).toBeInTheDocument();
  });

  it('com sessão de gestor, a tela restrita não existe — volta para a raiz', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(respostaDe({ nome: 'Patrícia', email: 'p@a.br', papel: 'GESTOR' })),
      ),
    );

    montar();

    expect(await screen.findByText('Área logada')).toBeInTheDocument();
    expect(screen.queryByText('Tela restrita')).not.toBeInTheDocument();
  });

  it('enquanto a sessão é consultada, não pisca a tela de entrada', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => {})),
    );

    montar();

    expect(screen.queryByText(/Tela de entrada/)).not.toBeInTheDocument();
    expect(screen.queryByText('Tela restrita')).not.toBeInTheDocument();
  });
});
