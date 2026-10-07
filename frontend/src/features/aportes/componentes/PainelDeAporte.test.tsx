import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { hojeLocal } from '@/compartilhado/formatacao/datas';

import type { AporteResponse } from '../api/useAportes';

import { PainelDeAporte } from './PainelDeAporte';
import { competenciaPadrao } from './rascunhoDoAporte';

const AERONAVES = [
  { id: 1, matricula: 'PS-MEP', modelo: 'Citation XLS+' },
  { id: 2, matricula: 'PR-KRT', modelo: 'Phenom 300E' },
];
const PROPRIETARIOS = [
  { id: 7, nome: 'Ricardo Meirelles', situacao: 'ATIVO' },
  { id: 8, nome: 'Helena Sarraf', situacao: 'ATIVO' },
];
// A PR-KRT não tem contrato vigente.
const VINCULOS = [{ proprietarioId: 7, aeronaveId: 1, matricula: 'PS-MEP', percentual: 100 }];

const GRAVADO: AporteResponse = {
  id: 5,
  aeronaveId: 1,
  matricula: 'PS-MEP',
  proprietarioId: 7,
  nomeDoProprietario: 'Ricardo Meirelles',
  data: '2026-10-03',
  competencia: '2026-09',
  valor: 25000.5,
};

function resposta(corpo: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ 'X-Request-Id': 'abc-123' }),
    json: () => Promise.resolve(corpo),
  } as unknown as Response;
}

type Responder = () => Promise<Response>;

function prepararFetch(envio: Responder = () => Promise.resolve(resposta(GRAVADO, 201))) {
  vi.stubGlobal(
    'fetch',
    vi.fn((entrada: string, opcoes?: RequestInit) => {
      if (opcoes?.method && opcoes.method !== 'GET') {
        return envio();
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
  return render(
    <QueryClientProvider client={cliente}>
      <MemoryRouter>{conteudo}</MemoryRouter>
    </QueryClientProvider>,
  );
}

async function preencherNaPsMep(valor: string) {
  await screen.findByRole('option', { name: 'Ricardo Meirelles' });
  await userEvent.selectOptions(screen.getByLabelText('Proprietário'), 'Ricardo Meirelles');
  await userEvent.type(screen.getByLabelText('Valor (R$)'), valor);
}

const registrar = () => screen.getByRole('button', { name: 'Registrar aporte' });

describe('PainelDeAporte', () => {
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

  it('salvar sem aeronave nem valor leva o foco à Aeronave e diz o que falta, sem ir ao servidor', async () => {
    prepararFetch();
    abrir(<PainelDeAporte aoFechar={vi.fn()} aoSalvar={vi.fn()} />);
    await screen.findByRole('option', { name: 'PS-MEP — Citation XLS+' });

    await userEvent.click(registrar());

    const aeronave = screen.getByLabelText('Aeronave');
    expect(aeronave).toHaveFocus();
    expect(aeronave).toBeRequired();
    expect(aeronave).toHaveAccessibleDescription('Escolha a aeronave.');
    expect(screen.getByLabelText('Valor (R$)')).toHaveAccessibleDescription('Informe o valor.');
    expect(screen.getByText(/^Revise 2 campos/)).toHaveTextContent(
      'Revise 2 campos: Aeronave, Valor (R$).',
    );
    expect(registrar()).not.toHaveAttribute('aria-disabled');
    expect(envios()).toEqual([]);
  });

  it('lê "25.000" como vinte e cinco mil, com a competência do mês anterior ao crédito', async () => {
    const aoSalvar = vi.fn();
    prepararFetch();
    abrir(<PainelDeAporte aeronaveInicial="1" aoFechar={vi.fn()} aoSalvar={aoSalvar} />);

    expect(screen.getByLabelText('Valor (R$)')).toHaveAttribute('inputmode', 'decimal');
    await preencherNaPsMep('25.000');
    await userEvent.click(registrar());

    expect(envios()).toEqual([
      {
        entrada: '/api/aportes',
        corpo: {
          aeronaveId: 1,
          proprietarioId: 7,
          data: hojeLocal(),
          competencia: competenciaPadrao(hojeLocal()),
          valor: 25000,
        },
      },
    ]);
    await vi.waitFor(() => expect(aoSalvar).toHaveBeenCalledWith(GRAVADO));
  });

  it('a competência acompanha a data do crédito até a pessoa escolhê-la', async () => {
    prepararFetch();
    abrir(<PainelDeAporte aeronaveInicial="1" aoFechar={vi.fn()} aoSalvar={vi.fn()} />);
    const data = screen.getByLabelText('Data do crédito');
    const competencia = screen.getByLabelText('Competência');

    expect(data).toHaveAttribute('max', hojeLocal());
    fireEvent.change(data, { target: { value: '2025-08-15' } });
    expect(competencia).toHaveValue('2025-07');

    fireEvent.change(competencia, { target: { value: '2025-08' } });
    fireEvent.change(data, { target: { value: '2025-08-20' } });
    expect(competencia).toHaveValue('2025-08');
  });

  it('a recusa do servidor cai no campo dono, leva o foco a ele e sai quando ele muda', async () => {
    prepararFetch(() =>
      Promise.resolve(
        resposta(
          {
            title: 'Aporte inválido',
            campos: { data: 'O aporte é registrado como recebido: registre depois.' },
          },
          400,
        ),
      ),
    );
    abrir(<PainelDeAporte aeronaveInicial="1" aoFechar={vi.fn()} aoSalvar={vi.fn()} />);
    await preencherNaPsMep('100');

    await userEvent.click(registrar());

    const data = screen.getByLabelText('Data do crédito');
    await vi.waitFor(() => expect(data).toHaveFocus());
    expect(data).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Valor (R$)')).not.toHaveAttribute('aria-invalid');
    expect(screen.getByText('Revise o campo Data do crédito.')).toBeInTheDocument();

    fireEvent.change(data, { target: { value: '2025-10-01' } });
    expect(data).not.toHaveAttribute('aria-invalid');
  });

  it('sem contrato vigente, diz o porquê e aponta o contrato da aeronave', async () => {
    prepararFetch();
    abrir(<PainelDeAporte aeronaveInicial="2" aoFechar={vi.fn()} aoSalvar={vi.fn()} />);

    expect(
      await screen.findByText(
        'PR-KRT não tem contrato vigente, e o aporte é de quem participa dela.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Cadastrar o contrato da aeronave' })).toHaveAttribute(
      'href',
      '/aeronaves/2',
    );

    await userEvent.type(screen.getByLabelText('Valor (R$)'), '100');
    await userEvent.click(registrar());

    expect(screen.getByLabelText('Proprietário')).toHaveAccessibleDescription(
      'A aeronave não tem contrato vigente: cadastre o contrato antes do aporte.',
    );
    expect(envios()).toEqual([]);
  });

  it('a lista de proprietários que não carregou se diz, e dá para tentar de novo', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((entrada: string) =>
        Promise.resolve(
          entrada.startsWith('/api/aeronaves') ? resposta(AERONAVES) : resposta({}, 500),
        ),
      ),
    );
    abrir(<PainelDeAporte aeronaveInicial="1" aoFechar={vi.fn()} aoSalvar={vi.fn()} />);

    expect(
      await screen.findByText('Não foi possível carregar os proprietários do contrato.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: 'Lista de proprietários indisponível' }),
    ).toBeVisible();

    const chamadasAntes = vi.mocked(fetch).mock.calls.length;
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(vi.mocked(fetch).mock.calls.length).toBeGreaterThan(chamadasAntes);
  });

  it('na correção, a aeronave fica travada e diz como trocar', async () => {
    prepararFetch();
    abrir(<PainelDeAporte aporte={GRAVADO} aoFechar={vi.fn()} aoSalvar={vi.fn()} />);

    const aeronave = screen.getByLabelText('Aeronave');
    expect(aeronave).toBeDisabled();
    expect(aeronave).toHaveAccessibleDescription(
      'A aeronave não muda na correção: para trocar, exclua e registre de novo.',
    );
    expect(screen.getByLabelText('Valor (R$)')).toHaveValue('25000,5');
    expect(screen.getByLabelText('Competência')).toHaveValue('2026-09');
  });

  it('durante o envio, o Cancelar fica inerte', async () => {
    const aoFechar = vi.fn();
    prepararFetch(() => new Promise<Response>(() => undefined));
    abrir(<PainelDeAporte aeronaveInicial="1" aoFechar={aoFechar} aoSalvar={vi.fn()} />);
    await preencherNaPsMep('100');

    await userEvent.click(registrar());
    const cancelar = screen.getByRole('button', { name: 'Cancelar' });
    await userEvent.click(cancelar);

    expect(cancelar).toHaveAttribute('aria-disabled', 'true');
    expect(aoFechar).not.toHaveBeenCalled();
  });
});
