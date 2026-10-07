import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PaginaDeAportes } from './PaginaDeAportes';

function envolver(conteudo: ReactNode, url = '/aportes') {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={cliente}>
      <MemoryRouter initialEntries={[url]}>{conteudo}</MemoryRouter>
    </QueryClientProvider>,
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

const GESTORA = { nome: 'Patrícia', email: 'patricia@x.com.br', papel: 'GESTOR' };
const PROPRIETARIO_LOGADO = { nome: 'Rubens', email: 'rubens@x.com.br', papel: 'PROPRIETARIO' };

const AERONAVES = [
  { id: 1, matricula: 'PS-MEP', modelo: 'Citation XLS+' },
  { id: 2, matricula: 'PR-KRT', modelo: 'Phenom 300E' },
];
const PROPRIETARIOS = [
  { id: 7, nome: 'Ricardo Meirelles', situacao: 'ATIVO' },
  { id: 8, nome: 'Helena Sarraf', situacao: 'ATIVO' },
];
const VINCULOS = [
  { proprietarioId: 7, aeronaveId: 1, matricula: 'PS-MEP', percentual: 60 },
  { proprietarioId: 8, aeronaveId: 2, matricula: 'PR-KRT', percentual: 100 },
];
const APORTES = {
  aportes: [
    {
      id: 5,
      aeronaveId: 1,
      matricula: 'PS-MEP',
      proprietarioId: 7,
      nomeDoProprietario: 'Ricardo Meirelles',
      corDeIdentificacao: 'PETROLEO',
      data: '2026-10-03',
      competencia: '2026-09',
      valor: 25000,
    },
  ],
  total: 25000,
};
const RENDIMENTOS = {
  rendimentos: [
    {
      id: 9,
      aeronaveId: 1,
      matricula: 'PS-MEP',
      data: '2026-09-28',
      competencia: '2026-09',
      aplicacao: 'CDB DI',
      saldoAplicado: 104200,
      taxa: 0.91,
      valor: 948.22,
    },
  ],
  total: 948.22,
};

function prepararFetch(sessao: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn((entrada: string) => {
      if (entrada.startsWith('/api/autenticacao/sessao')) {
        return Promise.resolve(respostaDe(sessao));
      }
      if (entrada.startsWith('/api/aeronaves')) {
        return Promise.resolve(respostaDe(AERONAVES));
      }
      if (entrada.startsWith('/api/proprietarios')) {
        return Promise.resolve(respostaDe(PROPRIETARIOS));
      }
      if (entrada.startsWith('/api/participacoes/vigentes')) {
        return Promise.resolve(respostaDe(VINCULOS));
      }
      if (entrada.startsWith('/api/rendimentos')) {
        return Promise.resolve(respostaDe(RENDIMENTOS));
      }
      return Promise.resolve(respostaDe(APORTES));
    }),
  );
}

function chamadas() {
  return vi.mocked(fetch).mock.calls.map(([entrada]) => String(entrada));
}

describe('PaginaDeAportes', () => {
  beforeEach(() => {
    HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
      this.open = true;
    });
    HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
      this.open = false;
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('mostra os aportes com a competência e os indicadores do recorte', async () => {
    prepararFetch(GESTORA);
    envolver(<PaginaDeAportes />);

    const linha = (await screen.findByText('Ricardo Meirelles')).closest('tr') as HTMLElement;
    expect(within(linha).getByText('Set/26')).toBeInTheDocument();
    expect(within(linha).getByText(/25\.000,00/)).toBeInTheDocument();

    const indicadores = screen.getByRole('group', { name: 'Indicadores do recorte' });
    const entrou = within(indicadores).getByText('Entrou no fundo').parentElement as HTMLElement;
    expect(await within(entrou).findByText(/25\.948,22/)).toBeInTheDocument();
  });

  it('as abas trazem a contagem, e a de rendimentos mostra o extrato', async () => {
    prepararFetch(GESTORA);
    envolver(<PaginaDeAportes />);

    await screen.findByText('Ricardo Meirelles');
    await userEvent.click(await screen.findByRole('tab', { name: /^Rendimentos\s*1/ }));

    expect(screen.getByText('CDB DI')).toBeInTheDocument();
    expect(screen.getByText('0,91%')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Registrar rendimento' }));
    expect(screen.getByRole('region', { name: 'Novo rendimento' })).toBeInTheDocument();
  });

  it('o período manda de e até ao servidor', async () => {
    prepararFetch(GESTORA);
    envolver(<PaginaDeAportes />, '/aportes?aeronave=1');

    await screen.findByText('Ricardo Meirelles');
    await userEvent.click(screen.getByRole('radio', { name: 'Período' }));

    const ate = (screen.getByLabelText('Até') as HTMLInputElement).value;
    const de = (screen.getByLabelText('De') as HTMLInputElement).value;
    expect(chamadas()).toContain(`/api/aportes?aeronave=1&de=${de}&ate=${ate}`);
  });

  it('o período vem do link; De depois de Até é dito no campo e nem vai ao servidor', async () => {
    prepararFetch(GESTORA);
    envolver(<PaginaDeAportes />, '/aportes?modo=periodo&de=2026-10&ate=2026-01');

    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('A competência inicial vem depois da final.');
    expect(screen.getByLabelText('De')).toHaveAccessibleDescription(
      'A competência inicial vem depois da final. Vazio é sem limite.',
    );
    expect(chamadas().some((url) => url.startsWith('/api/aportes'))).toBe(false);

    await userEvent.click(within(alerta).getByRole('button', { name: 'Limpar filtros' }));
    expect(await screen.findByText('Ricardo Meirelles')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Mensal' })).toHaveAttribute('aria-checked', 'true');
  });

  it('?registrar=1 abre o painel, e o proprietário vem do contrato da aeronave', async () => {
    prepararFetch(GESTORA);
    envolver(<PaginaDeAportes />, '/aportes?aeronave=1&registrar=1');

    const dono = await screen.findByLabelText('Proprietário');
    await screen.findByRole('option', { name: 'Ricardo Meirelles' });
    expect(within(dono).queryByRole('option', { name: 'Helena Sarraf' })).not.toBeInTheDocument();
    const painel = screen.getByRole('dialog', { name: 'Registrar aporte' });
    expect(within(painel).getByRole('button', { name: 'Registrar aporte' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('aberto por ?registrar=1, o painel fecha no Cancelar e não reabre sozinho', async () => {
    prepararFetch(GESTORA);
    envolver(<PaginaDeAportes />, '/aportes?registrar=1');

    const painel = await screen.findByRole('dialog', { name: 'Registrar aporte' });
    await userEvent.click(within(painel).getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog', { name: 'Registrar aporte' })).not.toBeInTheDocument();
  });

  it('o proprietário só lê: sem registrar, editar ou excluir', async () => {
    prepararFetch(PROPRIETARIO_LOGADO);
    envolver(<PaginaDeAportes />);

    await screen.findByText('Ricardo Meirelles');
    expect(screen.queryByRole('button', { name: 'Registrar aporte' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Editar/ })).not.toBeInTheDocument();
  });
});
