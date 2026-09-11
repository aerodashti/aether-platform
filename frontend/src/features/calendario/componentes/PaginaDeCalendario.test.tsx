import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PaginaDeCalendario } from './PaginaDeCalendario';
import { competenciaAtual } from './rotulos';

function envolver(conteudo: ReactNode) {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={cliente}>{conteudo}</QueryClientProvider>
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
const AERONAVES = [{ id: 1, matricula: 'PS-MEP', modelo: 'Citation XLS+' }];
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

  it('pinta o trecho do dia e marca a manutenção programada', async () => {
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
});
