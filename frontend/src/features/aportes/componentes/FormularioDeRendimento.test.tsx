import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { hojeLocal } from '@/compartilhado/formatacao/datas';

import { FormularioDeRendimento } from './FormularioDeRendimento';

const AERONAVES = [
  { id: 1, matricula: 'PS-MEP', modelo: 'Citation XLS+' },
  { id: 2, matricula: 'PR-KRT', modelo: 'Phenom 300E' },
];
// A PR-KRT não tem contrato vigente.
const VINCULOS = [{ proprietarioId: 7, aeronaveId: 1, matricula: 'PS-MEP', percentual: 100 }];

function resposta(corpo: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ 'X-Request-Id': 'abc-123' }),
    json: () => Promise.resolve(corpo),
  } as unknown as Response;
}

function prepararFetch(envio = () => Promise.resolve(resposta({ id: 9 }, 201))) {
  vi.stubGlobal(
    'fetch',
    vi.fn((entrada: string, opcoes?: RequestInit) => {
      if (opcoes?.method && opcoes.method !== 'GET') {
        return envio();
      }
      return Promise.resolve(resposta(entrada.startsWith('/api/aeronaves') ? AERONAVES : VINCULOS));
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

async function abrirNaPsMep() {
  abrir(<FormularioDeRendimento aeronaveInicial="1" aoFechar={vi.fn()} aoSalvar={vi.fn()} />);
  await screen.findByRole('option', { name: 'PS-MEP' });
}

const registrar = () => screen.getByRole('button', { name: 'Registrar rendimento' });

describe('FormularioDeRendimento', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('abre com o foco no formulário e mostra a aeronave de destino que veio do filtro', async () => {
    prepararFetch();
    await abrirNaPsMep();

    expect(screen.getByRole('region', { name: 'Novo rendimento' })).toHaveFocus();
    expect(screen.getByLabelText('Aeronave')).toHaveDisplayValue('PS-MEP');
    expect(screen.getByLabelText('Data do crédito')).toHaveAttribute('max', hojeLocal());
  });

  it('lê o saldo com ponto de milhar e a taxa com o símbolo do extrato', async () => {
    prepararFetch();
    await abrirNaPsMep();

    await userEvent.type(screen.getByLabelText('Aplicação'), 'CDB DI');
    await userEvent.type(screen.getByLabelText('Saldo aplicado (R$, opcional)'), '104.200');
    await userEvent.type(screen.getByLabelText('Taxa do mês (%, opcional)'), '0,9%');
    await userEvent.type(screen.getByLabelText('Rendimento (R$)'), '937,80');
    await userEvent.click(registrar());

    expect(envios()).toEqual([
      {
        entrada: '/api/rendimentos',
        corpo: {
          aeronaveId: 1,
          data: hojeLocal(),
          aplicacao: 'CDB DI',
          saldoAplicado: 104200,
          taxa: 0.9,
          valor: 937.8,
        },
      },
    ]);
  });

  it('a taxa ilegível fica no próprio campo, em vez de ir como nula', async () => {
    prepararFetch();
    await abrirNaPsMep();

    await userEvent.type(screen.getByLabelText('Aplicação'), 'CDB DI');
    await userEvent.type(screen.getByLabelText('Taxa do mês (%, opcional)'), '0,9 ao mês');
    await userEvent.type(screen.getByLabelText('Rendimento (R$)'), '937,80');
    await userEvent.click(registrar());

    const taxa = screen.getByLabelText('Taxa do mês (%, opcional)');
    expect(taxa).toHaveFocus();
    expect(taxa).toHaveAccessibleDescription(
      'Use só números, com vírgula para as casas decimais. Até 10% ao mês, com até 4 casas.',
    );
    expect(envios()).toEqual([]);
  });

  it('a recusa da data cai em Data do crédito, e não em Rendimento', async () => {
    prepararFetch(() =>
      Promise.resolve(
        resposta(
          {
            title: 'Rendimento inválido',
            campos: { data: 'Registre o rendimento depois que o crédito cair na conta.' },
          },
          400,
        ),
      ),
    );
    await abrirNaPsMep();

    await userEvent.type(screen.getByLabelText('Aplicação'), 'CDB DI');
    await userEvent.type(screen.getByLabelText('Rendimento (R$)'), '937,80');
    await userEvent.click(registrar());

    const data = screen.getByLabelText('Data do crédito');
    await vi.waitFor(() => expect(data).toHaveAttribute('aria-invalid', 'true'));
    expect(data).toHaveFocus();
    expect(screen.getByLabelText('Rendimento (R$)')).not.toHaveAttribute('aria-invalid');
  });

  it('com saldo e taxa, o apoio do rendimento mostra a conta do extrato', async () => {
    prepararFetch();
    await abrirNaPsMep();

    await userEvent.type(screen.getByLabelText('Saldo aplicado (R$, opcional)'), '104.200,00');
    await userEvent.type(screen.getByLabelText('Taxa do mês (%, opcional)'), '0,91');

    expect(screen.getByLabelText('Rendimento (R$)')).toHaveAccessibleDescription(
      /^Pelo extrato, saldo × taxa dá R\$\s948,22; vale o que o banco creditou\.$/,
    );
  });

  it('na aeronave sem contrato vigente, avisa que o rendimento não é rateado', async () => {
    prepararFetch();
    abrir(<FormularioDeRendimento aeronaveInicial="2" aoFechar={vi.fn()} aoSalvar={vi.fn()} />);

    await vi.waitFor(() =>
      expect(screen.getByLabelText('Aeronave')).toHaveAccessibleDescription(
        'Sem contrato vigente: o rendimento entra no fundo, mas não é rateado entre proprietários.',
      ),
    );
  });
});
