import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { hojeLocal, somarDias, somarMeses } from '@/compartilhado/formatacao/datas';

import type { ManutencaoResponse } from '../api/useManutencao';

import { PainelDeManutencaoAgendada } from './PainelDeManutencaoAgendada';

// O formato real da API: o opcional ausente vem `null`.
const SEM_VALOR = {
  id: 2,
  aeronaveId: 1,
  data: '2036-09-22',
  hora: '09:00:00',
  responsavel: null,
  descricao: 'Boletim de serviço — trem de pouso',
  valor: null,
  status: 'PROGRAMADA',
  concluidaEm: null,
} as unknown as ManutencaoResponse;

function resposta(corpo: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ 'X-Request-Id': 'abc-123' }),
    json: () => Promise.resolve(corpo),
  } as unknown as Response;
}

function prepararFetch(envio: () => Promise<Response> = () => Promise.resolve(resposta({}, 201))) {
  vi.stubGlobal('fetch', vi.fn(envio));
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

describe('PainelDeManutencaoAgendada', () => {
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

  it('agendar vazio diz o que falta no campo e no resumo, sem ir ao servidor', async () => {
    prepararFetch();
    abrir(<PainelDeManutencaoAgendada aeronaveId={1} aoFechar={vi.fn()} />);

    expect(campo('Data')).toBeRequired();
    expect(campo('Descrição')).toBeRequired();
    expect(campo('Horário')).not.toBeRequired();
    expect(campo('Horário')).toHaveAccessibleDescription('Opcional.');

    await userEvent.click(screen.getByRole('button', { name: 'Agendar' }));

    expect(campo('Data')).toHaveFocus();
    expect(campo('Data')).toHaveAccessibleDescription('Informe a data.');
    expect(campo('Descrição')).toHaveAccessibleDescription('Informe a descrição.');
    expect(screen.getByRole('alert')).toHaveTextContent('Revise 2 campos: Data, Descrição.');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('o valor é lido em português: "48.000" vai como quarenta e oito mil', async () => {
    const aoFechar = vi.fn();
    prepararFetch();
    abrir(<PainelDeManutencaoAgendada aeronaveId={1} aoFechar={aoFechar} />);

    fireEvent.change(campo('Data'), { target: { value: '2036-09-22' } });
    await userEvent.type(campo('Descrição'), 'Inspeção de 100 h — célula');
    await userEvent.type(campo('Valor (R$)'), '48.000');
    expect(campo('Valor (R$)')).toHaveAttribute('inputmode', 'decimal');
    await userEvent.click(screen.getByRole('button', { name: 'Agendar' }));

    await vi.waitFor(() => expect(aoFechar).toHaveBeenCalled());
    expect(corpoEnviado()).toEqual({
      aeronaveId: 1,
      data: '2036-09-22',
      descricao: 'Inspeção de 100 h — célula',
      valor: 48000,
    });
  });

  it('o valor que não é número fica no campo, em vez de ir como nulo', async () => {
    prepararFetch();
    abrir(<PainelDeManutencaoAgendada aeronaveId={1} manutencao={SEM_VALOR} aoFechar={vi.fn()} />);

    expect(campo('Valor (R$)')).toHaveValue('');
    await userEvent.type(campo('Valor (R$)'), '1e3');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(campo('Valor (R$)')).toHaveFocus();
    expect(campo('Valor (R$)')).toHaveAccessibleDescription(
      /Use só números, com vírgula para as casas decimais\./,
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it('a data passada é aceita, mas o apoio diz que a manutenção nasce atrasada', () => {
    prepararFetch();
    abrir(<PainelDeManutencaoAgendada aeronaveId={1} aoFechar={vi.fn()} />);
    const hoje = hojeLocal();

    expect(campo('Data')).toHaveAttribute('min', somarMeses(hoje, -12));
    expect(campo('Data')).toHaveAttribute('max', somarMeses(hoje, 120));
    fireEvent.change(campo('Data'), { target: { value: somarDias(hoje, 3) } });
    expect(campo('Data')).not.toHaveAccessibleDescription(/atrasada/);
    fireEvent.change(campo('Data'), { target: { value: somarDias(hoje, -3) } });
    expect(campo('Data')).toHaveAccessibleDescription(/nasce atrasada/);
  });

  it('o horário digitado pela metade bloqueia o envio, em vez de apagar a hora gravada', async () => {
    prepararFetch();
    abrir(<PainelDeManutencaoAgendada aeronaveId={1} manutencao={SEM_VALOR} aoFechar={vi.fn()} />);

    const horario = campo('Horário') as HTMLInputElement;
    Object.defineProperty(horario, 'validity', { value: { badInput: true } });
    fireEvent.change(horario, { target: { value: '' } });
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(horario).toHaveFocus();
    expect(screen.getByRole('alert')).toHaveTextContent('Revise o campo Horário.');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('a recusa do servidor cai no campo e o painel não fecha durante o envio', async () => {
    let responder: (valor: Response) => void = () => undefined;
    prepararFetch(() => new Promise((resolver) => (responder = resolver)));
    const aoFechar = vi.fn();
    abrir(<PainelDeManutencaoAgendada aeronaveId={1} manutencao={SEM_VALOR} aoFechar={aoFechar} />);

    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(aoFechar).not.toHaveBeenCalled();

    responder(
      resposta(
        {
          title: 'Manutenção inválida',
          detail: 'Use uma data entre 07/10/2025 e 07/10/2036.',
          campos: { data: 'Use uma data entre 07/10/2025 e 07/10/2036.' },
        },
        400,
      ),
    );

    await vi.waitFor(() =>
      expect(campo('Data')).toHaveAccessibleDescription(
        'Use uma data entre 07/10/2025 e 07/10/2036.',
      ),
    );
    expect(campo('Data')).toHaveFocus();
  });
});
