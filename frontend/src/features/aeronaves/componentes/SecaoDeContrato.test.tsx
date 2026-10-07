import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SecaoDeContrato } from './SecaoDeContrato';

function respostaDe(corpo: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: 'OK',
    headers: new Headers({ 'X-Request-Id': 'abc-123' }),
    json: () => Promise.resolve(corpo),
  } as unknown as Response;
}

function contratoCom(id: number, ricardo: number, vetor: number) {
  return {
    vigente: {
      id,
      inicioDaVigencia: '2026-07-10T12:00:00Z',
      criadoPor: 'Leonardo Andrade',
      participacoes: [
        {
          proprietarioId: 1,
          nome: 'Ricardo Meirelles',
          corDeIdentificacao: 'PETROLEO',
          percentual: ricardo,
        },
        {
          proprietarioId: 2,
          nome: 'Vetor Participações',
          corDeIdentificacao: 'AMBAR',
          percentual: vetor,
        },
      ],
    },
    historico: [],
  };
}

const ATIVOS = [
  { id: 1, nome: 'Ricardo Meirelles', corDeIdentificacao: 'PETROLEO', situacao: 'ATIVO' },
  { id: 2, nome: 'Vetor Participações', corDeIdentificacao: 'AMBAR', situacao: 'ATIVO' },
  { id: 3, nome: 'Helena Sarraf', corDeIdentificacao: 'VERDE', situacao: 'ATIVO' },
];

interface Cenario {
  /** O contrato de cada GET, em ordem; o último se repete. */
  contratos?: unknown[];
  proprietarios?: unknown[];
  /** A resposta do POST; uma função permite segurar a promessa. */
  aoDefinir?: () => Promise<Response>;
}

function montar({
  contratos = [contratoCom(10, 60, 40)],
  proprietarios = ATIVOS,
  aoDefinir,
}: Cenario = {}) {
  const leituras = [...contratos];
  const buscar = vi.fn((entrada: string, opcoes?: RequestInit) => {
    if (entrada.startsWith('/api/aeronaves/1/contratos')) {
      if (opcoes?.method === 'POST') {
        return aoDefinir ? aoDefinir() : Promise.resolve(respostaDe(contratoCom(11, 70, 30)));
      }
      return Promise.resolve(respostaDe(leituras.length > 1 ? leituras.shift() : leituras[0]));
    }
    if (entrada.startsWith('/api/proprietarios')) {
      return Promise.resolve(respostaDe(proprietarios));
    }
    return Promise.resolve(respostaDe([]));
  });
  vi.stubGlobal('fetch', buscar);
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <MemoryRouter>
      <QueryClientProvider client={cliente}>
        <SecaoDeContrato aeronaveId={1} podeGerir />
      </QueryClientProvider>
    </MemoryRouter>,
  );
  return buscar;
}

async function abrirEdicao() {
  await userEvent.click(await screen.findByRole('button', { name: 'Alterar participações' }));
}

const campo = (nome: string) => screen.getByLabelText(`Participação de ${nome} em %`);
const salvar = () => screen.getByRole('button', { name: 'Salvar novo contrato' });

/** O corpo do último POST: o que o servidor recebeu por último. */
function corpoDoPost(buscar: ReturnType<typeof montar>) {
  const chamada = buscar.mock.calls.filter(([, opcoes]) => opcoes?.method === 'POST').at(-1);
  return JSON.parse(String(chamada?.[1]?.body)) as unknown;
}

async function preencher(ricardo: string, vetor: string) {
  await userEvent.clear(campo('Ricardo Meirelles'));
  await userEvent.type(campo('Ricardo Meirelles'), ricardo);
  await userEvent.clear(campo('Vetor Participações'));
  await userEvent.type(campo('Vetor Participações'), vetor);
}

describe('SecaoDeContrato', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('salvar com um percentual vazio foca o campo e o resumo nomeia o proprietário', async () => {
    const buscar = montar();
    await abrirEdicao();

    await userEvent.clear(campo('Vetor Participações'));
    expect(salvar()).not.toHaveAttribute('aria-disabled');
    await userEvent.click(salvar());

    expect(campo('Vetor Participações')).toHaveFocus();
    expect(campo('Vetor Participações')).toHaveAccessibleDescription('Informe o percentual.');
    expect(campo('Vetor Participações')).toBeRequired();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Revise o campo Participação de Vetor Participações.',
    );
    expect(salvar()).toHaveAccessibleDescription(
      'Revise o campo Participação de Vetor Participações.',
    );
    expect(buscar.mock.calls.some(([, opcoes]) => opcoes?.method === 'POST')).toBe(false);
  });

  it('a soma diz quanto falta ou passou, e o "33.5" vale o mesmo que "33,5"', async () => {
    montar();
    await abrirEdicao();

    await userEvent.clear(campo('Ricardo Meirelles'));
    await userEvent.type(campo('Ricardo Meirelles'), '50');
    expect(screen.getByText('Faltam 10% para fechar 100%.')).toBeInTheDocument();

    await userEvent.clear(campo('Ricardo Meirelles'));
    await userEvent.type(campo('Ricardo Meirelles'), '66.5');
    expect(screen.getByText('Passou 6,5% de 100%.')).toBeInTheDocument();

    await userEvent.click(salvar());
    expect(screen.getByRole('alert')).toHaveTextContent('Revise o campo Soma das participações.');
  });

  it('manda o contrato com o vigente de que partiu e volta o foco ao "Alterar"', async () => {
    const buscar = montar();
    await abrirEdicao();

    await preencher('70', '30');
    expect(
      screen.getByText(
        'Fechado em 100%. Salvar cria um contrato novo e arquiva o atual no histórico.',
      ),
    ).toBeInTheDocument();
    await userEvent.click(salvar());

    expect(await screen.findByRole('button', { name: 'Alterar participações' })).toHaveFocus();
    expect(corpoDoPost(buscar)).toEqual({
      contratoVigenteId: 10,
      participacoes: [
        { proprietarioId: 1, percentual: 70 },
        { proprietarioId: 2, percentual: 30 },
      ],
    });
  });

  it('sem mudança, salvar fecha a edição sem ir ao servidor', async () => {
    const buscar = montar();
    await abrirEdicao();

    expect(
      screen.getByText('Fechado em 100%, sem alteração: o contrato atual continua valendo.'),
    ).toBeInTheDocument();
    await userEvent.click(salvar());

    expect(screen.getByRole('button', { name: 'Alterar participações' })).toHaveFocus();
    expect(buscar.mock.calls.some(([, opcoes]) => opcoes?.method === 'POST')).toBe(false);
  });

  it('escolher não inclui: o botão inclui e leva o foco ao percentual de quem entrou', async () => {
    montar();
    await abrirEdicao();

    const escolha = screen.getByLabelText('Adicionar proprietário ao contrato');
    await userEvent.selectOptions(escolha, '3');
    expect(screen.queryByLabelText('Participação de Helena Sarraf em %')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Incluir no contrato' }));
    expect(campo('Helena Sarraf')).toHaveFocus();
    expect(
      screen.getByText('Todos os proprietários cadastrados já estão neste contrato.'),
    ).toBeInTheDocument();
  });

  it('remover leva o foco à linha seguinte e anuncia quem saiu', async () => {
    montar();
    await abrirEdicao();

    await userEvent.click(
      screen.getByRole('button', { name: 'Remover Ricardo Meirelles do contrato' }),
    );

    expect(campo('Vetor Participações')).toHaveFocus();
    expect(screen.getByText('Ricardo Meirelles saiu do contrato em edição.')).toBeInTheDocument();
  });

  it('a recusa do servidor cai na linha do proprietário e some quando ele corrige', async () => {
    montar({
      aoDefinir: () =>
        Promise.resolve(
          respostaDe(
            {
              detail: 'Verifique os campos informados e tente novamente.',
              campos: {
                'participacoes[1].proprietarioId':
                  'Proprietário inativo não entra em contrato: reative Vetor Participações antes.',
              },
            },
            400,
          ),
        ),
    });
    await abrirEdicao();
    await preencher('70', '30');
    await userEvent.click(salvar());

    await waitFor(() =>
      expect(campo('Vetor Participações')).toHaveAccessibleDescription(
        'Proprietário inativo não entra em contrato: reative Vetor Participações antes.',
      ),
    );
    expect(campo('Vetor Participações')).toHaveFocus();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Revise o campo Participação de Vetor Participações.',
    );

    await userEvent.type(campo('Vetor Participações'), '0');
    expect(campo('Vetor Participações')).not.toHaveAccessibleDescription(/reative/);
  });

  it('se outro contrato entrou em vigor, a edição recomeça do atual com o aviso', async () => {
    let tentativas = 0;
    const desatualizado = {
      title: 'Contrato desatualizado',
      detail: 'O contrato de participação da PS-MEP mudou enquanto você editava.',
    };
    const buscar = montar({
      contratos: [contratoCom(10, 60, 40), contratoCom(12, 50, 50)],
      aoDefinir: () =>
        Promise.resolve(
          (tentativas += 1) === 1
            ? respostaDe(desatualizado, 409)
            : respostaDe(contratoCom(13, 55, 45)),
        ),
    });
    await abrirEdicao();
    await preencher('70', '30');
    await userEvent.click(salvar());

    await waitFor(() => expect(campo('Ricardo Meirelles')).toHaveValue('50'));
    expect(screen.getByRole('alert')).toHaveTextContent(/mudou enquanto você editava/);

    await preencher('55', '45');
    await userEvent.click(salvar());
    await screen.findByRole('button', { name: 'Alterar participações' });
    expect(corpoDoPost(buscar)).toMatchObject({ contratoVigenteId: 12 });
  });

  it('durante o envio, Cancelar fica inerte', async () => {
    montar({ aoDefinir: () => new Promise<Response>(() => undefined) });
    await abrirEdicao();
    await preencher('70', '30');
    await userEvent.click(salvar());

    const cancelar = screen.getByRole('button', { name: 'Cancelar' });
    expect(cancelar).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(cancelar);
    expect(campo('Ricardo Meirelles')).toBeInTheDocument();
  });

  it('sem rede, o resumo diz que não falou com o servidor', async () => {
    montar({ aoDefinir: () => Promise.reject(new TypeError('Failed to fetch')) });
    await abrirEdicao();
    await preencher('70', '30');
    await userEvent.click(salvar());

    expect(await screen.findByText(/Não foi possível falar com o servidor/)).toBeInTheDocument();
  });

  it('sem ativo para incluir, aponta o inativo e o caminho para reativá-lo', async () => {
    montar({
      proprietarios: [
        ...ATIVOS.slice(0, 2),
        { id: 4, nome: 'Otávio Lins', corDeIdentificacao: 'CINZA', situacao: 'INATIVO' },
      ],
    });
    await abrirEdicao();

    const aviso = screen.getByText(/Todos os proprietários ativos já estão neste contrato/);
    expect(aviso).toHaveTextContent(
      'Para incluir Otávio Lins, reative o cadastro em Proprietários.',
    );
    expect(within(aviso).getByRole('link', { name: 'Proprietários' })).toHaveAttribute(
      'href',
      '/proprietarios',
    );
  });
});
