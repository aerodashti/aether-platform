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

  it('a linha de TOTAIS vem do servidor, não de conta no navegador', async () => {
    prepararFetch(PILOTO);
    envolver(<PaginaDeVoos />);

    await screen.findByRole('cell', { name: /RV-2026-041/ });
    const totais = linhaDe('TOTAIS · 2 pousos');
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

  it('o painel de registro calcula a duração ao vivo com a regra do servidor', async () => {
    prepararFetch(PILOTO);
    envolver(<PaginaDeVoos />);

    await screen.findByRole('cell', { name: /RV-2026-041/ });
    await userEvent.click(screen.getByRole('button', { name: 'Registrar trecho' }));

    const partida = screen.getByLabelText('Partida prevista');
    const pouso = screen.getByLabelText('Pouso previsto');
    await userEvent.type(partida, '23:30');
    await userEvent.type(pouso, '01:00');

    // Virada de meia-noite: 1,5 h, não negativo.
    expect(screen.getByText(/Duração \(automática\): 1,5 h/)).toBeInTheDocument();
    expect(screen.getByText(/Pouso no dia seguinte/)).toBeInTheDocument();
  });
  it('a recusa do servidor aparece junto do botão, dizendo qual campo falhou', async () => {
    prepararFetch(PILOTO);
    const buscarPadrao = vi.mocked(fetch).getMockImplementation();
    vi.mocked(fetch).mockImplementation((entrada, opcoes) =>
      opcoes?.method === 'POST'
        ? Promise.resolve(
            respostaDe(
              {
                detail: 'Verifique os campos informados e tente novamente.',
                campos: { km: 'Os quilômetros precisam ser maiores que zero.' },
              },
              400,
            ),
          )
        : (buscarPadrao as typeof fetch)(entrada, opcoes),
    );
    envolver(<PaginaDeVoos />);

    await screen.findByRole('cell', { name: /RV-2026-041/ });
    await userEvent.click(screen.getByRole('button', { name: 'Registrar trecho' }));
    const painel = screen.getByRole('dialog');
    await within(painel).findByRole('option', { name: 'PS-MEP — Citation XLS+' });
    await userEvent.selectOptions(within(painel).getByLabelText('Aeronave'), '1');
    await userEvent.type(within(painel).getByLabelText('Rel. Voo'), 'RV-2026-044');
    await userEvent.type(within(painel).getByLabelText('Data do trecho'), '2026-10-05');
    await userEvent.type(within(painel).getByLabelText('Origem'), 'SBSP');
    await userEvent.type(within(painel).getByLabelText('Destino'), 'SBGR');
    await userEvent.type(within(painel).getByLabelText('KM'), '0');
    await userEvent.click(within(painel).getByRole('button', { name: 'Registrar trecho' }));

    expect(await within(painel).findByRole('alert')).toHaveTextContent(
      'Os quilômetros precisam ser maiores que zero.',
    );
    expect(within(painel).getByLabelText('Rel. Voo')).not.toHaveAttribute('aria-invalid', 'true');
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
    expect(linhaDe('TOTAIS · 1 pouso')).toBeInTheDocument();
  });
});
