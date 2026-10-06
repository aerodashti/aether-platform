import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PaginaDeAvisos } from './PaginaDeAvisos';

function respostaDe(corpo: unknown, status = 200) {
  return {
    ok: status < 300,
    status,
    statusText: 'OK',
    headers: new Headers({ 'X-Request-Id': 'abc-123' }),
    json: () => Promise.resolve(corpo),
  } as unknown as Response;
}

const AVISOS = {
  avisos: [
    {
      chave: 'CVA:4:2026-09-06',
      categoria: 'DOCUMENTOS',
      gravidade: 'VENCIDO',
      titulo: 'CVA vencido',
      detalhe: 'Venceu em 06/09/2026 — a aeronave não pode voar.',
      aeronaveId: 4,
      matricula: 'PP-JHF',
      modelo: 'Pilatus PC-12 NGX',
      prazo: '2026-09-06',
      destino: '/aeronaves/4',
      lido: false,
    },
    {
      chave: 'PARAMETRO:9:3400',
      categoria: 'MANUTENCAO',
      gravidade: 'PROXIMO',
      titulo: 'Inspeção 300 h perto do limite',
      detalhe: 'Faltam 12,5 h.',
      aeronaveId: 1,
      matricula: 'PS-MEP',
      modelo: 'Citation XLS+',
      destino: '/manutencao?aeronave=1',
      lido: true,
    },
  ],
  indicadores: { ativos: 2, naoLidos: 1, vencidos: 1, proximos: 1, aeronavesEnvolvidas: 2 },
};

function Endereco() {
  const { pathname, search } = useLocation();
  return <p data-testid="endereco">{`${pathname}${search}`}</p>;
}

function montar() {
  vi.stubGlobal(
    'fetch',
    vi.fn((_: string, opcoes?: RequestInit) =>
      Promise.resolve(opcoes?.method === 'PUT' ? respostaDe(undefined, 204) : respostaDe(AVISOS)),
    ),
  );
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={cliente}>
      <MemoryRouter initialEntries={['/avisos']}>
        <Routes>
          <Route path="/avisos" element={<PaginaDeAvisos />} />
          <Route path="*" element={<Endereco />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function corpoDoPut() {
  const chamada = vi
    .mocked(fetch)
    .mock.calls.find(([, opcoes]) => (opcoes as RequestInit | undefined)?.method === 'PUT');
  return JSON.parse(String((chamada?.[1] as RequestInit).body)) as unknown;
}

describe('PaginaDeAvisos', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('mostra indicadores, o vencido primeiro e a situação de cada um', async () => {
    montar();

    const lista = await screen.findByRole('list', { name: 'Avisos' });
    const itens = within(lista).getAllByRole('listitem');
    expect(within(itens[0]!).getByText('CVA vencido')).toBeInTheDocument();
    expect(within(itens[0]!).getByText('Vencido')).toBeInTheDocument();
    expect(within(itens[1]!).getByText('Lido')).toBeInTheDocument();
    expect(screen.getByText('2 avisos ativos · 1 não lido')).toBeInTheDocument();
  });

  it('o chip filtra por categoria', async () => {
    montar();

    await userEvent.click(await screen.findByRole('tab', { name: /^Manutenção/ }));
    expect(screen.queryByText('CVA vencido')).not.toBeInTheDocument();
    expect(screen.getByText('Inspeção 300 h perto do limite')).toBeInTheDocument();
  });

  it('"Marcar todos como lidos" manda só os não lidos', async () => {
    montar();

    await userEvent.click(await screen.findByRole('button', { name: 'Marcar todos como lidos' }));
    expect(corpoDoPut()).toEqual({ chaves: ['CVA:4:2026-09-06'], lido: true });
  });

  it('o aviso lido volta a não lido, e "Abrir" leva à tela onde se resolve', async () => {
    montar();

    await userEvent.click(
      await screen.findByRole('button', {
        name: 'Marcar como não lido: Inspeção 300 h perto do limite',
      }),
    );
    expect(corpoDoPut()).toEqual({ chaves: ['PARAMETRO:9:3400'], lido: false });

    await userEvent.click(
      screen.getByRole('button', { name: 'Abrir: Inspeção 300 h perto do limite' }),
    );
    expect(screen.getByTestId('endereco')).toHaveTextContent('/manutencao?aeronave=1');
  });
});
