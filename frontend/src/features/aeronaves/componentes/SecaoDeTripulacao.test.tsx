import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SecaoDeTripulacao } from './SecaoDeTripulacao';

const TRIPULANTES = [
  {
    id: 2,
    nome: 'Juliana Prates',
    canac: '445566',
    funcao: 'COPILOTO',
    validadeCma: '2026-11-10',
    cmaVencido: false,
    validadeCht: '2026-08-29',
    chtVencido: true,
    horasTotais: 3115.5,
    situacao: 'ATIVO',
  },
  {
    id: 1,
    nome: 'Marcos Vilela',
    canac: '112233',
    funcao: 'COMANDANTE',
    horasTotais: 8420,
    situacao: 'ATIVO',
  },
];

function respostaDe(corpo: unknown) {
  return {
    ok: true,
    status: 200,
    headers: new Headers({ 'X-Request-Id': 'abc-123' }),
    json: () => Promise.resolve(corpo),
  } as unknown as Response;
}

function montar() {
  vi.stubGlobal(
    'fetch',
    vi.fn((_caminho: string, opcoes?: RequestInit) =>
      Promise.resolve(respostaDe(opcoes?.method === 'PUT' ? TRIPULANTES[0] : TRIPULANTES)),
    ),
  );
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={cliente}>
      <SecaoDeTripulacao aeronaveId={1} podeGerir />
    </QueryClientProvider>,
  );
}

describe('SecaoDeTripulacao', () => {
  beforeEach(() => {
    HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
      this.open = true;
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('cada Editar diz de quem é', async () => {
    montar();

    expect(await screen.findByRole('button', { name: 'Editar Juliana Prates' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Editar Marcos Vilela' })).toBeVisible();
  });

  it('ao cancelar, o foco volta ao Editar de quem foi aberto', async () => {
    montar();
    const editar = await screen.findByRole('button', { name: 'Editar Juliana Prates' });

    await userEvent.click(editar);
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(editar).toHaveFocus();
  });

  it('salvar fecha o painel e anuncia a confirmação', async () => {
    montar();

    await userEvent.click(await screen.findByRole('button', { name: 'Editar Juliana Prates' }));
    await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(
      await screen.findByText('Tripulação atualizada: Juliana Prates.', {
        selector: '[role="status"]',
      }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
