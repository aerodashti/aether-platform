import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { TripulanteResponse } from '../api/useTripulantes';

import { PainelDeTripulante } from './PainelDeTripulante';

const JULIANA = {
  id: 2,
  nome: 'Juliana Prates',
  canac: '445566',
  funcao: 'COPILOTO',
  validadeCma: '2026-11-10',
  cmaVencido: false,
  validadeCht: '2026-08-29',
  chtVencido: true,
  horasTotais: 3115.5,
  telefone: null,
  email: null,
  situacao: 'ATIVO',
} as unknown as TripulanteResponse;

function respostaDe(corpo: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ 'X-Request-Id': 'abc-123' }),
    json: () => Promise.resolve(corpo),
  } as unknown as Response;
}

function montar(tripulante?: TripulanteResponse) {
  const aoSalvar = vi.fn();
  const aoFechar = vi.fn();
  const cliente = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  render(
    <QueryClientProvider client={cliente}>
      <PainelDeTripulante
        aeronaveId={1}
        tripulante={tripulante}
        aoSalvar={aoSalvar}
        aoFechar={aoFechar}
      />
    </QueryClientProvider>,
  );
  return { aoSalvar, aoFechar };
}

function corpoEnviado(): Record<string, unknown> {
  const chamada = vi.mocked(fetch).mock.calls.at(-1);
  return JSON.parse(String(chamada?.[1]?.body)) as Record<string, unknown>;
}

describe('PainelDeTripulante', () => {
  beforeEach(() => {
    HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
      this.open = true;
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(respostaDe(JULIANA))),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('salvar em branco leva o foco ao nome e o resumo diz o que falta', async () => {
    const { aoSalvar } = montar();

    await userEvent.click(screen.getByRole('button', { name: 'Adicionar tripulante' }));

    const nome = screen.getByRole('textbox', { name: 'Nome completo' });
    expect(nome).toHaveFocus();
    expect(nome).toBeRequired();
    expect(nome).toHaveAccessibleDescription('Informe o nome do tripulante.');
    expect(screen.getByRole('alert')).toHaveTextContent('Revise o campo Nome completo.');
    expect(fetch).not.toHaveBeenCalled();
    expect(aoSalvar).not.toHaveBeenCalled();
  });

  it('o Enter num campo envia, e as horas no formato da tabela chegam como número', async () => {
    const { aoSalvar } = montar();

    await userEvent.type(
      screen.getByRole('textbox', { name: 'Horas totais de voo (h)' }),
      '3.115,5',
    );
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Nome completo' }),
      'Juliana Prates{Enter}',
    );

    await waitFor(() => expect(aoSalvar).toHaveBeenCalledWith('Juliana Prates'));
    expect(corpoEnviado()).toMatchObject({ nome: 'Juliana Prates', horasTotais: 3115.5 });
  });

  it('horas ilegíveis param no campo, em vez de irem como nulo', async () => {
    montar(JULIANA);
    const horas = screen.getByRole('textbox', { name: 'Horas totais de voo (h)' });
    expect(horas).toHaveValue('3115,5');

    await userEvent.clear(horas);
    await userEvent.type(horas, 'null120');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(horas).toHaveFocus();
    expect(horas).toHaveAccessibleDescription(
      'Use só números, com vírgula para as casas decimais.',
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it('a recusa do servidor cai no campo de mesmo nome, com o foco nele', async () => {
    vi.mocked(fetch).mockResolvedValue(
      respostaDe({ campos: { canac: 'O CANAC tem 6 dígitos, como 123456.' } }, 400),
    );
    const { aoFechar } = montar(JULIANA);

    await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    const canac = await screen.findByRole('textbox', { name: 'Código ANAC (CANAC)' });
    expect(canac).toHaveAttribute('aria-invalid', 'true');
    expect(canac).toHaveFocus();
    expect(aoFechar).not.toHaveBeenCalled();
  });

  it('sem rede, o resumo diz que não salvou e o painel continua aberto', async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError('Failed to fetch'));
    const { aoSalvar } = montar(JULIANA);

    await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível falar com o servidor.',
    );
    expect(aoSalvar).not.toHaveBeenCalled();
  });

  it('durante o envio, Cancelar fica inerte', async () => {
    vi.mocked(fetch).mockReturnValue(new Promise(() => {}));
    const { aoFechar } = montar(JULIANA);

    await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));
    const cancelar = screen.getByRole('button', { name: 'Cancelar' });
    await userEvent.click(cancelar);

    expect(cancelar).toHaveAttribute('aria-disabled', 'true');
    expect(aoFechar).not.toHaveBeenCalled();
  });

  it('apagar parte de uma validade bloqueia o envio, em vez de apagar o CMA gravado', async () => {
    montar(JULIANA);
    const cma = screen.getByLabelText('Validade do CMA');
    Object.defineProperty(cma, 'validity', { value: { badInput: true } });

    fireEvent.change(cma, { target: { value: '' } });
    await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(cma).toHaveFocus();
    expect(cma).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Revise o campo Validade do CMA.');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('o Enter no meio de uma data digitada pela metade não a descarta', async () => {
    montar();
    await userEvent.type(screen.getByRole('textbox', { name: 'Nome completo' }), 'Juliana Prates');
    const cht = screen.getByLabelText('Validade da habilitação (CHT)');
    await userEvent.click(cht);
    // Digitar só o dia num campo vazio não muda o `value`: nenhuma mudança chega à tela.
    Object.defineProperty(cht, 'validity', { value: { badInput: true } });

    await userEvent.keyboard('{Enter}');

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Revise o campo Validade da habilitação (CHT).',
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it('validade já passada é aceita, com o aviso no apoio; além de cinco anos, não', async () => {
    montar(JULIANA);
    const cht = screen.getByLabelText('Validade da habilitação (CHT)');

    fireEvent.change(cht, { target: { value: '2020-01-10' } });
    expect(cht).toHaveAccessibleDescription(/o CHT entra vencido/);

    fireEvent.change(cht, { target: { value: '2099-01-01' } });
    await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));
    expect(cht).toHaveAccessibleDescription(/^Use uma data até/);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('a situação tem legenda e diz o que o Inativo muda', () => {
    montar(JULIANA);

    expect(screen.getByRole('radiogroup', { name: 'Situação' })).toHaveAccessibleDescription(
      'Inativo deixa de gerar avisos de CMA e CHT na aeronave.',
    );
  });
});
