import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PaginaDeVoos } from './PaginaDeVoos';

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

const PILOTO = { nome: 'Caio Martins', email: 'caio@x.com.br', papel: 'PILOTO' };
const PROPRIETARIO_LOGADO = { nome: 'Rubens', email: 'rubens@x.com.br', papel: 'PROPRIETARIO' };

const AERONAVES = [{ id: 1, matricula: 'PS-MEP', modelo: 'Citation XLS+' }];
const PROPRIETARIOS = [
  { id: 7, nome: 'Ricardo Meirelles', corDeIdentificacao: 'PETROLEO', situacao: 'ATIVO' },
  // Ativo, mas sem participação na PS-MEP: não pode receber atribuição dela.
  { id: 8, nome: 'Otávio Lins', corDeIdentificacao: 'AZUL', situacao: 'ATIVO' },
];
const VINCULOS = [{ aeronaveId: 1, proprietarioId: 7, matricula: 'PS-MEP', percentual: 100 }];
const DIARIO = {
  trechos: [
    {
      id: 5,
      aeronaveId: 1,
      matricula: 'PS-MEP',
      relatorioDeVoo: 'RV-2026-041',
      numeroDoTrecho: 1,
      data: '2026-09-08',
      origem: 'SBSP',
      destino: 'SBRJ',
      horas: 0.8,
      km: 365,
      partidaRealizada: '2026-09-08T11:42:00Z',
      pousoRealizado: '2026-09-08T12:31:00Z',
      proprietarioId: 7,
      nomeDoProprietario: 'Ricardo Meirelles',
      corDeIdentificacao: 'PETROLEO',
      vooDeManutencao: false,
    },
    {
      id: 6,
      aeronaveId: 1,
      matricula: 'PS-MEP',
      relatorioDeVoo: 'RV-2026-043',
      numeroDoTrecho: 1,
      data: '2026-09-09',
      origem: 'SBSP',
      destino: 'SBJD',
      horas: 0.4,
      km: 58,
      partidaRealizada: '2026-09-09T13:00:00Z',
      pousoRealizado: '2026-09-09T13:24:00Z',
      vooDeManutencao: true,
    },
    {
      // Só planejado: a grade mostra as horas previstas, mas ele ainda não voou.
      id: 7,
      aeronaveId: 1,
      matricula: 'PS-MEP',
      relatorioDeVoo: 'RV-2026-044',
      numeroDoTrecho: 1,
      data: '2026-09-20',
      origem: 'SBSP',
      destino: 'SBGL',
      horas: 1.1,
      km: 370,
      partidaPrevista: '2026-09-20T12:00:00Z',
      pousoPrevisto: '2026-09-20T13:06:00Z',
      proprietarioId: 7,
      nomeDoProprietario: 'Ricardo Meirelles',
      corDeIdentificacao: 'PETROLEO',
      vooDeManutencao: false,
    },
  ],
  // O servidor soma só o realizado: o RV-2026-044 fica de fora.
  totais: { horas: 1.2, km: 423, pousos: 2 },
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
      return Promise.resolve(respostaDe(DIARIO));
    }),
  );
}

/** A linha da grade, não a opção homônima do filtro por voo. */
function linhaDe(texto: string) {
  return within(screen.getByRole('table')).getByText(texto).closest('tr') as HTMLElement;
}

describe('PaginaDeVoos', () => {
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

  it('mostra o trecho com atribuição e o voo de manutenção sem dono', async () => {
    prepararFetch(PILOTO);
    envolver(<PaginaDeVoos />);

    expect(await screen.findByRole('cell', { name: /RV-2026-041/ })).toBeInTheDocument();
    expect(within(linhaDe('RV-2026-041')).getByText('Ricardo Meirelles')).toBeInTheDocument();
    expect(
      within(linhaDe('RV-2026-043')).getByText('Manutenção · divide entre todos'),
    ).toBeInTheDocument();
  });

  it('a linha de totais do realizado vem do servidor, não de conta no navegador', async () => {
    prepararFetch(PILOTO);
    envolver(<PaginaDeVoos />);

    await screen.findByRole('cell', { name: /RV-2026-041/ });
    const totais = linhaDe('TOTAIS REALIZADOS · 2 pousos');
    expect(within(totais).getByText('1,2 h')).toBeInTheDocument();
    expect(within(totais).getByText('423')).toBeInTheDocument();
  });

  it('chega filtrada pela URL, e ?registrar=1 abre o painel de trecho', async () => {
    prepararFetch(PILOTO);
    envolver(<PaginaDeVoos />, '/voos?aeronave=1&registrar=1');

    expect(await screen.findByLabelText('Partida prevista')).toBeInTheDocument();
    const chamadas = vi.mocked(fetch).mock.calls.map(([entrada]) => String(entrada));
    expect(chamadas.some((url) => url.startsWith('/api/voos?aeronave=1&competencia='))).toBe(true);
  });

  it('o piloto lança e corrige; o proprietário só lê', async () => {
    prepararFetch(PROPRIETARIO_LOGADO);
    envolver(<PaginaDeVoos />);

    await screen.findByRole('cell', { name: /RV-2026-041/ });
    expect(screen.queryByRole('button', { name: 'Registrar trecho' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
  });

  it('excluir pede confirmação na própria linha', async () => {
    prepararFetch(PILOTO);
    envolver(<PaginaDeVoos />);

    await screen.findByRole('cell', { name: /RV-2026-041/ });
    await userEvent.click(within(linhaDe('RV-2026-041')).getByRole('button', { name: 'Excluir' }));

    expect(within(linhaDe('RV-2026-041')).getByText('Excluir?')).toBeInTheDocument();
    expect(within(linhaDe('RV-2026-041')).getByRole('button', { name: 'Não' })).toBeInTheDocument();
  });

  it('a atribuição só oferece quem é dono da aeronave escolhida', async () => {
    prepararFetch(PILOTO);
    envolver(<PaginaDeVoos />);

    await screen.findByRole('cell', { name: /RV-2026-041/ });
    await userEvent.click(screen.getByRole('button', { name: 'Registrar trecho' }));
    const painel = screen.getByRole('dialog');
    await within(painel).findByRole('option', { name: 'PS-MEP — Citation XLS+' });
    await userEvent.selectOptions(within(painel).getByLabelText('Aeronave'), '1');

    const atribuicao = within(painel).getByLabelText('Atribuição (quem usou)');
    expect(
      await within(atribuicao).findByRole('option', { name: 'Ricardo Meirelles' }),
    ).toBeInTheDocument();
    expect(within(atribuicao).queryByRole('option', { name: 'Otávio Lins' })).toBeNull();
  });

  it('numa aeronave, mostra o % de uso de cada proprietário; o filtro por voo recorta a grade', async () => {
    prepararFetch(PILOTO);
    envolver(<PaginaDeVoos />, '/voos?aeronave=1');

    const usos = await screen.findByRole('list', { name: 'Uso da aeronave por proprietário' });
    expect(within(usos).getByText('Ricardo Meirelles')).toBeInTheDocument();
    expect(within(usos).getByText('100%')).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText('Filtrar por voo'), 'RV-2026-043');
    expect(within(screen.getByRole('table')).queryByText('RV-2026-041')).not.toBeInTheDocument();
    const totais = linhaDe('TOTAIS REALIZADOS · 1 pouso');
    expect(within(totais).getByText('0,4 h')).toBeInTheDocument();
    expect(within(totais).getByText('58')).toBeInTheDocument();
  });

  it('filtrado por um voo só planejado, a grade o mostra e os totais do realizado ficam zerados', async () => {
    prepararFetch(PILOTO);
    envolver(<PaginaDeVoos />, '/voos?aeronave=1');

    await screen.findByRole('cell', { name: /RV-2026-041/ });
    await userEvent.selectOptions(screen.getByLabelText('Filtrar por voo'), 'RV-2026-044');

    expect(within(linhaDe('RV-2026-044')).getByText('1,1 h')).toBeInTheDocument();
    const totais = linhaDe('TOTAIS REALIZADOS · 0 pousos');
    expect(within(totais).getByText('0 h')).toBeInTheDocument();
    expect(within(totais).getByText('0')).toBeInTheDocument();
  });
});
