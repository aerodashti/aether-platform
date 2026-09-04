import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PaginaSaude } from './PaginaSaude';

function envolver(conteudo: ReactNode) {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={cliente}>{conteudo}</QueryClientProvider>);
}

function respostaDe(corpo: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Erro',
    headers: new Headers({ 'X-Request-Id': 'abc-123' }),
    json: () => Promise.resolve(corpo),
  } as unknown as Response;
}

describe('PaginaSaude', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('mostra a situação geral e cada componente monitorado', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          respostaDe({
            situacaoGeral: 'OPERANTE',
            versao: '0.1.0',
            componentes: [
              { componente: 'banco', situacao: 'DEGRADADO', verificadoEm: '', saudavel: false },
            ],
          }),
        ),
      ),
    );

    envolver(<PaginaSaude />);

    expect(await screen.findByText('Operante')).toBeInTheDocument();
    expect(screen.getByText('Versão 0.1.0')).toBeInTheDocument();
    expect(screen.getByText('banco')).toBeInTheDocument();
    expect(screen.getByText('Degradado')).toBeInTheDocument();
  });

  it('mostra o detalhe do Problem Details quando a API recusa', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          respostaDe(
            {
              title: 'Recurso não encontrado',
              detail: 'O componente informado não é monitorado pela plataforma.',
            },
            404,
          ),
        ),
      ),
    );

    envolver(<PaginaSaude />);

    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('O componente informado não é monitorado pela plataforma.');
  });
});
