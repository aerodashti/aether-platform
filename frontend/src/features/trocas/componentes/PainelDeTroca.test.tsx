import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { hojeLocal } from '@/compartilhado/formatacao/datas';

import type { TrocaResponse } from '../api/useTrocas';

import { PainelDeTroca } from './PainelDeTroca';

const AERONAVES = [
  { id: 1, matricula: 'PS-MEP', modelo: 'Citation XLS+' },
  { id: 2, matricula: 'PR-KRT', modelo: 'Phenom 300' },
];
const PROPRIETARIOS = [
  { id: 1, nome: 'Ricardo Meirelles', situacao: 'ATIVO' },
  { id: 2, nome: 'Vetor Participações', situacao: 'ATIVO' },
];
// A PR-KRT não tem contrato vigente.
const VINCULOS = [
  { proprietarioId: 1, aeronaveId: 1, matricula: 'PS-MEP', percentual: 60 },
  { proprietarioId: 2, aeronaveId: 1, matricula: 'PS-MEP', percentual: 40 },
];

const CONCLUIDA = {
  id: 5,
  aeronaveId: 1,
  matricula: 'PS-MEP',
  modelo: 'Citation XLS+',
  data: '2026-09-20',
  cedenteId: 1,
  nomeDoCedente: 'Ricardo Meirelles',
  recebedorId: 2,
  nomeDoRecebedor: 'Vetor Participações',
  horas: 2.5,
  km: 1320,
  valorPorHora: 14800,
  situacao: 'CONCLUIDA',
  concluidaEm: '2026-10-03',
} as TrocaResponse;

function resposta(corpo: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ 'X-Request-Id': 'abc-123' }),
    json: () => Promise.resolve(corpo),
  } as unknown as Response;
}

type Responder = (entrada: string, opcoes?: RequestInit) => Promise<Response>;

function prepararFetch(
  envio: Responder = () => Promise.resolve(resposta({ id: 9 }, 201)),
  falhas = '',
) {
  vi.stubGlobal(
    'fetch',
    vi.fn((entrada: string, opcoes?: RequestInit) => {
      if (opcoes?.method && opcoes.method !== 'GET') {
        return envio(entrada, opcoes);
      }
      if (falhas && entrada.startsWith(falhas)) {
        return Promise.resolve(resposta({}, 500));
      }
      if (entrada.startsWith('/api/aeronaves')) {
        return Promise.resolve(resposta(AERONAVES));
      }
      if (entrada.startsWith('/api/participacoes/vigentes')) {
        return Promise.resolve(resposta(VINCULOS));
      }
      return Promise.resolve(resposta(PROPRIETARIOS));
    }),
  );
}

function envios() {
  return vi
    .mocked(fetch)
    .mock.calls.filter(([, opcoes]) => opcoes?.method && opcoes.method !== 'GET')
    .map(([entrada, opcoes]) => ({
      entrada: String(entrada),
      corpo: JSON.parse(String(opcoes?.body)) as Record<string, unknown>,
    }));
}

function abrir(conteudo: ReactNode) {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={cliente}>{conteudo}</QueryClientProvider>);
}

const campo = (rotulo: string) => screen.getByLabelText(rotulo);
const registrar = () => screen.getByRole('button', { name: 'Registrar troca' });

async function listasCarregadas() {
  await screen.findByRole('option', { name: 'PS-MEP — Citation XLS+' });
}

async function escolherAeronave(rotulo: string) {
  await userEvent.selectOptions(campo('Aeronave'), rotulo);
  await vi.waitFor(() =>
    expect(campo('Cedeu')).not.toHaveAccessibleDescription(/Carregando os proprietários/),
  );
}

async function preencher() {
  await escolherAeronave('PS-MEP — Citation XLS+');
  await userEvent.selectOptions(campo('Cedeu'), 'Ricardo Meirelles');
  await userEvent.selectOptions(campo('Recebeu'), 'Vetor Participações');
  await userEvent.type(campo('Horas voadas (h)'), '2,5');
}

describe('PainelDeTroca', () => {
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

  it('salvar vazio leva o foco à Aeronave e o resumo diz o que falta, sem ir ao servidor', async () => {
    prepararFetch();
    abrir(<PainelDeTroca aoFechar={vi.fn()} />);
    await listasCarregadas();

    await userEvent.click(registrar());

    expect(campo('Aeronave')).toHaveFocus();
    expect(campo('Aeronave')).toHaveAccessibleDescription('Escolha a aeronave.');
    expect(campo('Aeronave')).toBeRequired();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Revise 4 campos: Aeronave, Cedeu, Recebeu, Horas voadas.',
    );
    expect(registrar()).not.toHaveAttribute('aria-disabled');
    expect(envios()).toEqual([]);
  });

  it('lê "14.800" e "1.320" no formato brasileiro, mostra o total e envia número', async () => {
    const aoFechar = vi.fn();
    prepararFetch();
    abrir(<PainelDeTroca aoFechar={aoFechar} />);
    await listasCarregadas();

    await preencher();
    await userEvent.type(campo('KM voados (opcional)'), '1.320');
    await userEvent.type(campo('R$ por hora (opcional)'), '14.800');
    expect(campo('Horas voadas (h)')).toHaveAttribute('inputmode', 'decimal');
    expect(campo('R$ por hora (opcional)')).toHaveAccessibleDescription(
      /Total da troca: R\$\s*37\.000,00/,
    );

    await userEvent.click(registrar());

    expect(envios()).toEqual([
      {
        entrada: '/api/trocas',
        corpo: {
          aeronaveId: 1,
          data: hojeLocal(),
          cedenteId: 1,
          recebedorId: 2,
          horas: 2.5,
          km: 1320,
          valorPorHora: 14800,
        },
      },
    ]);
    await vi.waitFor(() => expect(aoFechar).toHaveBeenCalled());
  });

  it('KM ou R$/hora que não é número fica no campo e não vai como null', async () => {
    prepararFetch();
    abrir(<PainelDeTroca aoFechar={vi.fn()} />);
    await listasCarregadas();

    await preencher();
    await userEvent.type(campo('KM voados (opcional)'), '610 km');
    await userEvent.type(campo('R$ por hora (opcional)'), '0');
    await userEvent.click(registrar());

    expect(campo('KM voados (opcional)')).toHaveFocus();
    expect(campo('KM voados (opcional)')).toHaveAccessibleDescription(
      'Use só números, com vírgula para as casas decimais.',
    );
    expect(campo('R$ por hora (opcional)')).toHaveAccessibleDescription(
      /^Informe um valor maior que 0\./,
    );
    expect(envios()).toEqual([]);
  });

  it('horas com duas casas são recusadas no campo, em vez de o banco arredondar', async () => {
    prepararFetch();
    abrir(<PainelDeTroca aoFechar={vi.fn()} />);
    await listasCarregadas();

    await escolherAeronave('PS-MEP — Citation XLS+');
    await userEvent.selectOptions(campo('Cedeu'), 'Ricardo Meirelles');
    await userEvent.selectOptions(campo('Recebeu'), 'Vetor Participações');
    await userEvent.type(campo('Horas voadas (h)'), '2,25');
    await userEvent.click(registrar());

    expect(campo('Horas voadas (h)')).toHaveAccessibleDescription(
      /^Use no máximo uma casa decimal, em décimos de hora: 2h30 é 2,5\./,
    );
    expect(envios()).toEqual([]);
  });

  it('a recusa do servidor cai no campo que ela nomeia e leva o foco até ele', async () => {
    const recusa = 'A troca registra horas já voadas: use uma data entre 01/01/2000 e hoje.';
    prepararFetch(() =>
      Promise.resolve(
        resposta({ title: 'Troca inválida', detail: recusa, campos: { data: recusa } }, 400),
      ),
    );
    abrir(<PainelDeTroca aoFechar={vi.fn()} />);
    await listasCarregadas();

    await preencher();
    await userEvent.click(registrar());

    await vi.waitFor(() => expect(campo('Data')).toHaveAccessibleDescription(recusa));
    expect(campo('Data')).toHaveFocus();
  });

  it('sem rede, o resumo diz que não falou com o servidor', async () => {
    prepararFetch(() => Promise.reject(new TypeError('Failed to fetch')));
    abrir(<PainelDeTroca aoFechar={vi.fn()} />);
    await listasCarregadas();

    await preencher();
    await userEvent.click(registrar());

    expect(
      await screen.findByText(
        'Não foi possível falar com o servidor. Verifique a conexão e tente de novo.',
      ),
    ).toBeInTheDocument();
  });

  it('aeronave sem contrato com dois donos: Cedeu explica, e o problema fica na Aeronave', async () => {
    prepararFetch();
    abrir(<PainelDeTroca aoFechar={vi.fn()} />);
    await listasCarregadas();

    await escolherAeronave('PR-KRT — Phenom 300');
    expect(campo('Cedeu')).toHaveAccessibleDescription(
      'A PR-KRT não tem dois proprietários no contrato vigente: cadastre o contrato antes de registrar a troca.',
    );
    await userEvent.type(campo('Horas voadas (h)'), '2,5');
    await userEvent.click(registrar());

    expect(campo('Aeronave')).toHaveFocus();
    expect(screen.getByRole('alert')).toHaveTextContent('Revise o campo Aeronave.');
  });

  it('passar a ceder quem recebia limpa Recebeu, em vez de guardar um valor escondido', async () => {
    prepararFetch();
    abrir(<PainelDeTroca aoFechar={vi.fn()} />);
    await listasCarregadas();

    await escolherAeronave('PS-MEP — Citation XLS+');
    expect(campo('Cedeu')).toBeEnabled();
    await userEvent.selectOptions(campo('Cedeu'), 'Ricardo Meirelles');
    await userEvent.selectOptions(campo('Recebeu'), 'Vetor Participações');
    await userEvent.selectOptions(campo('Cedeu'), 'Vetor Participações');

    expect(campo('Recebeu')).toHaveValue('');
  });

  it('sem as listas, o painel avisa e oferece tentar de novo', async () => {
    prepararFetch(undefined, '/api/participacoes/vigentes');
    abrir(<PainelDeTroca aoFechar={vi.fn()} />);

    expect(
      await screen.findByText(
        'Não foi possível carregar as aeronaves ou os proprietários do painel.',
      ),
    ).toBeInTheDocument();
    await escolherAeronave('PS-MEP — Citation XLS+');
    expect(campo('Cedeu')).toHaveAccessibleDescription('A lista de proprietários não carregou.');

    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(
      vi
        .mocked(fetch)
        .mock.calls.filter(([entrada]) =>
          String(entrada).startsWith('/api/participacoes/vigentes'),
        ),
    ).toHaveLength(2);
  });

  it('na correção de uma concluída, a aeronave diz por que não muda e a data para na devolução', async () => {
    prepararFetch();
    abrir(<PainelDeTroca troca={CONCLUIDA} aoFechar={vi.fn()} />);
    await listasCarregadas();

    expect(campo('Aeronave')).toBeDisabled();
    expect(campo('Aeronave')).toHaveAccessibleDescription(
      'A aeronave não muda na correção: para outra aeronave, registre uma troca nova.',
    );
    expect(campo('Data')).toHaveAttribute('max', '2026-10-03');

    fireEvent.change(campo('Data'), { target: { value: '2026-10-05' } });
    await userEvent.click(screen.getByRole('button', { name: 'Salvar correção' }));

    expect(campo('Data')).toHaveAccessibleDescription(
      /^A devolução foi registrada em 03\/10\/2026: a troca não pode ser depois dela\./,
    );
    expect(envios()).toEqual([]);
  });

  it('durante o envio, Cancelar fica inerte', async () => {
    const aoFechar = vi.fn();
    prepararFetch(() => new Promise<Response>(() => {}));
    abrir(<PainelDeTroca aoFechar={aoFechar} />);
    await listasCarregadas();

    await preencher();
    await userEvent.click(registrar());
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(aoFechar).not.toHaveBeenCalled();
  });
});
