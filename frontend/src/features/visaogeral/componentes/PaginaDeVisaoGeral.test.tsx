import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PaginaDeVisaoGeral } from './PaginaDeVisaoGeral';

function respostaDe(corpo: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: 'OK',
    headers: new Headers({ 'X-Request-Id': 'abc-123' }),
    json: () => Promise.resolve(corpo),
  } as unknown as Response;
}

const AERONAVES = [
  { id: 1, matricula: 'PS-MEP', modelo: 'Citation XLS+', situacaoRegular: 'VENCIDO' },
  { id: 2, matricula: 'PR-KRT', modelo: 'Phenom 300E', situacaoRegular: 'REGULAR' },
  { id: 3, matricula: 'PT-XLB', modelo: 'AW109', situacaoRegular: 'REGULAR' },
  { id: 4, matricula: 'PS-FUM', modelo: 'PC-24', situacaoRegular: 'ATENCAO' },
];
const RESUMOS = [
  {
    aeronaveId: 1,
    saldoDoFundo: 131945.81,
    custosFixos: 4980,
    custosVariaveis: 21631.76,
    horas: 4.8,
    coberturaEmMeses: 5,
  },
  { aeronaveId: 2, saldoDoFundo: -12500, custosFixos: 0, custosVariaveis: 0, horas: 0 },
  { aeronaveId: 3, saldoDoFundo: 0, custosFixos: 1000, custosVariaveis: 0, horas: 0 },
  {
    aeronaveId: 4,
    saldoDoFundo: 50000,
    custosFixos: 0,
    custosVariaveis: 0,
    horas: 0,
    coberturaEmMeses: 12,
  },
];
const AVISOS = {
  avisos: [
    { chave: 'a', aeronaveId: 1, titulo: 'Limite estourado: Pesagem', gravidade: 'VENCIDO' },
    { chave: 'b', aeronaveId: 1, titulo: 'CHT vencido', gravidade: 'VENCIDO' },
    { chave: 'c', aeronaveId: 1, titulo: 'Trem de pouso perto do limite', gravidade: 'PROXIMO' },
  ],
  indicadores: {},
};
const DIARIO = {
  trechos: [
    { id: 1, aeronaveId: 1, km: 365 },
    { id: 2, aeronaveId: 1, km: 58 },
  ],
  totais: { pousos: 2 },
};

function montar() {
  vi.stubGlobal(
    'fetch',
    vi.fn((entrada: string) => {
      if (entrada.startsWith('/api/aeronaves')) return Promise.resolve(respostaDe(AERONAVES));
      if (entrada.startsWith('/api/fechamentos/frota')) return Promise.resolve(respostaDe(RESUMOS));
      if (entrada.startsWith('/api/avisos')) return Promise.resolve(respostaDe(AVISOS));
      return Promise.resolve(respostaDe(DIARIO));
    }),
  );
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={cliente}>
      <MemoryRouter>
        <PaginaDeVisaoGeral />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('PaginaDeVisaoGeral', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('os indicadores somam a frota: saldo, custos do mês, horas e alertas', async () => {
    montar();

    const indicadores = await screen.findByRole('group', { name: 'Indicadores da frota' });
    expect(within(indicadores).getByText('1 fundo descoberto')).toBeInTheDocument();
    expect(within(indicadores).getByText('4,8 h')).toBeInTheDocument();
    expect(within(indicadores).getByText('2 pousos')).toBeInTheDocument();
    expect(within(indicadores).getByText('2 vencidos — exigem ação')).toBeInTheDocument();
  });

  it('a frota gerenciada mostra as três que mais pedem atenção, na ordem', async () => {
    montar();

    const frota = await screen.findByRole('list', { name: 'Frota gerenciada' });
    const matriculas = within(frota)
      .getAllByRole('link')
      .map((link) => link.textContent);
    // Vencida primeiro, depois a de atenção, e entre as regulares a de fundo descoberto.
    expect(matriculas).toEqual(['PS-MEP', 'PS-FUM', 'PR-KRT']);
    expect(screen.getByText('Mostrando as 3 que exigem mais atenção de 4')).toBeInTheDocument();
    const psMep = within(frota).getByRole('list', { name: 'Avisos da PS-MEP' });
    expect(within(psMep).getByText('+1')).toBeInTheDocument();
    expect(within(frota).getByText('423', { exact: false })).toBeInTheDocument();
  });

  it('o comparativo traz os três gráficos com a aeronave que voou', async () => {
    montar();

    const horasVoadas = await screen.findByRole('list', { name: 'Mais horas voadas' });
    expect(within(horasVoadas).getByText('PS-MEP')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Maior custo por hora voada' })).toBeInTheDocument();
    expect(
      within(
        screen.getByRole('list', { name: 'Maiores custos do mês — fixo vs variável' }),
      ).getAllByRole('listitem'),
    ).toHaveLength(2);
  });
});
