import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { DetalheDaAeronaveResponse } from '../api/useDetalheDaAeronave';

import { PainelFinanceiro } from './PainelFinanceiro';

/** O PP-JHF do seed: aporte fixo sem valor, como a API o serializa. */
const DETALHE = {
  id: 4,
  configuracaoFinanceira: {
    baseDoRateio: 'POR_USO',
    modeloDeAporte: 'FIXO',
    periodicidadeDoAporteMeses: 1,
    valorDoAporte: null,
    diaDeFechamento: 5,
    saldoDeAbertura: -1250.5,
  },
} as unknown as DetalheDaAeronaveResponse;

function respostaDe(corpo: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(),
    json: () => Promise.resolve(corpo),
  } as unknown as Response;
}

function montar(resposta: () => Promise<Response> = () => Promise.resolve(respostaDe(DETALHE))) {
  const envios: Array<Record<string, unknown>> = [];
  const aoFechar = vi.fn();
  vi.stubGlobal(
    'fetch',
    vi.fn((_caminho: string, opcoes?: RequestInit) => {
      envios.push(JSON.parse(String(opcoes?.body)) as Record<string, unknown>);
      return resposta();
    }),
  );
  render(
    <QueryClientProvider client={new QueryClient()}>
      <PainelFinanceiro detalhe={DETALHE} aoFechar={aoFechar} />
    </QueryClientProvider>,
  );
  return { envios, aoFechar };
}

const campo = (nome: string) => screen.getByRole('textbox', { name: nome });
const salvar = () => userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

async function substituir(nome: string, texto: string) {
  await userEvent.clear(campo(nome));
  await userEvent.type(campo(nome), texto);
}

describe('PainelFinanceiro', () => {
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

  it('o aporte fixo sem valor é falta no campo, com foco e resumo, sem envio', async () => {
    const { envios } = montar();
    expect(campo('Valor do aporte (R$)')).toHaveValue('');

    await salvar();

    expect(campo('Valor do aporte (R$)')).toHaveFocus();
    expect(screen.getByRole('alert')).toHaveTextContent('Revise o campo Valor do aporte (R$).');
    expect(envios).toEqual([]);
  });

  it('"12.500" no saldo é doze mil e quinhentos, e o aporte vai em reais', async () => {
    const { envios, aoFechar } = montar();
    await substituir('Valor do aporte (R$)', 'R$ 85.000,00');
    await substituir('Saldo do fundo no cadastro (R$)', '12.500');

    await salvar();

    await vi.waitFor(() => expect(aoFechar).toHaveBeenCalled());
    expect(envios[0]).toMatchObject({ valorDoAporte: 85000, saldoDeAbertura: 12500 });
  });

  it('no proporcional ao uso o valor do aporte some e não é enviado', async () => {
    const { envios, aoFechar } = montar();

    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'Modelo de aporte' }),
      'PROPORCIONAL_AO_USO',
    );
    expect(screen.queryByRole('textbox', { name: 'Valor do aporte (R$)' })).not.toBeInTheDocument();
    await salvar();

    await vi.waitFor(() => expect(aoFechar).toHaveBeenCalled());
    expect(envios[0]).not.toHaveProperty('valorDoAporte');
  });

  it('a recusa da periodicidade cai na seleção dela', async () => {
    montar(() =>
      Promise.resolve(
        respostaDe(
          { campos: { periodicidadeDoAporteMeses: 'A periodicidade precisa ser 1, 2, 3...' } },
          400,
        ),
      ),
    );
    await substituir('Valor do aporte (R$)', '85.000,00');

    await salvar();

    const periodicidade = screen.getByRole('combobox', { name: 'Periodicidade do aporte' });
    expect(await screen.findByText('A periodicidade precisa ser 1, 2, 3...')).toBeInTheDocument();
    expect(periodicidade).toHaveFocus();
  });

  it('diz que a base do rateio vale também para os meses já fechados', () => {
    montar();

    expect(screen.getByRole('combobox', { name: 'Base do rateio' })).toHaveAccessibleDescription(
      expect.stringContaining('inclusive os já fechados') as string,
    );
    expect(screen.queryByText(/próximo fechamento/)).not.toBeInTheDocument();
  });
});
