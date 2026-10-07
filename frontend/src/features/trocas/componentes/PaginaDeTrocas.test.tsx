import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PaginaDeTrocas } from './PaginaDeTrocas';

function respostaDe(corpo: unknown) {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Headers({ 'X-Request-Id': 'abc-123' }),
    json: () => Promise.resolve(corpo),
  } as unknown as Response;
}

const GESTORA = { nome: 'Patrícia', email: 'p@x.com.br', papel: 'GESTOR' };
const PROPRIETARIO_LOGADO = { nome: 'Rubens', email: 'r@x.com.br', papel: 'PROPRIETARIO' };
const AERONAVES = [{ id: 1, matricula: 'PS-MEP', modelo: 'Citation XLS+' }];
const PROPRIETARIOS = [
  { id: 1, nome: 'Ricardo Meirelles', situacao: 'ATIVO' },
  { id: 2, nome: 'Vetor Participações', situacao: 'ATIVO' },
];
const VINCULOS = [
  { proprietarioId: 1, aeronaveId: 1, matricula: 'PS-MEP', percentual: 60 },
  { proprietarioId: 2, aeronaveId: 1, matricula: 'PS-MEP', percentual: 40 },
];
const TROCA = {
  id: 5,
  aeronaveId: 1,
  matricula: 'PS-MEP',
  modelo: 'Citation XLS+',
  data: '2026-09-20',
  cedenteId: 1,
  nomeDoCedente: 'Ricardo Meirelles',
  corDoCedente: 'PETROLEO',
  recebedorId: 2,
  nomeDoRecebedor: 'Vetor Participações',
  corDoRecebedor: 'AMBAR',
  horas: 2.5,
  km: 1320,
  valorPorHora: 14800,
  valorTotal: 37000,
  relatorioDeVoo: 'RV-2026-031',
  observacao: 'Devolução combinada em horas.',
  situacao: 'PENDENTE',
};

const OBSERVACAO = 'RV-2026-031 · Devolução combinada em horas.';

function montar(sessao: unknown, url = '/trocas') {
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
      const comDono = entrada.includes('proprietario=1');
      return Promise.resolve(
        respostaDe({
          trocas: [TROCA],
          pendentes: 1,
          concluidas: 3,
          saldo: comDono ? { proprietarioId: 1, horasADevolver: -2.5 } : null,
        }),
      );
    }),
  );
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={cliente}>
      <MemoryRouter initialEntries={[url]}>
        <PaginaDeTrocas />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function chamadas() {
  return vi.mocked(fetch).mock.calls.map(([entrada]) => String(entrada));
}

describe('PaginaDeTrocas', () => {
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

  it('mostra a troca com quem cedeu, quem recebeu e o valor total', async () => {
    montar(GESTORA);

    const linha = (await screen.findByText(OBSERVACAO)).closest('tr') as HTMLElement;
    expect(within(linha).getByText('Ricardo Meirelles')).toBeInTheDocument();
    expect(within(linha).getByText('Vetor Participações')).toBeInTheDocument();
    expect(within(linha).getByText(/total R\$\s*37\.000,00/)).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Trocas realizadas\s*3/ })).toBeInTheDocument();
  });

  it('com proprietário no filtro, diz o saldo de horas dele', async () => {
    montar(GESTORA);

    await screen.findByText(OBSERVACAO);
    // As opções do filtro vêm da lista de proprietários, por fetch: esperar por elas.
    await within(screen.getByLabelText('Filtrar por proprietário')).findByRole('option', {
      name: 'Ricardo Meirelles',
    });
    await userEvent.selectOptions(screen.getByLabelText('Filtrar por proprietário'), '1');

    expect(
      await screen.findByText('Ricardo Meirelles tem 2,5 h a receber de volta.'),
    ).toBeInTheDocument();
    expect(chamadas()).toContain('/api/trocas?situacao=PENDENTE&proprietario=1');
  });

  it('concluir pede a devolução ao servidor', async () => {
    montar(GESTORA);

    await userEvent.click(
      await screen.findByRole('button', {
        name: 'Concluir troca de Ricardo Meirelles para Vetor Participações',
      }),
    );
    expect(chamadas()).toContain('/api/trocas/5/conclusao');
  });

  it('?registrar=1 abre o painel, e quem cedeu não aparece em quem recebeu', async () => {
    montar(GESTORA, '/trocas?registrar=1');

    const painel = await screen.findByRole('dialog', { name: 'Nova troca de KM' });
    // A lista de aeronaves chega por fetch: selecionar antes de a opção existir é corrida.
    await within(painel).findByRole('option', { name: 'PS-MEP — Citation XLS+' });
    await userEvent.selectOptions(within(painel).getByLabelText('Aeronave'), '1');
    await screen.findAllByRole('option', { name: 'Ricardo Meirelles' });
    await userEvent.selectOptions(within(painel).getByLabelText('Cedeu'), '1');

    const recebeu = within(painel).getByLabelText('Recebeu');
    expect(
      within(recebeu).queryByRole('option', { name: 'Ricardo Meirelles' }),
    ).not.toBeInTheDocument();
    expect(within(painel).getByRole('button', { name: 'Registrar troca' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('o proprietário só lê: sem registrar, concluir ou editar', async () => {
    montar(PROPRIETARIO_LOGADO);

    await screen.findByText(OBSERVACAO);
    expect(screen.queryByRole('button', { name: 'Registrar troca' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Concluir/ })).not.toBeInTheDocument();
  });
});
