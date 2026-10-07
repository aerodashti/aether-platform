import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { hojeLocal } from '@/compartilhado/formatacao/datas';

import type { TrechoResponse } from '../api/useVoos';

import { PainelDeTrecho } from './PainelDeTrecho';

function respostaDe(corpo: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: 'OK',
    headers: new Headers({ 'X-Request-Id': 'abc-123' }),
    json: () => Promise.resolve(corpo),
  } as unknown as Response;
}

const AERONAVES = [
  { id: 1, matricula: 'PS-MEP', modelo: 'Citation XLS+' },
  { id: 2, matricula: 'PT-XLB', modelo: 'AW109' },
];
const PROPRIETARIOS = [
  { id: 7, nome: 'Ricardo Meirelles', situacao: 'ATIVO' },
  { id: 4, nome: 'Otávio Lins', situacao: 'INATIVO' },
];
// A PT-XLB não tem contrato vigente.
const VINCULOS = [
  { aeronaveId: 1, proprietarioId: 7, percentual: 60 },
  { aeronaveId: 1, proprietarioId: 4, percentual: 40 },
];

function prepararFetch(aoEnviar: (corpo: unknown) => Promise<Response>) {
  vi.stubGlobal(
    'fetch',
    vi.fn((entrada: string, opcoes?: RequestInit) => {
      if (opcoes?.method === 'POST' || opcoes?.method === 'PUT') {
        return aoEnviar(JSON.parse(String(opcoes.body)));
      }
      if (entrada.startsWith('/api/aeronaves')) {
        return Promise.resolve(respostaDe(AERONAVES));
      }
      if (entrada.startsWith('/api/participacoes/vigentes')) {
        return Promise.resolve(respostaDe(VINCULOS));
      }
      return Promise.resolve(respostaDe(PROPRIETARIOS));
    }),
  );
}

function abrir(props: { trecho?: TrechoResponse; aeronaveInicial?: string } = {}) {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const aoFechar = vi.fn();
  render(
    <QueryClientProvider client={cliente}>
      <PainelDeTrecho {...props} aoFechar={aoFechar} />
    </QueryClientProvider>,
  );
  return { painel: screen.getByRole('dialog'), aoFechar };
}

async function preencher(painel: HTMLElement, km = '365') {
  await within(painel).findByRole('option', { name: 'PS-MEP — Citation XLS+' });
  await userEvent.selectOptions(within(painel).getByLabelText('Aeronave'), '1');
  await userEvent.type(within(painel).getByLabelText('Rel. Voo'), 'RV-2026-044');
  await userEvent.type(within(painel).getByLabelText('Data do trecho'), hojeLocal());
  await userEvent.type(within(painel).getByLabelText('Origem'), 'SBSP');
  await userEvent.type(within(painel).getByLabelText('Destino'), 'SBGR');
  await userEvent.type(within(painel).getByLabelText('Distância (km)'), km);
}

describe('PainelDeTrecho', () => {
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

  it('salvar vazio não envia: foca o primeiro campo e o resumo diz quais faltam', async () => {
    const aoEnviar = vi.fn();
    prepararFetch(aoEnviar);
    const { painel } = abrir();
    const salvar = within(painel).getByRole('button', { name: 'Registrar trecho' });

    expect(salvar).not.toHaveAttribute('aria-disabled');
    await userEvent.click(salvar);

    expect(within(painel).getByLabelText('Aeronave')).toHaveFocus();
    expect(within(painel).getByRole('alert')).toHaveTextContent(
      'Revise 6 campos: Aeronave, Rel. Voo, Data do trecho, Origem, Destino, Distância (km).',
    );
    expect(within(painel).getByLabelText('Origem')).toHaveAccessibleDescription(
      /Informe a origem\./,
    );
    expect(aoEnviar).not.toHaveBeenCalled();
  });

  it('os obrigatórios se anunciam como tal; os horários e a atribuição, não', () => {
    prepararFetch(vi.fn());
    const { painel } = abrir();

    expect(within(painel).getByLabelText('Aeronave')).toBeRequired();
    expect(within(painel).getByLabelText('Distância (km)')).toBeRequired();
    expect(within(painel).getByLabelText('Partida prevista')).not.toBeRequired();
    expect(within(painel).getByLabelText('Atribuição (quem usou)')).not.toBeRequired();
  });

  it('lê a distância como se escreve no Brasil e envia o número, não NaN', async () => {
    const aoEnviar = vi.fn(() => Promise.resolve(respostaDe({ id: 9 }, 201)));
    prepararFetch(aoEnviar);
    const { painel, aoFechar } = abrir();

    await preencher(painel, '1.962,5');
    await userEvent.click(within(painel).getByRole('button', { name: 'Registrar trecho' }));

    await vi.waitFor(() => expect(aoFechar).toHaveBeenCalled());
    expect(aoEnviar).toHaveBeenCalledWith(
      expect.objectContaining({ aeronaveId: 1, km: 1962.5, numeroDoTrecho: 1, origem: 'SBSP' }),
    );
  });

  it('a recusa do servidor cai no campo de mesmo nome e some quando ele muda', async () => {
    prepararFetch(() =>
      Promise.resolve(
        respostaDe(
          { title: 'Requisição inválida', campos: { numeroDoTrecho: 'O trecho começa em 1.' } },
          400,
        ),
      ),
    );
    const { painel } = abrir();

    await preencher(painel);
    await userEvent.click(within(painel).getByRole('button', { name: 'Registrar trecho' }));

    const numero = within(painel).getByLabelText('Nº do trecho');
    expect(await within(painel).findByText('O trecho começa em 1.')).toBeInTheDocument();
    expect(numero).toHaveAttribute('aria-invalid', 'true');
    expect(numero).toHaveFocus();
    expect(within(painel).getByRole('alert')).toHaveTextContent('Revise o campo Nº do trecho.');

    await userEvent.type(numero, '2');
    expect(numero).not.toHaveAttribute('aria-invalid');
  });

  it('a duração ao vivo diz a virada da meia-noite, e o pouso diz o dia', async () => {
    prepararFetch(vi.fn());
    const { painel } = abrir();

    await userEvent.type(within(painel).getByLabelText('Data do trecho'), '2026-09-10');
    await userEvent.type(within(painel).getByLabelText('Partida prevista'), '23:30');
    await userEvent.type(within(painel).getByLabelText('Pouso previsto'), '01:00');

    expect(
      within(painel).getByText('Duração (automática): 1,5 h, com pouso no dia seguinte.'),
    ).toBeInTheDocument();
    expect(within(painel).getByLabelText('Pouso previsto')).toHaveAccessibleDescription(
      'Pouso no dia seguinte, 11/09/2026 (+1 dia).',
    );
    expect(within(painel).getByText(/no fuso deste dispositivo/)).toBeInTheDocument();
  });

  it('a aeronave da URL que não está na frota não é enviada', async () => {
    const aoEnviar = vi.fn();
    prepararFetch(aoEnviar);
    const { painel } = abrir({ aeronaveInicial: '999' });

    await within(painel).findByRole('option', { name: 'PS-MEP — Citation XLS+' });
    await userEvent.click(within(painel).getByRole('button', { name: 'Registrar trecho' }));

    expect(within(painel).getByLabelText('Aeronave')).toHaveValue('');
    expect(within(painel).getByLabelText('Aeronave')).toHaveAccessibleDescription(
      'Escolha a aeronave.',
    );
    expect(aoEnviar).not.toHaveBeenCalled();
  });

  it('aeronave sem contrato vigente avisa que o trecho não será rateado', async () => {
    prepararFetch(vi.fn());
    const { painel } = abrir();

    await within(painel).findByRole('option', { name: 'PT-XLB — AW109' });
    await userEvent.selectOptions(within(painel).getByLabelText('Aeronave'), '2');

    expect(
      await within(painel).findByText(/não tem contrato vigente: o trecho não será rateado/),
    ).toBeInTheDocument();
  });

  it('a correção mantém quem ficou inativo e explica a aeronave travada', async () => {
    prepararFetch(vi.fn());
    const { painel } = abrir({
      trecho: {
        id: 5,
        aeronaveId: 1,
        relatorioDeVoo: 'RV-2026-041',
        numeroDoTrecho: 1,
        data: '2026-09-08',
        origem: 'SBSP',
        destino: 'SBRJ',
        km: 365.5,
        proprietarioId: 4,
      },
    });

    const atribuicao = within(painel).getByLabelText('Atribuição (quem usou)');
    expect(
      await within(atribuicao).findByRole('option', { name: 'Otávio Lins (inativo)' }),
    ).toBeInTheDocument();
    expect(atribuicao).toHaveValue('4');
    expect(within(painel).getByLabelText('Distância (km)')).toHaveValue('365,5');
    expect(within(painel).getByLabelText('Aeronave')).toHaveAccessibleDescription(
      'Para trocar a aeronave, exclua o trecho e lance de novo.',
    );
  });

  it('durante o envio, Cancelar fica inerte e o salvar segue focável', async () => {
    prepararFetch(() => new Promise<Response>(() => undefined));
    const { painel, aoFechar } = abrir();

    await preencher(painel);
    await userEvent.click(within(painel).getByRole('button', { name: 'Registrar trecho' }));
    const cancelar = within(painel).getByRole('button', { name: 'Cancelar' });
    await userEvent.click(cancelar);

    expect(cancelar).toHaveAttribute('aria-disabled', 'true');
    expect(within(painel).getByRole('button', { name: 'Registrar trecho' })).toHaveAttribute(
      'aria-busy',
      'true',
    );
    expect(aoFechar).not.toHaveBeenCalled();
  });
});
