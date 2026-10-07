import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ParametroResponse } from '../api/useManutencao';

import { PainelDeParametro } from './PainelDeParametro';

const CONTADORES = { horasDeCelula: 3412.5, ciclos: 2890 };

// O formato real da API: o limite de um parâmetro de data vem `null`.
const PESAGEM = {
  id: 10,
  aeronaveId: 1,
  nome: 'Pesagem regulamentar',
  tipo: 'DATA',
  limite: null,
  dataLimite: '2027-05-09',
  aviso: 30,
} as unknown as ParametroResponse;

function resposta(corpo: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ 'X-Request-Id': 'abc-123' }),
    json: () => Promise.resolve(corpo),
  } as unknown as Response;
}

function prepararFetch(corpo: unknown = {}, status = 201) {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(resposta(corpo, status))),
  );
}

function corpoEnviado(): Record<string, unknown> {
  const [, opcoes] = vi.mocked(fetch).mock.calls[0] ?? [];
  return JSON.parse(String(opcoes?.body)) as Record<string, unknown>;
}

function abrir(conteudo: ReactNode) {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={cliente}>{conteudo}</QueryClientProvider>);
}

const campo = (rotulo: string) => screen.getByLabelText(rotulo);

describe('PainelDeParametro', () => {
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

  it('"4.000" vai como quatro mil horas, e o apoio mostra quanto falta contra hoje', async () => {
    const aoFechar = vi.fn();
    prepararFetch();
    abrir(<PainelDeParametro aeronaveId={5} contadores={CONTADORES} aoFechar={aoFechar} />);

    expect(campo('Limite (h de célula)')).toHaveAccessibleDescription(
      'A aeronave está com 3.412,5 h.',
    );
    await userEvent.type(campo('Nome do parâmetro'), 'Inspeção de célula — 4.000 h');
    await userEvent.type(campo('Limite (h de célula)'), '4.000');
    await userEvent.type(campo('Faixa de aviso (h antes do limite)'), '100');
    expect(campo('Limite (h de célula)')).toHaveAccessibleDescription(
      'A aeronave está com 3.412,5 h. Faltam 587,5 h.',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Criar parâmetro' }));

    await vi.waitFor(() => expect(aoFechar).toHaveBeenCalled());
    expect(corpoEnviado()).toEqual({
      aeronaveId: 5,
      nome: 'Inspeção de célula — 4.000 h',
      tipo: 'HORAS',
      limite: 4000,
      aviso: 100,
    });
  });

  it('um limite já ultrapassado avisa antes de salvar que o parâmetro nasce estourado', async () => {
    prepararFetch();
    abrir(<PainelDeParametro aeronaveId={5} contadores={CONTADORES} aoFechar={vi.fn()} />);

    await userEvent.type(campo('Limite (h de célula)'), '4');
    expect(campo('Limite (h de célula)')).toHaveAccessibleDescription(
      /nasce estourado e a aeronave fica impedida de voar/,
    );
  });

  it('criar vazio marca os obrigatórios e diz o que falta, sem ir ao servidor', async () => {
    prepararFetch();
    abrir(<PainelDeParametro aeronaveId={5} contadores={CONTADORES} aoFechar={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Criar parâmetro' }));

    expect(campo('Nome do parâmetro')).toHaveFocus();
    expect(campo('Limite (h de célula)')).toHaveAccessibleDescription(
      /Informe o limite em horas de célula\./,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Revise 3 campos: Nome do parâmetro, Limite, Faixa de aviso.',
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it('trocar a régua na edição começa limpo, sem "null" nem 30 dias virando 30 horas', async () => {
    prepararFetch();
    abrir(
      <PainelDeParametro
        aeronaveId={1}
        contadores={CONTADORES}
        parametro={PESAGEM}
        aoFechar={vi.fn()}
      />,
    );

    expect(campo('Faixa de aviso (dias antes do limite)')).toHaveValue('30');
    await userEvent.click(screen.getByRole('radio', { name: 'Ciclos' }));

    expect(campo('Limite (ciclos)')).toHaveValue('');
    expect(campo('Limite (ciclos)')).toHaveAttribute('inputmode', 'numeric');
    expect(campo('Faixa de aviso (ciclos antes do limite)')).toHaveValue('');
    expect(screen.queryByLabelText('Data limite')).not.toBeInTheDocument();
  });

  it('o nome repetido volta do servidor no próprio campo', async () => {
    prepararFetch(
      {
        title: 'Parâmetro já cadastrado',
        detail: 'Já existe um parâmetro com este nome nesta aeronave.',
        campos: { nome: 'Já existe um parâmetro com este nome nesta aeronave.' },
      },
      409,
    );
    abrir(
      <PainelDeParametro
        aeronaveId={1}
        contadores={CONTADORES}
        parametro={PESAGEM}
        aoFechar={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await vi.waitFor(() => expect(campo('Nome do parâmetro')).toHaveFocus());
    expect(campo('Nome do parâmetro')).toHaveAccessibleDescription(
      'Já existe um parâmetro com este nome nesta aeronave.',
    );
  });
});
