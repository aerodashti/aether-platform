import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PaginaDeCustos } from './PaginaDeCustos';

function envolver(conteudo: ReactNode, url = '/') {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={cliente}>
      <MemoryRouter initialEntries={[url]}>{conteudo}</MemoryRouter>
    </QueryClientProvider>,
  );
}

function respostaDe(corpo: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: 'OK',
    headers: new Headers({ 'X-Request-Id': 'abc-123' }),
    json: () => Promise.resolve(corpo),
  } as unknown as Response;
}

const GESTORA = { nome: 'Patrícia', email: 'patricia@x.com.br', papel: 'GESTOR' };
const PROPRIETARIO_LOGADO = { nome: 'Rubens', email: 'rubens@x.com.br', papel: 'PROPRIETARIO' };

const AERONAVES = [{ id: 1, matricula: 'PS-MEP', modelo: 'Citation XLS+' }];
const PROPRIETARIOS = [
  { id: 7, nome: 'Ricardo Meirelles', corDeIdentificacao: 'PETROLEO', situacao: 'ATIVO' },
  // Ativo, mas sem participação na PS-MEP: não pode receber atribuição dela.
  { id: 8, nome: 'Otávio Lins', corDeIdentificacao: 'AZUL', situacao: 'ATIVO' },
];
const VINCULOS = [{ aeronaveId: 1, proprietarioId: 7, matricula: 'PS-MEP', percentual: 100 }];
const LANCAMENTOS = {
  custos: [
    {
      id: 5,
      aeronaveId: 1,
      matricula: 'PS-MEP',
      tipo: 'VARIAVEL',
      categoria: 'ABASTECIMENTO',
      data: '2026-09-08',
      descricao: 'Jet A-1 — 1.850 L — SBRJ',
      relatorioDeVoo: 'RV-2026-041',
      proprietarioId: 7,
      nomeDoProprietario: 'Ricardo Meirelles',
      corDeIdentificacao: 'PETROLEO',
      rateado: false,
      notaFiscal: 'NF 88.213',
      moeda: 'BRL',
      valor: 15725,
    },
    {
      id: 6,
      aeronaveId: 1,
      matricula: 'PS-MEP',
      tipo: 'FIXO',
      categoria: 'HANGARAGEM',
      data: '2026-09-01',
      descricao: 'Hangaragem mensal — Congonhas',
      rateado: true,
      moeda: 'USD',
      valorOriginal: 1200,
      cambio: 4.9223,
      valor: 5906.76,
    },
  ],
  totais: { fixos: 5906.76, variaveis: 15725, total: 21631.76 },
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
      if (entrada.startsWith('/api/participacoes/vigentes')) {
        return Promise.resolve(respostaDe(VINCULOS));
      }
      if (entrada.startsWith('/api/proprietarios')) {
        return Promise.resolve(respostaDe(PROPRIETARIOS));
      }
      return Promise.resolve(respostaDe(LANCAMENTOS));
    }),
  );
}

function linhaDe(texto: string) {
  return screen.getByText(texto).closest('tr') as HTMLElement;
}

describe('PaginaDeCustos', () => {
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

  it('mostra o lançamento atribuído e o rateado, com o USD já em BRL', async () => {
    prepararFetch(GESTORA);
    envolver(<PaginaDeCustos />);

    expect(await screen.findByText('Jet A-1 — 1.850 L — SBRJ')).toBeInTheDocument();
    expect(
      within(linhaDe('Jet A-1 — 1.850 L — SBRJ')).getByText('Ricardo Meirelles'),
    ).toBeInTheDocument();
    const rateada = linhaDe('Hangaragem mensal — Congonhas');
    expect(within(rateada).getByText('Rateio entre os proprietários')).toBeInTheDocument();
    expect(within(rateada).getByText(/5\.906,76/)).toBeInTheDocument();
  });

  it('o TOTAL separa fixos de variáveis, somado no servidor', async () => {
    prepararFetch(GESTORA);
    envolver(<PaginaDeCustos />);

    await screen.findByText('Jet A-1 — 1.850 L — SBRJ');
    const totais = screen.getByRole('group', { name: 'Totais do recorte' });
    const fixos = within(totais).getByText('Fixos').closest('div') as HTMLElement;
    expect(within(fixos).getByText(/5\.906,76/)).toBeInTheDocument();
    const total = within(totais).getByText('Total').closest('div') as HTMLElement;
    expect(within(total).getByText(/21\.631,76/)).toBeInTheDocument();
  });

  it('o escopo e as abas de categoria recortam a lista localmente, com contagem', async () => {
    prepararFetch(GESTORA);
    envolver(<PaginaDeCustos />);

    await screen.findByText('Jet A-1 — 1.850 L — SBRJ');
    expect(screen.getByRole('tab', { name: /^Todas/ })).toHaveAttribute('aria-selected', 'true');

    await userEvent.click(screen.getByRole('radio', { name: 'Fixos' }));
    expect(screen.queryByText('Jet A-1 — 1.850 L — SBRJ')).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /^Abastecimento/ })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('radio', { name: 'Todos' }));
    await userEvent.click(screen.getByRole('tab', { name: /^Abastecimento/ }));
    expect(screen.getByText('Jet A-1 — 1.850 L — SBRJ')).toBeInTheDocument();
  });

  it('o filtro por voo mostra só os lançamentos daquele Rel. Voo', async () => {
    prepararFetch(GESTORA);
    envolver(<PaginaDeCustos />);

    await screen.findByText('Jet A-1 — 1.850 L — SBRJ');
    await userEvent.selectOptions(screen.getByLabelText('Filtrar por voo'), 'RV-2026-041');

    expect(screen.getByText('Jet A-1 — 1.850 L — SBRJ')).toBeInTheDocument();
    expect(screen.queryByText('Hangaragem mensal — Congonhas')).not.toBeInTheDocument();
  });

  it('chega filtrada pela URL: ?aeronave= e ?competencia= vão direto ao servidor', async () => {
    prepararFetch(GESTORA);
    envolver(<PaginaDeCustos />, '/custos?aeronave=1&competencia=2026-08');

    await screen.findByText('Jet A-1 — 1.850 L — SBRJ');
    const chamadas = vi.mocked(fetch).mock.calls.map(([entrada]) => String(entrada));
    expect(chamadas).toContain('/api/custos?aeronave=1&competencia=2026-08');
  });

  it('competência fora do formato na URL: o campo diz o formato e a grade nem consulta', async () => {
    prepararFetch(GESTORA);
    envolver(<PaginaDeCustos />, '/custos?competencia=2026-13');

    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('Use o formato AAAA-MM, como 2026-10.');
    expect(screen.getByLabelText('Competência')).toHaveAccessibleDescription(
      /Use o formato AAAA-MM/,
    );
    const chamadas = () => vi.mocked(fetch).mock.calls.map(([entrada]) => String(entrada));
    expect(chamadas().some((url) => url.startsWith('/api/custos'))).toBe(false);

    await userEvent.click(within(alerta).getByRole('button', { name: 'Limpar filtros' }));
    expect(await screen.findByText('Jet A-1 — 1.850 L — SBRJ')).toBeInTheDocument();
    expect(chamadas()).toContain('/api/custos?');
  });

  it('a aeronave do link fora da frota volta a todas, e o filtro avisa', async () => {
    prepararFetch(GESTORA);
    envolver(<PaginaDeCustos />, '/custos?aeronave=9999&competencia=2026-08');

    expect(await screen.findByText('A aeronave do link não foi encontrada.')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Filtrar por aeronave' })).toHaveValue('');
    const chamadas = vi.mocked(fetch).mock.calls.map(([entrada]) => String(entrada));
    expect(chamadas).toContain('/api/custos?competencia=2026-08');
  });

  it('a recusa do recorte pelo servidor aparece como veio, com Limpar filtros', async () => {
    prepararFetch(GESTORA);
    const padrao = vi.mocked(fetch).getMockImplementation();
    vi.mocked(fetch).mockImplementation((entrada, opcoes) =>
      String(entrada).startsWith('/api/custos')
        ? Promise.resolve(respostaDe({ detail: 'O período vai até dez anos.' }, 400))
        : (padrao?.(entrada, opcoes) as Promise<Response>),
    );
    envolver(<PaginaDeCustos />);

    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('O período vai até dez anos.');
    expect(within(alerta).getByRole('button', { name: 'Limpar filtros' })).toBeInTheDocument();
    expect(within(alerta).queryByRole('button', { name: 'Tentar de novo' })).toBeNull();
  });

  it('?registrar=1 abre o painel de novo lançamento, como pede o "+ Registrar" da casca', async () => {
    prepararFetch(GESTORA);
    envolver(<PaginaDeCustos />, '/custos?registrar=1');

    expect(await screen.findByLabelText('Categoria')).toBeInTheDocument();
  });

  it('o proprietário só lê: sem registrar, editar ou excluir', async () => {
    prepararFetch(PROPRIETARIO_LOGADO);
    envolver(<PaginaDeCustos />);

    await screen.findByText('Jet A-1 — 1.850 L — SBRJ');
    expect(screen.queryByRole('button', { name: 'Registrar custo' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
  });

  it('a categoria é filha do tipo: trocar o tipo zera e refiltra a lista', async () => {
    prepararFetch(GESTORA);
    envolver(<PaginaDeCustos />);

    await screen.findByText('Jet A-1 — 1.850 L — SBRJ');
    await userEvent.click(screen.getByRole('button', { name: 'Registrar custo' }));

    const categoria = screen.getByLabelText('Categoria');
    expect(within(categoria).getByText('Abastecimento')).toBeInTheDocument();
    expect(within(categoria).queryByText('Hangaragem')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('radio', { name: 'Custo Fixo' }));
    expect(within(categoria).getByText('Hangaragem')).toBeInTheDocument();
    expect(within(categoria).queryByText('Abastecimento')).not.toBeInTheDocument();
  });

  it('em USD a conversão aparece ao vivo e o câmbio vira obrigatório', async () => {
    prepararFetch(GESTORA);
    envolver(<PaginaDeCustos />);

    await screen.findByText('Jet A-1 — 1.850 L — SBRJ');
    await userEvent.click(screen.getByRole('button', { name: 'Registrar custo' }));
    await userEvent.click(screen.getByRole('radio', { name: 'USD' }));

    await userEvent.type(screen.getByLabelText('Valor (US$)'), '1200');
    await userEvent.type(screen.getByLabelText('Câmbio do dia (R$ por US$ 1)'), '4,9223');

    expect(screen.getByText(/= R\$\s*5\.906,76/)).toBeInTheDocument();
  });
});
