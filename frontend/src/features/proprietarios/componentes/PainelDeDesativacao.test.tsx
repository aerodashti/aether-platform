import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProprietarioResponse } from '../api/useProprietarios';

import { PainelDeDesativacao } from './PainelDeDesativacao';

function respostaDe(corpo: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: 'OK',
    headers: new Headers({ 'X-Request-Id': 'abc-123' }),
    json: () => Promise.resolve(corpo),
  } as unknown as Response;
}

const HELENA: ProprietarioResponse = {
  id: 3,
  nome: 'Helena Sarraf',
  corDeIdentificacao: 'VERDE',
  situacao: 'ATIVO',
};
const PROPRIETARIOS: ProprietarioResponse[] = [
  { id: 1, nome: 'Ricardo Meirelles', corDeIdentificacao: 'PETROLEO', situacao: 'ATIVO' },
  { id: 2, nome: 'Vetor Participações', corDeIdentificacao: 'AMBAR', situacao: 'ATIVO' },
  HELENA,
  { id: 4, nome: 'Otávio Lins', corDeIdentificacao: 'CINZA', situacao: 'INATIVO' },
];

/** Helena tem 20% da PS-MEP, com Ricardo (50%) e Vetor (30%). */
const VINCULOS_DA_HELENA = [
  { proprietarioId: 1, aeronaveId: 7, contratoId: 70, matricula: 'PS-MEP', percentual: 50 },
  { proprietarioId: 2, aeronaveId: 7, contratoId: 70, matricula: 'PS-MEP', percentual: 30 },
  { proprietarioId: 3, aeronaveId: 7, contratoId: 70, matricula: 'PS-MEP', percentual: 20 },
];

interface Cenario {
  /** Os vínculos de cada GET, em ordem; o último se repete. */
  vinculos?: (() => Promise<Response>)[];
  aoSair?: () => Promise<Response>;
  aoDesativar?: () => Promise<Response>;
  proprietarios?: ProprietarioResponse[];
  /** Vínculos já em cache quando o painel abre, antes da recarga da montagem chegar. */
  vinculosEmCache?: unknown[];
}

function montar({
  vinculos = [() => Promise.resolve(respostaDe(VINCULOS_DA_HELENA))],
  aoSair = () => Promise.resolve(respostaDe(undefined, 204)),
  aoDesativar = () => Promise.resolve(respostaDe(HELENA)),
  proprietarios = PROPRIETARIOS,
  vinculosEmCache,
}: Cenario = {}) {
  const leituras = [...vinculos];
  const buscar = vi.fn<(entrada: string, opcoes?: RequestInit) => Promise<Response>>((entrada) => {
    if (entrada.startsWith('/api/participacoes/vigentes')) {
      const proxima = leituras.length > 1 ? leituras.shift() : leituras[0];
      return proxima ? proxima() : Promise.resolve(respostaDe([]));
    }
    if (entrada === '/api/proprietarios/3/saida') {
      return aoSair();
    }
    if (entrada === '/api/proprietarios/3/desativacao') {
      return aoDesativar();
    }
    return Promise.resolve(respostaDe(proprietarios));
  });
  vi.stubGlobal('fetch', buscar);
  const aoFechar = vi.fn();
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  if (vinculosEmCache) {
    cliente.setQueryData(['participacoes', 'vigentes'], vinculosEmCache);
  }
  render(
    <MemoryRouter>
      <QueryClientProvider client={cliente}>
        <PainelDeDesativacao
          proprietario={HELENA}
          proprietarios={proprietarios}
          aoFechar={aoFechar}
        />
      </QueryClientProvider>
    </MemoryRouter>,
  );
  return { buscar, aoFechar, cliente };
}

const campo = (nome: string) => screen.getByLabelText(`Participação de ${nome} na PS-MEP em %`);
const confirmar = () => screen.getByRole('button', { name: 'Redistribuir e desativar' });

async function distribuir(ricardo: string, vetor: string) {
  await userEvent.clear(campo('Ricardo Meirelles'));
  await userEvent.type(campo('Ricardo Meirelles'), ricardo);
  await userEvent.clear(campo('Vetor Participações'));
  await userEvent.type(campo('Vetor Participações'), vetor);
}

function corpoDaSaida(buscar: ReturnType<typeof montar>['buscar']) {
  const [, opcoes] =
    buscar.mock.calls.find(([entrada]) => entrada === '/api/proprietarios/3/saida') ?? [];
  return JSON.parse(String(opcoes?.body)) as unknown;
}

describe('PainelDeDesativacao', () => {
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

  it('abre no título, descrito pela instrução, e não no primeiro percentual', async () => {
    montar();

    const apresentacao = screen.getByRole('group', {
      name: 'Desativar proprietário · Helena Sarraf',
    });
    expect(apresentacao).toHaveFocus();
    await waitFor(() =>
      expect(apresentacao).toHaveAccessibleDescription(/distribua o percentual liberado/),
    );
  });

  it('enquanto os vínculos não chegam, não oferece desativar; quando chegam, pede a redistribuição', async () => {
    let entregar: (resposta: Response) => void = () => undefined;
    montar({ vinculos: [() => new Promise<Response>((resolver) => (entregar = resolver))] });

    expect(screen.getByText('Conferindo as participações de Helena Sarraf…')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Desativar' })).not.toBeInTheDocument();

    entregar(respostaDe(VINCULOS_DA_HELENA));
    expect(
      await screen.findByRole('button', { name: 'Redistribuir e desativar' }),
    ).toBeInTheDocument();
  });

  it('sem os vínculos, diz por que não dá para seguir e oferece tentar de novo', async () => {
    montar({
      vinculos: [
        () => Promise.resolve(respostaDe({ detail: 'Falhou.' }, 500)),
        () => Promise.resolve(respostaDe(VINCULOS_DA_HELENA)),
      ],
    });

    expect(
      await screen.findByText(/Não foi possível conferir as participações de Helena Sarraf/),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(
      await screen.findByRole('button', { name: 'Redistribuir e desativar' }),
    ).toBeInTheDocument();
    // O "Tentar de novo" saiu do DOM: o foco volta ao título, e não ao <body>.
    expect(
      screen.getByRole('group', { name: 'Desativar proprietário · Helena Sarraf' }),
    ).toHaveFocus();
  });

  it('"50.5" e "49.5" fecham em 100, e a soma diz quanto passou em vez de um número negativo', async () => {
    const { buscar } = montar();
    await screen.findByRole('button', { name: 'Redistribuir e desativar' });

    await distribuir('70', '45');
    expect(screen.getByText('Soma 115% · Passou 15% de 100%.')).toBeInTheDocument();

    await distribuir('50.5', '49.5');
    expect(screen.getByText('Soma 100% · Fechado em 100%.')).toBeInTheDocument();
    await userEvent.click(confirmar());

    expect(corpoDaSaida(buscar)).toEqual({
      contratos: [
        {
          aeronaveId: 7,
          contratoVigenteId: 70,
          participacoes: [
            { proprietarioId: 1, percentual: 50.5 },
            { proprietarioId: 2, percentual: 49.5 },
          ],
        },
      ],
    });
  });

  it('confirmar com um percentual vazio foca o campo e o resumo diz de quem é', async () => {
    montar();
    await screen.findByRole('button', { name: 'Redistribuir e desativar' });

    await userEvent.clear(campo('Vetor Participações'));
    await userEvent.click(confirmar());

    expect(campo('Vetor Participações')).toHaveFocus();
    expect(campo('Vetor Participações')).toHaveAccessibleDescription('Informe o percentual.');
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Revise o campo Participação de Vetor Participações na PS-MEP.',
    );
  });

  it('quem foi incluído por engano sai pelo "Remover", e o foco volta à escolha', async () => {
    montar({
      proprietarios: [
        ...PROPRIETARIOS,
        { id: 5, nome: 'Marina Costa', corDeIdentificacao: 'AZUL', situacao: 'ATIVO' },
      ],
    });
    await screen.findByRole('button', { name: 'Redistribuir e desativar' });

    const escolha = screen.getByLabelText('Incluir proprietário na PS-MEP');
    await userEvent.selectOptions(escolha, '5');
    expect(screen.queryByLabelText(/Marina Costa/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Incluir na PS-MEP' }));
    expect(campo('Marina Costa')).toHaveFocus();

    expect(
      screen.queryByRole('button', { name: 'Remover Ricardo Meirelles do contrato da PS-MEP' }),
    ).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Remover Marina Costa do contrato da PS-MEP' }),
    );
    expect(screen.queryByLabelText(/Participação de Marina Costa/)).not.toBeInTheDocument();
    expect(screen.getByLabelText('Incluir proprietário na PS-MEP')).toHaveFocus();
    expect(screen.getByText('Marina Costa saiu do contrato novo da PS-MEP.')).toBeInTheDocument();
  });

  it('quem acaba de entrar com o campo vazio não deixa a soma anunciar "fechado"', async () => {
    montar({
      proprietarios: [
        ...PROPRIETARIOS,
        { id: 5, nome: 'Marina Costa', corDeIdentificacao: 'AZUL', situacao: 'ATIVO' },
      ],
    });
    await screen.findByRole('button', { name: 'Redistribuir e desativar' });
    await distribuir('70', '30');
    await userEvent.selectOptions(screen.getByLabelText('Incluir proprietário na PS-MEP'), '5');
    await userEvent.click(screen.getByRole('button', { name: 'Incluir na PS-MEP' }));

    expect(
      screen.getByText('Soma 100% · Preencha o percentual de cada proprietário.'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Fechado em 100%/)).not.toBeInTheDocument();
  });

  it('dono único sem ninguém para assumir: o painel diz o que fazer', async () => {
    montar({
      vinculos: [
        () =>
          Promise.resolve(
            respostaDe([
              {
                proprietarioId: 3,
                aeronaveId: 7,
                contratoId: 70,
                matricula: 'PS-MEP',
                percentual: 100,
              },
            ]),
          ),
      ],
      proprietarios: [HELENA],
    });

    expect(
      await screen.findByText(
        /Não há outro proprietário ativo para assumir a PS-MEP\. Cancele, cadastre ou reative/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Soma 0% · Ninguém pode assumir a participação na PS-MEP agora.'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Inclua quem assume/)).not.toBeInTheDocument();
    await userEvent.click(confirmar());
    expect(screen.getByRole('alert')).toHaveTextContent('Revise o campo Soma da PS-MEP.');
  });

  it('a recusa do servidor cai na linha do proprietário', async () => {
    montar({
      aoSair: () =>
        Promise.resolve(
          respostaDe(
            {
              campos: {
                'contratos[0].participacoes[1].proprietarioId':
                  'Proprietário inativo não entra em contrato: reative Vetor Participações antes.',
              },
            },
            400,
          ),
        ),
    });
    await screen.findByRole('button', { name: 'Redistribuir e desativar' });
    await distribuir('70', '30');
    await userEvent.click(confirmar());

    await waitFor(() =>
      expect(campo('Vetor Participações')).toHaveAccessibleDescription(/reative Vetor/),
    );
    expect(campo('Vetor Participações')).toHaveFocus();
  });

  it('durante o envio, Cancelar e o Esc não fecham o painel', async () => {
    const { aoFechar } = montar({ aoSair: () => new Promise<Response>(() => undefined) });
    await screen.findByRole('button', { name: 'Redistribuir e desativar' });
    await distribuir('70', '30');
    await userEvent.click(confirmar());

    const cancelar = screen.getByRole('button', { name: 'Cancelar' });
    expect(cancelar).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(cancelar);
    const esc = new Event('cancel', { cancelable: true });
    fireEvent(screen.getByRole('dialog'), esc);

    expect(esc.defaultPrevented).toBe(true);
    expect(aoFechar).not.toHaveBeenCalled();
  });

  it('se ela entrou num contrato enquanto o painel estava aberto, ele passa à redistribuição', async () => {
    const { aoFechar } = montar({
      vinculos: [
        () => Promise.resolve(respostaDe([])),
        () => Promise.resolve(respostaDe(VINCULOS_DA_HELENA)),
      ],
      aoDesativar: () =>
        Promise.resolve(
          respostaDe(
            {
              title: 'Proprietário com participação vigente',
              detail:
                'Helena Sarraf está num contrato vigente: redistribua a participação dela entre os demais antes de desativar.',
            },
            409,
          ),
        ),
    });

    await userEvent.click(await screen.findByRole('button', { name: 'Desativar' }));

    expect(
      await screen.findByRole('button', { name: 'Redistribuir e desativar' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/está num contrato vigente/);
    expect(
      within(screen.getByRole('dialog')).getByLabelText(/Ricardo Meirelles na PS-MEP/),
    ).toBeInTheDocument();
    expect(aoFechar).not.toHaveBeenCalled();
  });

  it('nasce dos contratos que a recarga da abertura trouxe, e não dos do cache', async () => {
    const { buscar, cliente } = montar({
      vinculosEmCache: VINCULOS_DA_HELENA.map((vinculo) => ({ ...vinculo, contratoId: 69 })),
    });
    await waitFor(() =>
      expect(cliente.getQueryData(['participacoes', 'vigentes'])).toEqual(VINCULOS_DA_HELENA),
    );
    await distribuir('70', '30');
    await userEvent.click(confirmar());

    await waitFor(() =>
      expect(corpoDaSaida(buscar)).toMatchObject({ contratos: [{ contratoVigenteId: 70 }] }),
    );
  });

  it('se outra pessoa já a desativou, avisa, atualiza a lista e não oferece o formulário de novo', async () => {
    const invalidar = vi.spyOn(QueryClient.prototype, 'invalidateQueries');
    const { buscar } = montar({
      aoSair: () =>
        Promise.resolve(
          respostaDe(
            {
              title: 'Proprietário já inativo',
              detail: 'O cadastro de Helena Sarraf já está inativo: não há saída a registrar.',
            },
            409,
          ),
        ),
    });
    await screen.findByRole('button', { name: 'Redistribuir e desativar' });
    await distribuir('70', '30');
    await userEvent.click(confirmar());

    expect(
      await screen.findByText(
        'O cadastro de Helena Sarraf já foi desativado: não há saída a registrar.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Redistribuir e desativar' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fechar' })).toBeInTheDocument();
    expect(
      screen.getByRole('group', { name: 'Desativar proprietário · Helena Sarraf' }),
    ).toHaveFocus();
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ['proprietarios'] });
    const leiturasDeVinculos = buscar.mock.calls.filter(([entrada]) =>
      entrada.startsWith('/api/participacoes/vigentes'),
    );
    expect(leiturasDeVinculos).toHaveLength(1);
  });
});
