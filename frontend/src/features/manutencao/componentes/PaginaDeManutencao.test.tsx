import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { hojeLocal, somarDias } from '@/compartilhado/formatacao/datas';

import { PaginaDeManutencao } from './PaginaDeManutencao';

function envolver(conteudo: ReactNode) {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={cliente}>
      <MemoryRouter>{conteudo}</MemoryRouter>
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
const PILOTO = { nome: 'Caio', email: 'caio@x.com.br', papel: 'PILOTO' };

const AERONAVES = [{ id: 1, matricula: 'PS-MEP', modelo: 'Citation XLS+' }];
// O formato real da API: o opcional ausente vem `null`, não omitido.
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
      limite: null,
      dataLimite: '2026-08-21',
      aviso: 30,
      atual: null,
      restante: -20,
      situacao: 'ESTOURADO',
    },
  ],
  programadas: [
    {
      id: 5,
      aeronaveId: 1,
      // Bem no futuro: a etiqueta "Programada" vira "Atrasada" quando a data passa.
      data: '2036-09-22',
      hora: '09:00:00',
      responsavel: 'Hangar Líder — SBSP',
      descricao: 'Inspeção de 100 h — célula',
      valor: 48000,
      status: 'PROGRAMADA',
      concluidaEm: null,
    },
  ],
  historico: [
    {
      id: 4,
      aeronaveId: 1,
      data: '2026-07-27',
      hora: null,
      responsavel: null,
      descricao: 'Troca de pneus e freios',
      valor: 36400,
      status: 'CONCLUIDA',
      concluidaEm: '2026-07-24',
    },
  ],
};

interface Servidor {
  envio?: (entrada: string, opcoes: RequestInit) => Promise<Response>;
  aeronaves?: unknown[];
  painel?: unknown;
}

function prepararFetch(
  sessao: unknown,
  {
    envio = () => Promise.resolve(respostaDe({})),
    aeronaves = AERONAVES,
    painel = PAINEL,
  }: Servidor = {},
) {
  vi.stubGlobal(
    'fetch',
    vi.fn((entrada: string, opcoes?: RequestInit) => {
      if (opcoes?.method && opcoes.method !== 'GET') {
        return envio(entrada, opcoes);
      }
      if (entrada.startsWith('/api/autenticacao/sessao')) {
        return Promise.resolve(respostaDe(sessao));
      }
      if (entrada.startsWith('/api/aeronaves')) {
        return Promise.resolve(respostaDe(aeronaves));
      }
      return Promise.resolve(respostaDe(painel));
    }),
  );
}

function envios() {
  return vi
    .mocked(fetch)
    .mock.calls.filter(([, opcoes]) => opcoes?.method && opcoes.method !== 'GET')
    .map(([entrada, opcoes]) => ({
      entrada: String(entrada),
      metodo: opcoes?.method,
      corpo: opcoes?.body ? (JSON.parse(String(opcoes.body)) as unknown) : undefined,
    }));
}

const PROGRAMADA = 'Inspeção de 100 h — célula, de 22/09/2036';
const dataEmTexto = (iso: string) => iso.split('-').reverse().join('/');
const CONCLUIDA = 'Troca de pneus e freios, de 27/07/2026';

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

  it('a aba de parâmetros julga cada um com a consequência em palavras', async () => {
    prepararFetch(GESTORA);
    envolver(<PaginaDeManutencao />);

    await userEvent.click(await screen.findByRole('tab', { name: /^Parâmetros/ }));
    const parametros = screen.getByRole('region', { name: 'Parâmetros de controle' });
    expect(
      within(parametros).getByText('Trem de pouso — overhaul 3.000 ciclos'),
    ).toBeInTheDocument();
    expect(within(parametros).getByText('Próximo do limite')).toBeInTheDocument();
    expect(within(parametros).getByText('faltam 110 ciclos')).toBeInTheDocument();
    expect(within(parametros).getByText('Limite estourado')).toBeInTheDocument();
    expect(within(parametros).getByText('estourou há 20 dias')).toBeInTheDocument();
  });

  it('o topo mostra os contadores como chips e os indicadores contam os parâmetros', async () => {
    prepararFetch(GESTORA);
    envolver(<PaginaDeManutencao />);

    await screen.findByText('Inspeção de 100 h — célula');
    expect(screen.getByText(/^Célula: /)).toBeInTheDocument();
    expect(screen.getByText(/^Ciclos: /)).toBeInTheDocument();
    const proximos = screen.getByText('Próximos do limite').closest('li') as HTMLElement;
    expect(within(proximos).getByText('1')).toBeInTheDocument();
    const estourados = screen.getByText('Limite estourado').closest('li') as HTMLElement;
    expect(within(estourados).getByText('1')).toBeInTheDocument();
  });

  it('a agenda abre primeiro e oferece concluir; o histórico oferece reabrir', async () => {
    prepararFetch(GESTORA);
    envolver(<PaginaDeManutencao />);

    await screen.findByText('Inspeção de 100 h — célula');
    const programadas = screen.getByRole('region', { name: 'Manutenções programadas' });
    expect(
      within(programadas).getByRole('button', { name: `Concluir ${PROGRAMADA}` }),
    ).toBeInTheDocument();
    expect(within(programadas).getByText('Programada')).toBeInTheDocument();
    expect(within(programadas).getByText('22/09/2036')).toBeInTheDocument();
    expect(
      screen.queryByRole('region', { name: 'Histórico de manutenções' }),
    ).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: /^Histórico/ }));
    const historico = screen.getByRole('region', { name: 'Histórico de manutenções' });
    expect(
      within(historico).getByRole('button', { name: `Reabrir ${CONCLUIDA}` }),
    ).toBeInTheDocument();
    expect(within(historico).getByText('Concluída')).toBeInTheDocument();
    expect(within(historico).queryByRole('button', { name: /^Concluir/ })).not.toBeInTheDocument();
  });

  it('para o piloto a tela é só leitura', async () => {
    prepararFetch(PILOTO);
    envolver(<PaginaDeManutencao />);

    await screen.findByText('Inspeção de 100 h — célula');
    expect(screen.queryByRole('button', { name: 'Nova manutenção' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Concluir/ })).not.toBeInTheDocument();
  });

  it('o painel de parâmetro troca a régua com o tipo', async () => {
    prepararFetch(GESTORA);
    envolver(<PaginaDeManutencao />);

    await screen.findByText('Inspeção de 100 h — célula');
    await userEvent.click(screen.getByRole('button', { name: '+ Novo parâmetro' }));

    expect(screen.getByLabelText('Limite (h de célula)')).toHaveAccessibleDescription(
      'A aeronave está com 3.412,5 h.',
    );
    await userEvent.click(screen.getByRole('radio', { name: 'Data' }));
    expect(screen.getByLabelText('Data limite')).toBeInTheDocument();
    expect(screen.queryByLabelText('Limite (h de célula)')).not.toBeInTheDocument();
  });

  it('o histórico mostra o dia da conclusão, e a data programada quando difere', async () => {
    prepararFetch(GESTORA);
    envolver(<PaginaDeManutencao />);

    await userEvent.click(await screen.findByRole('tab', { name: /^Histórico/ }));
    const historico = screen.getByRole('region', { name: 'Histórico de manutenções' });
    expect(within(historico).getByText('24/07/2026')).toBeInTheDocument();
    expect(within(historico).getByText('programada para 27/07/2026')).toBeInTheDocument();
  });

  it('concluir pede o dia em que foi feita, anuncia o resultado e leva o foco ao título', async () => {
    const hoje = hojeLocal();
    const programada = { ...PAINEL.programadas[0], data: somarDias(hoje, 10) };
    prepararFetch(GESTORA, { painel: { ...PAINEL, programadas: [programada] } });
    envolver(<PaginaDeManutencao />);
    const nome = `Inspeção de 100 h — célula, de ${dataEmTexto(programada.data)}`;

    await userEvent.click(await screen.findByRole('button', { name: `Concluir ${nome}` }));
    expect(screen.getByLabelText('Data da conclusão')).toHaveValue(hoje);
    await userEvent.click(screen.getByRole('button', { name: 'Concluir manutenção' }));

    await vi.waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        `${nome}: concluída em ${dataEmTexto(hoje)}, agora no histórico.`,
      ),
    );
    expect(envios()).toEqual([
      { entrada: '/api/manutencoes/5/conclusao', metodo: 'POST', corpo: { concluidaEm: hoje } },
    ]);
    expect(screen.getByRole('heading', { name: /^Manutenções programadas/ })).toHaveFocus();
  });

  it('a programada para daqui a anos não se conclui hoje, e o painel diz o que fazer', async () => {
    prepararFetch(GESTORA);
    envolver(<PaginaDeManutencao />);

    await userEvent.click(await screen.findByRole('button', { name: `Concluir ${PROGRAMADA}` }));
    const dia = screen.getByLabelText('Data da conclusão');
    expect(dia).toHaveAccessibleDescription(
      'Só se conclui a partir de 22/09/2035. Se ela já foi feita, corrija antes a data programada.',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Concluir manutenção' }));
    expect(dia).toHaveFocus();
    expect(envios()).toEqual([]);
  });

  it('excluir pede confirmação nomeando a manutenção, e só então apaga', async () => {
    prepararFetch(GESTORA, { envio: () => Promise.resolve(respostaDe(undefined, 204)) });
    envolver(<PaginaDeManutencao />);

    await userEvent.click(await screen.findByRole('button', { name: `Excluir ${PROGRAMADA}` }));
    const confirmacao = screen.getByRole('dialog', { name: 'Excluir manutenção' });
    expect(within(confirmacao).getByText(PROGRAMADA)).toBeInTheDocument();
    expect(within(confirmacao).getByText(/não há como desfazer/)).toBeInTheDocument();
    expect(envios()).toEqual([]);

    await userEvent.click(within(confirmacao).getByRole('button', { name: 'Excluir manutenção' }));

    await vi.waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(`${PROGRAMADA}: excluída.`),
    );
    expect(envios()).toEqual([
      { entrada: '/api/manutencoes/5', metodo: 'DELETE', corpo: undefined },
    ]);
  });

  it('a exclusão recusada fica no painel, com a mensagem do servidor', async () => {
    prepararFetch(GESTORA, {
      envio: () => Promise.resolve(respostaDe({ detail: 'Parâmetro não encontrado.' }, 404)),
    });
    envolver(<PaginaDeManutencao />);

    await userEvent.click(await screen.findByRole('tab', { name: /^Parâmetros/ }));
    await userEvent.click(
      screen.getByRole('button', { name: 'Excluir parâmetro Pesagem regulamentar' }),
    );
    const confirmacao = screen.getByRole('dialog', { name: 'Excluir parâmetro' });
    await userEvent.click(within(confirmacao).getByRole('button', { name: 'Excluir parâmetro' }));

    await vi.waitFor(() =>
      expect(within(confirmacao).getByRole('alert')).toHaveTextContent(
        'Não foi possível excluir. Parâmetro não encontrado.',
      ),
    );
  });

  it('reabrir recusado diz por quê, e só a linha clicada fica em andamento', async () => {
    let responder: (valor: Response) => void = () => undefined;
    prepararFetch(GESTORA, { envio: () => new Promise((resolver) => (responder = resolver)) });
    envolver(<PaginaDeManutencao />);

    await userEvent.click(await screen.findByRole('tab', { name: /^Histórico/ }));
    const reabrir = screen.getByRole('button', { name: `Reabrir ${CONCLUIDA}` });
    await userEvent.click(reabrir);
    expect(reabrir).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button', { name: `Excluir ${CONCLUIDA}` })).not.toHaveAttribute(
      'aria-busy',
    );

    responder(respostaDe({ detail: 'Sua sessão terminou.' }, 401));

    await vi.waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(`Não foi possível reabrir ${CONCLUIDA}.`),
    );
  });

  it('sem aeronave na frota não há o que agendar nem monitorar', async () => {
    prepararFetch(GESTORA, { aeronaves: [] });
    envolver(<PaginaDeManutencao />);

    await screen.findByRole('combobox', { name: 'Aeronave' });
    expect(screen.queryByRole('button', { name: 'Nova manutenção' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '+ Novo parâmetro' })).not.toBeInTheDocument();
  });
});
