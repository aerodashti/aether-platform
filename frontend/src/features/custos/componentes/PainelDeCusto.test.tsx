import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { hojeLocal } from '@/compartilhado/formatacao/datas';

import type { CustoResponse } from '../api/useCustos';

import { PainelDeCusto } from './PainelDeCusto';

const AERONAVES = [
  { id: 1, matricula: 'PS-MEP', modelo: 'Citation XLS+' },
  { id: 2, matricula: 'PR-KRT', modelo: 'Phenom 300' },
];
const PROPRIETARIOS = [
  { id: 7, nome: 'Ricardo Meirelles', situacao: 'ATIVO' },
  { id: 9, nome: 'Otávio Lins', situacao: 'INATIVO' },
];
// A PR-KRT não tem contrato vigente.
const VINCULOS = [{ aeronaveId: 1, proprietarioId: 7, matricula: 'PS-MEP', percentual: 100 }];

/** O lançamento de quem saiu da aeronave: a saída o deixou inativo. */
const DE_QUEM_SAIU = {
  id: 5,
  aeronaveId: 1,
  matricula: 'PS-MEP',
  tipo: 'FIXO',
  categoria: 'HANGARAGEM',
  data: '2026-09-01',
  descricao: 'Hangaragem mensal',
  proprietarioId: 9,
  nomeDoProprietario: 'Otávio Lins',
  rateado: false,
  moeda: 'BRL',
  valorOriginal: null,
  cambio: null,
  valor: 18400,
} as unknown as CustoResponse;

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
  envio: Responder = () => Promise.resolve(resposta({ id: 1 }, 201)),
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

async function listasCarregadas() {
  await screen.findByRole('option', { name: 'PS-MEP — Citation XLS+' });
  await vi.waitFor(() =>
    expect(screen.getByLabelText('Atribuição')).not.toHaveAccessibleDescription(
      'Carregando os proprietários…',
    ),
  );
}

async function preencherEmBrl(valor: string) {
  await userEvent.selectOptions(screen.getByLabelText('Aeronave'), 'PS-MEP — Citation XLS+');
  await userEvent.selectOptions(screen.getByLabelText('Categoria'), 'Abastecimento');
  fireEvent.change(screen.getByLabelText('Data do custo'), { target: { value: hojeLocal() } });
  await userEvent.type(screen.getByLabelText('Valor (R$)'), valor);
  await userEvent.type(screen.getByLabelText('Descrição'), 'Jet A-1');
}

const registrar = () => screen.getByRole('button', { name: 'Registrar custo' });

describe('PainelDeCusto', () => {
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
    abrir(<PainelDeCusto aoFechar={vi.fn()} />);
    await listasCarregadas();

    await userEvent.click(registrar());

    expect(screen.getByLabelText('Aeronave')).toHaveFocus();
    expect(screen.getByLabelText('Aeronave')).toHaveAccessibleDescription('Escolha a aeronave.');
    expect(screen.getByText(/^Revise 5 campos/)).toHaveTextContent(
      'Revise 5 campos: Aeronave, Categoria, Data do custo, Valor, Descrição.',
    );
    expect(registrar()).not.toHaveAttribute('aria-disabled');
    expect(envios()).toEqual([]);
  });

  it('lê "1.850" como mil oitocentos e cinquenta e envia número, nunca NaN', async () => {
    const aoFechar = vi.fn();
    prepararFetch();
    abrir(<PainelDeCusto aoFechar={aoFechar} />);
    await listasCarregadas();

    await preencherEmBrl('1.850');
    await userEvent.click(registrar());

    expect(envios()).toEqual([
      {
        entrada: '/api/custos',
        corpo: {
          aeronaveId: 1,
          categoria: 'ABASTECIMENTO',
          data: hojeLocal(),
          descricao: 'Jet A-1',
          moeda: 'BRL',
          valor: 1850,
        },
      },
    ]);
    await vi.waitFor(() => expect(aoFechar).toHaveBeenCalled());
  });

  it('em USD, valor e câmbio inválidos ficam no campo e a prévia só sai com os dois válidos', async () => {
    prepararFetch();
    abrir(<PainelDeCusto aoFechar={vi.fn()} />);
    await listasCarregadas();
    await userEvent.click(screen.getByRole('radio', { name: 'USD' }));
    const valor = screen.getByLabelText('Valor (US$)');
    const cambio = screen.getByLabelText('Câmbio do dia (R$ por US$ 1)');

    expect(valor).toHaveAttribute('inputmode', 'decimal');
    expect(cambio).toHaveAttribute('inputmode', 'decimal');
    expect(cambio).toBeRequired();

    await userEvent.type(valor, 'abc');
    await userEvent.type(cambio, '150');
    await userEvent.click(registrar());

    expect(valor).toHaveAccessibleDescription(
      'Use só números, com vírgula para as casas decimais.',
    );
    expect(cambio).toHaveAccessibleDescription('O máximo é 100. Até 4 casas decimais.');
    expect(screen.queryByText(/^=/)).not.toBeInTheDocument();

    await userEvent.clear(valor);
    await userEvent.type(valor, '1200');
    await userEvent.clear(cambio);
    await userEvent.type(cambio, '4,9223');

    expect(screen.getByText(/= R\$\s*5\.906,76/)).toBeInTheDocument();
    expect(screen.getByText(/= R\$\s*5\.906,76/).closest('[aria-live]')).toHaveAttribute(
      'aria-live',
      'polite',
    );
  });

  it('a recusa do servidor cai no campo que ela nomeia e leva o foco até ele', async () => {
    prepararFetch(() =>
      Promise.resolve(
        resposta(
          { detail: 'Use uma data…', campos: { data: 'Use uma data até 07/11/2026.' } },
          400,
        ),
      ),
    );
    abrir(<PainelDeCusto aoFechar={vi.fn()} />);
    await listasCarregadas();

    await preencherEmBrl('100');
    await userEvent.click(registrar());

    const data = screen.getByLabelText('Data do custo');
    expect(await screen.findByText('Use uma data até 07/11/2026.')).toBeInTheDocument();
    expect(data).toHaveAccessibleDescription('Use uma data até 07/11/2026.');
    expect(data).toHaveFocus();
  });

  it('sem rede, o resumo diz que nada foi gravado', async () => {
    prepararFetch(() => Promise.reject(new TypeError('Failed to fetch')));
    abrir(<PainelDeCusto aoFechar={vi.fn()} />);
    await listasCarregadas();

    await preencherEmBrl('100');
    await userEvent.click(registrar());

    expect(await screen.findByText(/Não foi possível falar com o servidor/)).toBeInTheDocument();
  });

  it('durante o envio, cancelar e o Esc não fecham o painel', async () => {
    const aoFechar = vi.fn();
    prepararFetch(() => new Promise<Response>(() => undefined));
    abrir(<PainelDeCusto aoFechar={aoFechar} />);
    await listasCarregadas();

    await preencherEmBrl('100');
    await userEvent.click(registrar());
    const cancelar = screen.getByRole('button', { name: 'Cancelar' });

    expect(cancelar).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(cancelar);
    expect(aoFechar).not.toHaveBeenCalled();

    const esc = new Event('cancel', { cancelable: true });
    screen.getByRole('dialog').dispatchEvent(esc);
    expect(esc.defaultPrevented).toBe(true);
  });

  it('corrigir o lançamento de quem saiu mantém a atribuição, marcada como inativa', async () => {
    prepararFetch(() => Promise.resolve(resposta(DE_QUEM_SAIU)));
    abrir(<PainelDeCusto custo={DE_QUEM_SAIU} aoFechar={vi.fn()} />);
    await listasCarregadas();

    expect(screen.getByLabelText('Atribuição')).toHaveDisplayValue('Otávio Lins (inativo)');

    await userEvent.click(screen.getByRole('button', { name: 'Salvar correção' }));

    expect(envios()).toEqual([
      expect.objectContaining({
        entrada: '/api/custos/5',
        corpo: expect.objectContaining({ proprietarioId: 9, valor: 18400 }),
      }),
    ]);
  });

  it('corrigir um custo em BRL e passar para USD deixa o câmbio vazio, não "null"', async () => {
    prepararFetch();
    abrir(<PainelDeCusto custo={DE_QUEM_SAIU} aoFechar={vi.fn()} />);
    await listasCarregadas();

    await userEvent.click(screen.getByRole('radio', { name: 'USD' }));

    expect(screen.getByLabelText('Câmbio do dia (R$ por US$ 1)')).toHaveValue('');
  });

  it('clicar no tipo já escolhido não apaga a categoria', async () => {
    prepararFetch();
    abrir(<PainelDeCusto custo={DE_QUEM_SAIU} aoFechar={vi.fn()} />);
    await listasCarregadas();

    await userEvent.click(screen.getByRole('radio', { name: 'Custo Fixo' }));

    expect(screen.getByLabelText('Categoria')).toHaveDisplayValue('Hangaragem');
  });

  it('sem a lista de proprietários, avisa, oferece tentar de novo e não salva como rateio', async () => {
    prepararFetch(undefined, '/api/proprietarios');
    abrir(<PainelDeCusto aoFechar={vi.fn()} />);
    await screen.findByRole('option', { name: 'PS-MEP — Citation XLS+' });

    const aviso = await screen.findByText(/Não foi possível carregar as aeronaves ou os/);
    expect(
      within(aviso.parentElement as HTMLElement).getByRole('button', { name: 'Tentar de novo' }),
    ).toBeInTheDocument();

    await preencherEmBrl('100');
    await userEvent.click(registrar());

    expect(screen.getByLabelText('Atribuição')).toHaveAccessibleDescription(
      'A lista de proprietários não carregou: tente de novo antes de salvar. Não foi possível carregar os proprietários.',
    );
    expect(envios()).toEqual([]);
  });

  it('aeronave sem contrato vigente avisa que o custo não será rateado', async () => {
    prepararFetch();
    abrir(<PainelDeCusto aoFechar={vi.fn()} />);
    await listasCarregadas();

    await userEvent.selectOptions(screen.getByLabelText('Aeronave'), 'PR-KRT — Phenom 300');

    expect(screen.getByLabelText('Atribuição')).toHaveAccessibleDescription(
      'PR-KRT não tem contrato vigente: o custo não será rateado até haver proprietários.',
    );
  });

  it('a aeronave da URL que não existe não é enviada: o campo começa vazio', async () => {
    prepararFetch();
    abrir(<PainelDeCusto aeronaveInicial="999" aoFechar={vi.fn()} />);
    await listasCarregadas();

    expect(screen.getByLabelText('Aeronave')).toHaveDisplayValue('Selecione…');
    await userEvent.click(registrar());
    expect(screen.getByLabelText('Aeronave')).toHaveAccessibleDescription('Escolha a aeronave.');
  });
});
