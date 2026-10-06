import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PaginaDeDocumentos } from './PaginaDeDocumentos';

function respostaDe(corpo: unknown, status = 200) {
  return {
    ok: status < 300,
    status,
    statusText: 'OK',
    headers: new Headers({ 'X-Request-Id': 'abc-123' }),
    json: () => Promise.resolve(corpo),
  } as unknown as Response;
}

const LISTA = {
  documentos: [
    {
      id: 7,
      aeronaveId: 1,
      nome: 'Apólice RETA 2026.pdf',
      tipoDeConteudo: 'application/pdf',
      tamanho: 2516582,
      enviadoPor: 'Patrícia',
      criadoEm: '2026-10-06T12:00:00Z',
    },
  ],
  tamanhoTotal: 2516582,
};

function montar(envio?: Response) {
  vi.stubGlobal(
    'fetch',
    vi.fn((entrada: string, opcoes?: RequestInit) => {
      if (opcoes?.method === 'POST') {
        return Promise.resolve(envio ?? respostaDe([], 201));
      }
      if (opcoes?.method === 'DELETE') {
        return Promise.resolve(respostaDe(undefined, 204));
      }
      if (entrada === '/api/aeronaves') {
        return Promise.resolve(respostaDe([{ id: 1, matricula: 'PS-MEP', modelo: 'Citation' }]));
      }
      return Promise.resolve(respostaDe(LISTA));
    }),
  );
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={cliente}>
      <MemoryRouter initialEntries={['/aeronaves/1/documentos']}>
        <Routes>
          <Route path="/aeronaves/:id/documentos" element={<PaginaDeDocumentos />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function chamadas() {
  return vi.mocked(fetch).mock.calls.map(([url, opcoes]) => ({
    url: String(url),
    metodo: (opcoes as RequestInit | undefined)?.method ?? 'GET',
    corpo: (opcoes as RequestInit | undefined)?.body,
  }));
}

describe('PaginaDeDocumentos', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('lista com resumo, data e tamanho legível', async () => {
    montar();

    expect(await screen.findByText('1 documento · 2,4 MB')).toBeInTheDocument();
    expect(await screen.findByText('PS-MEP')).toBeInTheDocument();
    const linha = screen.getByText('Apólice RETA 2026.pdf').closest('tr') as HTMLElement;
    expect(within(linha).getByText('2,4 MB')).toBeInTheDocument();
    expect(within(linha).getByText('enviado por Patrícia')).toBeInTheDocument();
  });

  it('envia os arquivos escolhidos como multipart, no campo "arquivos"', async () => {
    montar();

    await screen.findByText('Apólice RETA 2026.pdf');
    const pdf = new File(['%PDF'], 'CVA.pdf', { type: 'application/pdf' });
    await userEvent.upload(screen.getByLabelText('+ Adicionar documentos'), [pdf]);

    const envio = chamadas().find((chamada) => chamada.metodo === 'POST');
    expect(envio?.url).toBe('/api/aeronaves/1/documentos');
    expect((envio?.corpo as FormData).getAll('arquivos')).toEqual([pdf]);
  });

  it('arquivo acima de 20 MB nem vai ao servidor', async () => {
    montar();

    await screen.findByText('Apólice RETA 2026.pdf');
    const grande = new File(['x'], 'scan.pdf', { type: 'application/pdf' });
    Object.defineProperty(grande, 'size', { value: 21 * 1024 * 1024 });
    await userEvent.upload(screen.getByLabelText('+ Adicionar documentos'), [grande]);

    expect(screen.getByRole('alert')).toHaveTextContent('"scan.pdf" passa de 20 MB.');
    expect(chamadas().some((chamada) => chamada.metodo === 'POST')).toBe(false);
  });

  it('remover avisa que não tem volta antes de apagar', async () => {
    montar();

    await userEvent.click(
      await screen.findByRole('button', { name: 'Remover Apólice RETA 2026.pdf' }),
    );
    expect(screen.getByText('Remover? Não pode ser desfeito.')).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Sim, remover Apólice RETA 2026.pdf' }),
    );

    expect(chamadas()).toContainEqual(
      expect.objectContaining({ url: '/api/aeronaves/1/documentos/7', metodo: 'DELETE' }),
    );
  });

  it('o erro do servidor aparece com a mensagem dele', async () => {
    montar(respostaDe({ detail: 'O tipo de "x.html" não é aceito.' }, 400));

    await screen.findByText('Apólice RETA 2026.pdf');
    await userEvent.upload(screen.getByLabelText('+ Adicionar documentos'), [
      new File(['<p>'], 'x.pdf', { type: 'application/pdf' }),
    ]);

    expect(await screen.findByRole('alert')).toHaveTextContent('O tipo de "x.html" não é aceito.');
  });
});
