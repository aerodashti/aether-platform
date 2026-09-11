import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PaginaDeManutencao } from './PaginaDeManutencao';

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

const GESTORA = { nome: 'Patrícia', email: 'patricia@x.com.br', papel: 'GESTOR' };
const PILOTO = { nome: 'Caio', email: 'caio@x.com.br', papel: 'PILOTO' };

const AERONAVES = [{ id: 1, matricula: 'PS-MEP', modelo: 'Citation XLS+' }];
const PAINEL = {
  horasDeCelula: 3412.5,
  ciclos: 2890,
  parametros: [
    {
      id: 9,
      aeronaveId: 1,
      nome: 'Trem de pouso — overhaul 3.000 ciclos',
      tipo: 'CICLOS',
      limite: 3000,
      aviso: 200,
      atual: 2890,
      restante: 110,
      situacao: 'ATENCAO',
    },
    {
      id: 10,
      aeronaveId: 1,
      nome: 'Pesagem regulamentar',
      tipo: 'DATA',
      dataLimite: '2026-08-21',
      aviso: 30,
      restante: -20,
      situacao: 'ESTOURADO',
    },
  ],
  programadas: [
    {
      id: 5,
      aeronaveId: 1,
      data: '2026-09-22',
      hora: '09:00:00',
      responsavel: 'Hangar Líder — SBSP',
      descricao: 'Inspeção de 100 h — célula',
      valor: 48000,
      status: 'PROGRAMADA',
    },
  ],
  historico: [
    {
      id: 4,
      aeronaveId: 1,
      data: '2026-07-27',
      descricao: 'Troca de pneus e freios',
      valor: 36400,
      status: 'CONCLUIDA',
    },
  ],
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
      return Promise.resolve(respostaDe(PAINEL));
    }),
  );
}

describe('PaginaDeManutencao', () => {
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

  it('cada parâmetro sai julgado com a consequência em palavras', async () => {
    prepararFetch(GESTORA);
    envolver(<PaginaDeManutencao />);

    expect(await screen.findByText('Trem de pouso — overhaul 3.000 ciclos')).toBeInTheDocument();
    expect(screen.getByText('Próximo do limite')).toBeInTheDocument();
    expect(screen.getByText('faltam 110 ciclos')).toBeInTheDocument();
    expect(screen.getByText('Limite estourado')).toBeInTheDocument();
    expect(screen.getByText('estourou há 20 dias')).toBeInTheDocument();
  });

  it('as referências mostram os contadores e a contagem de próximos do limite', async () => {
    prepararFetch(GESTORA);
    envolver(<PaginaDeManutencao />);

    await screen.findByText('Trem de pouso — overhaul 3.000 ciclos');
    const proximos = screen.getByText('Próximos do limite').closest('div') as HTMLElement;
    expect(within(proximos).getByText('2')).toBeInTheDocument();
  });

  it('programadas oferecem concluir; o histórico oferece reabrir', async () => {
    prepararFetch(GESTORA);
    envolver(<PaginaDeManutencao />);

    await screen.findByText('Inspeção de 100 h — célula');
    const programadas = screen.getByRole('region', { name: 'Manutenções programadas' });
    expect(within(programadas).getByRole('button', { name: 'Concluir' })).toBeInTheDocument();

    const historico = screen.getByRole('region', { name: 'Histórico de manutenções' });
    expect(within(historico).getByRole('button', { name: 'Reabrir' })).toBeInTheDocument();
    expect(within(historico).queryByRole('button', { name: 'Concluir' })).not.toBeInTheDocument();
  });

  it('para o piloto a tela é só leitura', async () => {
    prepararFetch(PILOTO);
    envolver(<PaginaDeManutencao />);

    await screen.findByText('Inspeção de 100 h — célula');
    expect(screen.queryByRole('button', { name: 'Nova manutenção' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Concluir' })).not.toBeInTheDocument();
  });

  it('o painel de parâmetro troca a régua com o tipo', async () => {
    prepararFetch(GESTORA);
    envolver(<PaginaDeManutencao />);

    await screen.findByText('Inspeção de 100 h — célula');
    await userEvent.click(screen.getByRole('button', { name: 'Novo parâmetro' }));

    expect(screen.getByLabelText('Horas de célula no limite')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: 'Data' }));
    expect(screen.getByLabelText('Data limite')).toBeInTheDocument();
    expect(screen.queryByLabelText('Horas de célula no limite')).not.toBeInTheDocument();
  });
});
