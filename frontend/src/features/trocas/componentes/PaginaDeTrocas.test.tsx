import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { hojeLocal } from '@/compartilhado/formatacao/datas';

import { PaginaDeTrocas } from './PaginaDeTrocas';

function respostaDe(corpo: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
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

const DEVOLVIDA = { ...TROCA, situacao: 'CONCLUIDA', concluidaEm: '2026-10-03' };

const OBSERVACAO = 'RV-2026-031 · Devolução combinada em horas.';

type Responder = (entrada: string) => Promise<Response>;

function montar(
  sessao: unknown,
  url = '/trocas',
  envio: Responder = () => Promise.resolve(respostaDe(TROCA)),
) {
  vi.stubGlobal(
    'fetch',
    vi.fn((entrada: string, opcoes?: RequestInit) => {
      if (opcoes?.method && opcoes.method !== 'GET') {
        return envio(entrada);
      }
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
          trocas: [entrada.includes('situacao=CONCLUIDA') ? DEVOLVIDA : TROCA],
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

function envios() {
  return vi
    .mocked(fetch)
    .mock.calls.filter(([, opcoes]) => opcoes?.method && opcoes.method !== 'GET')
    .map(([entrada, opcoes]) => ({
      entrada: String(entrada),
      corpo: opcoes?.body === undefined ? undefined : (JSON.parse(String(opcoes.body)) as unknown),
    }));
}

async function abrirRealizadas() {
  await screen.findByText(OBSERVACAO);
  await userEvent.click(screen.getByRole('tab', { name: /Trocas realizadas/ }));
  return screen.findByRole('button', {
    name: 'Reabrir troca de Ricardo Meirelles para Vetor Participações',
  });
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

  it('o proprietário do filtro vem do link, e recarregar não o perde', async () => {
    montar(GESTORA, '/trocas?proprietario=1');

    expect(
      await screen.findByText('Ricardo Meirelles tem 2,5 h a receber de volta.'),
    ).toBeInTheDocument();
    expect(chamadas()).toContain('/api/trocas?situacao=PENDENTE&proprietario=1');
  });

  it('concluir pede a data da devolução, envia e anuncia para onde a troca foi', async () => {
    montar(GESTORA);

    await userEvent.click(
      await screen.findByRole('button', {
        name: 'Concluir troca de Ricardo Meirelles para Vetor Participações',
      }),
    );
    const painel = screen.getByRole('dialog', { name: 'Concluir troca de KM' });
    expect(within(painel).getByLabelText('Data da devolução')).toHaveValue(hojeLocal());
    await userEvent.click(within(painel).getByRole('button', { name: 'Concluir troca' }));

    expect(envios()).toEqual([
      { entrada: '/api/trocas/5/conclusao', corpo: { concluidaEm: hojeLocal() } },
    ]);
    expect(
      await screen.findByText('Troca concluída e movida para Trocas realizadas.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Trocas pendentes' })).toHaveFocus();
  });

  it('a devolução antes da troca fica no campo, sem ir ao servidor', async () => {
    montar(GESTORA);

    await userEvent.click(
      await screen.findByRole('button', {
        name: 'Concluir troca de Ricardo Meirelles para Vetor Participações',
      }),
    );
    const painel = screen.getByRole('dialog', { name: 'Concluir troca de KM' });
    const data = within(painel).getByLabelText('Data da devolução');
    expect(data).toHaveAttribute('min', '2026-09-20');
    fireEvent.change(data, { target: { value: '2026-09-19' } });
    await userEvent.click(within(painel).getByRole('button', { name: 'Concluir troca' }));

    expect(data).toHaveAccessibleDescription(
      /^A devolução não pode ser antes da troca, de 20\/09\/2026\./,
    );
    expect(data).toHaveFocus();
    expect(envios()).toEqual([]);
  });

  it('reabrir pede confirmação, dizendo que a data da devolução se perde', async () => {
    montar(GESTORA);

    await userEvent.click(await abrirRealizadas());
    const painel = screen.getByRole('dialog', { name: 'Reabrir troca de KM' });
    expect(
      within(painel).getByText(
        'A devolução registrada em 03/10/2026 será descartada: ao concluir de novo, informe a data outra vez.',
      ),
    ).toBeInTheDocument();
    expect(envios()).toEqual([]);

    await userEvent.click(within(painel).getByRole('button', { name: 'Reabrir troca' }));

    expect(envios()).toEqual([{ entrada: '/api/trocas/5/reabertura', corpo: undefined }]);
    expect(
      await screen.findByText('Troca reaberta e de volta em Trocas pendentes.'),
    ).toBeInTheDocument();
  });

  it('a falha ao reabrir aparece no painel, que continua aberto', async () => {
    montar(GESTORA, '/trocas', () => Promise.resolve(respostaDe({}, 500)));

    await userEvent.click(await abrirRealizadas());
    const painel = screen.getByRole('dialog', { name: 'Reabrir troca de KM' });
    await userEvent.click(within(painel).getByRole('button', { name: 'Reabrir troca' }));

    expect(
      await within(painel).findByText(
        'O servidor não conseguiu responder agora. Tente de novo em instantes.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Reabrir troca de KM' })).toBeInTheDocument();
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
    // O botão não fica inerte por validação: ao clicar, ele diz o que falta.
    expect(within(painel).getByRole('button', { name: 'Registrar troca' })).not.toHaveAttribute(
      'aria-disabled',
    );
  });

  it('o proprietário só lê: sem registrar, concluir ou editar', async () => {
    montar(PROPRIETARIO_LOGADO);

    await screen.findByText(OBSERVACAO);
    expect(screen.queryByRole('button', { name: 'Registrar troca' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Concluir/ })).not.toBeInTheDocument();
  });
});
