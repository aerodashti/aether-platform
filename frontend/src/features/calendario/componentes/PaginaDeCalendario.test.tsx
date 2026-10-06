import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PaginaDeCalendario } from './PaginaDeCalendario';
import { competenciaAtual } from './rotulos';

function OndeEstou() {
  const local = useLocation();
  return <p>em {local.pathname + local.search}</p>;
}

function envolver(conteudo: ReactNode, url = '/calendario') {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter initialEntries={[url]}>
      <QueryClientProvider client={cliente}>
        <Routes>
          <Route path="/calendario" element={conteudo} />
          <Route path="/voos" element={<OndeEstou />} />
        </Routes>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

function respostaDe(corpo: unknown) {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Headers({ 'X-Request-Id': 'abc-123' }),
    json: () => Promise.resolve(corpo),
  } as unknown as Response;
}

const SESSAO = { nome: 'Patrícia', email: 'p@x.com.br', papel: 'GESTOR' };
const AERONAVES = [
  { id: 1, matricula: 'PS-MEP', modelo: 'Citation XLS+' },
  { id: 2, matricula: 'PR-KRT', modelo: 'Phenom 300E' },
];
const HOJE = new Date().toISOString().slice(0, 10);

const DIARIO = {
  trechos: [
    {
      id: 5,
      aeronaveId: 1,
      relatorioDeVoo: 'RV-2026-041',
      numeroDoTrecho: 1,
      data: HOJE,
      origem: 'SBSP',
      destino: 'SBRJ',
      corDeIdentificacao: 'PETROLEO',
      vooDeManutencao: false,
    },
  ],
  totais: { horas: 0.8, km: 365, pousos: 1 },
};

const PAINEL = {
  horasDeCelula: 3412.5,
  ciclos: 2890,
  parametros: [],
  programadas: [
    {
      id: 7,
      aeronaveId: 1,
      data: HOJE,
      descricao: 'Inspeção de 100 h — célula',
      status: 'PROGRAMADA',
    },
  ],
  historico: [],
};

describe('PaginaDeCalendario', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function prepararFetch() {
    vi.stubGlobal(
      'fetch',
      vi.fn((entrada: string) => {
        if (entrada.startsWith('/api/autenticacao/sessao')) {
          return Promise.resolve(respostaDe(SESSAO));
        }
        if (entrada.startsWith('/api/aeronaves')) {
          return Promise.resolve(respostaDe(AERONAVES));
        }
        if (entrada.startsWith('/api/voos')) {
          return Promise.resolve(respostaDe(DIARIO));
        }
        return Promise.resolve(respostaDe(PAINEL));
      }),
    );
  }

  it('pinta o trecho do dia e marca a manutenção programada', async () => {
    prepararFetch();
    envolver(<PaginaDeCalendario />);

    expect(await screen.findByText('SBSP→SBRJ')).toBeInTheDocument();
    expect(screen.getByText('Inspeção de 100 h — célula')).toBeInTheDocument();
    // O mês corrente por extenso no cabeçalho.
    const [ano, mes] = competenciaAtual().split('-');
    expect(ano && mes).toBeTruthy();
    expect(
      screen.getByRole('button', { name: /Abrir o diário no trecho RV-2026-041/ }),
    ).toBeInTheDocument();
  });

  it('chega na aeronave da URL e o trecho abre o diário no mesmo recorte', async () => {
    prepararFetch();
    envolver(<PaginaDeCalendario />, '/calendario?aeronave=2');

    await screen.findByRole('option', { name: 'PR-KRT — Phenom 300E' });
    expect(screen.getByRole('combobox', { name: 'Aeronave' })).toHaveValue('2');
    await userEvent.click(
      await screen.findByRole('button', { name: /Abrir o diário no trecho RV-2026-041/ }),
    );

    expect(
      await screen.findByText(`em /voos?aeronave=2&competencia=${competenciaAtual()}`),
    ).toBeInTheDocument();
  });
});
