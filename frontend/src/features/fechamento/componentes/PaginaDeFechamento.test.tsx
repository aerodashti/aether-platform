import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PaginaDeFechamento } from './PaginaDeFechamento';

function respostaDe(corpo: unknown) {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Headers({ 'X-Request-Id': 'abc-123' }),
    json: () => Promise.resolve(corpo),
  } as unknown as Response;
}

const AERONAVES = [{ id: 1, matricula: 'PS-MEP', modelo: 'Citation XLS+' }];
const linha = (id: number, nome: string, pct: number, saldo: number) => ({
  proprietarioId: id,
  nome,
  corDeIdentificacao: 'PETROLEO',
  percentual: pct,
  horas: 2,
  percentualDeUso: 50,
  custoFixo: 1000,
  custoVariavel: 500,
  totalDoMes: 1500,
  aportes: 2000,
  rendimentos: 10,
  saldoAnterior: -200,
  saldoAcumulado: saldo,
});
const MENSAL = {
  aeronaveId: 1,
  matricula: 'PS-MEP',
  competencia: '2026-09',
  baseDoRateio: 'POR_USO',
  modeloDeAporte: 'FIXO',
  indicadores: {
    horas: 4,
    custosFixos: 2000,
    custosVariaveis: 1000,
    totalDeCustos: 3000,
    aportes: 4000,
    rendimentos: 20,
    resultado: 1020,
  },
  linhas: [linha(1, 'Ricardo Meirelles', 60, 310), linha(2, 'Vetor Participações', 40, -90)],
  totais: { percentual: 100, horas: 4, totalDoMes: 3000, saldoAcumulado: 220 },
  naoRateado: 350,
  saldoInicialDoFundo: -800,
  saldoFinalDoFundo: 220,
};
const PERIODO = {
  aeronaveId: 1,
  matricula: 'PS-MEP',
  de: '2026-08',
  ate: '2026-09',
  baseDoRateio: 'POR_USO',
  modeloDeAporte: 'FIXO',
  competencias: [
    { competencia: '2026-08', horas: 3, totalDeCustos: 2000, resultado: -500, saldoFinal: -800 },
    { competencia: '2026-09', horas: 4, totalDeCustos: 3000, resultado: 1020, saldoFinal: 220 },
  ],
  totais: {
    competencia: '2026-09',
    horas: 7,
    totalDeCustos: 5000,
    resultado: 520,
    saldoFinal: 220,
  },
};

function montar(url = '/fechamento?competencia=2026-09') {
  vi.stubGlobal(
    'fetch',
    vi.fn((entrada: string) => {
      if (entrada.startsWith('/api/aeronaves')) {
        return Promise.resolve(respostaDe(AERONAVES));
      }
      if (entrada.startsWith('/api/fechamentos/periodo')) {
        return Promise.resolve(respostaDe(PERIODO));
      }
      return Promise.resolve(respostaDe(MENSAL));
    }),
  );
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={cliente}>
      <MemoryRouter initialEntries={[url]}>
        <PaginaDeFechamento />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function chamadas() {
  return vi.mocked(fetch).mock.calls.map(([entrada]) => String(entrada));
}

describe('PaginaDeFechamento', () => {
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

  it('sem aeronave na URL, fecha a primeira da frota, e mostra uma linha por proprietário', async () => {
    montar();

    const ricardo = (await screen.findByText('Ricardo Meirelles')).closest('tr') as HTMLElement;
    expect(within(ricardo).getByText('60%')).toBeInTheDocument();
    expect(chamadas()).toContain('/api/fechamentos/mensal?aeronave=1&competencia=2026-09');
    expect(screen.getByText('Rateio: por uso (horas)')).toBeInTheDocument();
  });

  it('avisa quando houve custo sem contrato para ratear', async () => {
    montar();

    expect(await screen.findByRole('note')).toHaveTextContent(
      /R\$\s*350,00 em custos ficaram sem rateio/,
    );
  });

  it('período invertido: o campo De diz o porquê, e nada de outro período fica na tela', async () => {
    montar('/fechamento?aeronave=1&modo=periodo&de=2026-12&ate=2026-10');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'A competência inicial vem depois da final.',
    );
    expect(screen.getByRole('radio', { name: 'Período' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByLabelText(/^De/)).toHaveAccessibleDescription(
      'A competência inicial vem depois da final.',
    );
    expect(screen.queryByRole('group', { name: 'Indicadores do fechamento' })).toBeNull();
    expect(chamadas().some((url) => url.startsWith('/api/fechamentos/periodo'))).toBe(false);
  });

  it('competência além da janela do servidor nem é pedida', async () => {
    montar('/fechamento?aeronave=1&competencia=9999-12');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /Use uma competência de 01\/2000 até/,
    );
    expect(chamadas().some((url) => url.startsWith('/api/fechamentos/mensal'))).toBe(false);
  });

  it('sem aeronave na frota, pede o cadastro em vez de calcular para sempre', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(respostaDe([]))),
    );
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={['/fechamento']}>
          <PaginaDeFechamento />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(
      await screen.findByText('Cadastre uma aeronave para ver o fechamento.'),
    ).toBeInTheDocument();
  });

  it('o nome abre o extrato, que vai do saldo anterior ao acumulado', async () => {
    montar();

    await userEvent.click(await screen.findByRole('button', { name: /Vetor Participações/ }));
    const extrato = screen.getByRole('dialog', { name: 'Extrato · Vetor Participações' });
    const acumulado = within(extrato).getByText('Saldo acumulado').parentElement as HTMLElement;
    expect(
      within(acumulado).getByText(/-R\$\s*90,00|−R\$\s*90,00|R\$\s*-90,00/),
    ).toBeInTheDocument();
    const resultado = within(extrato).getByText('Resultado do mês').parentElement as HTMLElement;
    expect(within(resultado).getByText(/510,00/)).toBeInTheDocument();
  });

  it('o período lista as competências, e clicar numa abre o fechamento do mês', async () => {
    montar('/fechamento?aeronave=1');

    await screen.findByText('Ricardo Meirelles');
    await userEvent.click(screen.getByRole('radio', { name: 'Período' }));
    // As regras da aeronave e o recorte aparecem no período também, como no mensal.
    expect(await screen.findByText(/^Rateio:/)).toBeInTheDocument();
    expect(screen.getByText(/· PS-MEP$/)).toBeInTheDocument();
    await userEvent.click(await screen.findByRole('button', { name: /Ago\/26/ }));

    expect(screen.getByRole('radio', { name: 'Mensal' })).toHaveAttribute('aria-checked', 'true');
    expect(chamadas()).toContain('/api/fechamentos/mensal?aeronave=1&competencia=2026-08');
  });
});
