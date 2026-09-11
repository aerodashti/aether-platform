import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PaginaDeVoos } from './PaginaDeVoos';

function envolver(conteudo: ReactNode) {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={cliente}>{conteudo}</QueryClientProvider>);
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
];
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
      vooDeManutencao: true,
    },
  ],
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
      if (entrada.startsWith('/api/proprietarios')) {
        return Promise.resolve(respostaDe(PROPRIETARIOS));
      }
      return Promise.resolve(respostaDe(DIARIO));
    }),
  );
}

function linhaDe(texto: string) {
  return screen.getByText(texto).closest('tr') as HTMLElement;
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

    expect(await screen.findByText('RV-2026-041')).toBeInTheDocument();
    expect(within(linhaDe('RV-2026-041')).getByText('Ricardo Meirelles')).toBeInTheDocument();
    expect(
      within(linhaDe('RV-2026-043')).getByText('Manutenção · divide entre todos'),
    ).toBeInTheDocument();
  });

  it('a linha de TOTAIS vem do servidor, não de conta no navegador', async () => {
    prepararFetch(PILOTO);
    envolver(<PaginaDeVoos />);

    await screen.findByText('RV-2026-041');
    const totais = linhaDe('TOTAIS');
    expect(within(totais).getByText('1,2 h')).toBeInTheDocument();
    expect(within(totais).getByText('423')).toBeInTheDocument();
    expect(within(totais).getByText('2 pousos')).toBeInTheDocument();
  });

  it('o piloto lança e corrige; o proprietário só lê', async () => {
    prepararFetch(PROPRIETARIO_LOGADO);
    envolver(<PaginaDeVoos />);

    await screen.findByText('RV-2026-041');
    expect(screen.queryByRole('button', { name: 'Registrar trecho' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
  });

  it('excluir pede confirmação na própria linha', async () => {
    prepararFetch(PILOTO);
    envolver(<PaginaDeVoos />);

    await screen.findByText('RV-2026-041');
    await userEvent.click(within(linhaDe('RV-2026-041')).getByRole('button', { name: 'Excluir' }));

    expect(within(linhaDe('RV-2026-041')).getByText('Excluir?')).toBeInTheDocument();
    expect(within(linhaDe('RV-2026-041')).getByRole('button', { name: 'Não' })).toBeInTheDocument();
  });

  it('o painel de registro calcula a duração ao vivo com a regra do servidor', async () => {
    prepararFetch(PILOTO);
    envolver(<PaginaDeVoos />);

    await screen.findByText('RV-2026-041');
    await userEvent.click(screen.getByRole('button', { name: 'Registrar trecho' }));

    const partida = screen.getByLabelText('Partida prevista');
    const pouso = screen.getByLabelText('Pouso previsto');
    await userEvent.type(partida, '23:30');
    await userEvent.type(pouso, '01:00');

    // Virada de meia-noite: 1,5 h, não negativo.
    expect(screen.getByText(/Duração \(automática\): 1,5 h/)).toBeInTheDocument();
  });
});
