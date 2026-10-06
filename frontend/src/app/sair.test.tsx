import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RotaAutenticada } from '@/compartilhado/sessao/RotaAutenticada';

import { criarClienteDeConsultas } from './clienteDeConsultas';
import { LayoutDaAplicacao } from './LayoutDaAplicacao';

function respostaDe(corpo: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 401 ? 'Unauthorized' : 'OK',
    headers: new Headers({ 'X-Request-Id': 'abc-123' }),
    json: () => Promise.resolve(corpo),
  } as unknown as Response;
}

describe('Sair', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('encerra a sessão e leva à tela de entrada, sem deixar a casca vazia na tela', async () => {
    let logado = true;
    vi.stubGlobal(
      'fetch',
      vi.fn((entrada: string, opcoes?: RequestInit) => {
        if (opcoes?.method === 'DELETE') {
          logado = false;
          return Promise.resolve(respostaDe(undefined, 204));
        }
        if (!logado) {
          return Promise.resolve(respostaDe({ title: 'Não autenticado' }, 401));
        }
        if (entrada.startsWith('/api/avisos')) {
          return Promise.resolve(respostaDe({ avisos: [], indicadores: {} }));
        }
        return Promise.resolve(
          respostaDe({ nome: 'Patrícia', email: 'p@x.com.br', papel: 'ADMINISTRADOR' }),
        );
      }),
    );

    render(
      <QueryClientProvider client={criarClienteDeConsultas()}>
        <MemoryRouter initialEntries={['/configuracoes']}>
          <Routes>
            <Route path="/entrar" element={<p>tela de entrada</p>} />
            <Route element={<RotaAutenticada />}>
              <Route element={<LayoutDaAplicacao />}>
                <Route path="/configuracoes" element={<p>configurações</p>} />
              </Route>
            </Route>
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await userEvent.click(await screen.findByRole('button', { name: 'Sair' }));

    expect(await screen.findByText('tela de entrada')).toBeInTheDocument();
    expect(screen.queryByText('configurações')).not.toBeInTheDocument();
  });
});
