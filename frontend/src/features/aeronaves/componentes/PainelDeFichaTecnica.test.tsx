import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { DetalheDaAeronaveResponse } from '../api/useDetalheDaAeronave';

import { PainelDeFichaTecnica } from './PainelDeFichaTecnica';

const DETALHE = {
  id: 1,
  matricula: 'PS-MEP',
  fabricante: 'Cessna',
  modelo: 'Citation XLS+',
  numeroDeSerie: '560-6321',
  base: 'SBSP',
  hangar: 'Hangar 7',
  apoliceDoSeguro: null,
  pesoMaxDecolagemKg: 9163,
  pesoMaxPousoKg: null,
  contadores: {
    horasDeCelula: 3412.5,
    ciclos: 2890,
    kmVoados: 1482300,
    horasMotor1: 3390.2,
    horasMotor2: 3388.7,
    horasMotor3: null,
    horasApu: null,
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

interface Envio {
  caminho: string;
  corpo: Record<string, unknown>;
}

/** As respostas por caminho; o que não estiver aqui responde 200 com o detalhe. */
function montar(ehAdministrador: boolean, respostas: Record<string, () => Promise<Response>> = {}) {
  const envios: Envio[] = [];
  const aoFechar = vi.fn();
  vi.stubGlobal(
    'fetch',
    vi.fn((caminho: string, opcoes?: RequestInit) => {
      if (opcoes?.method === 'PUT') {
        envios.push({ caminho, corpo: JSON.parse(String(opcoes.body)) as Record<string, unknown> });
      }
      return respostas[caminho]?.() ?? Promise.resolve(respostaDe(DETALHE));
    }),
  );
  render(
    <QueryClientProvider client={new QueryClient()}>
      <PainelDeFichaTecnica
        detalhe={DETALHE}
        ehAdministrador={ehAdministrador}
        aoFechar={aoFechar}
      />
    </QueryClientProvider>,
  );
  return { envios, aoFechar };
}

const campo = (nome: string) => screen.getByRole('textbox', { name: nome });
const salvar = () => userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

async function substituir(nome: string, texto: string) {
  await userEvent.clear(campo(nome));
  if (texto) {
    await userEvent.type(campo(nome), texto);
  }
}

describe('PainelDeFichaTecnica', () => {
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

  it('o ausente abre vazio, e os obrigatórios do servidor são anunciados', () => {
    montar(true);

    expect(campo('Peso máx. de pouso (kg)')).toHaveValue('');
    expect(campo('Apólice do seguro')).toHaveValue('');
    expect(campo('Horas de célula (h)')).toHaveValue('3412,5');
    expect(campo('Modelo')).toBeRequired();
    expect(campo('Base (ICAO)')).toBeRequired();
    expect(campo('Horas de célula (h)')).toBeRequired();
  });

  it('salvar com problema foca o primeiro campo, lista os campos e não envia', async () => {
    const { envios } = montar(false);
    await substituir('Modelo', '');
    await substituir('Base (ICAO)', 'sb1p');

    await salvar();

    expect(campo('Modelo')).toHaveFocus();
    expect(campo('Modelo')).toHaveAccessibleDescription('Informe o modelo.');
    expect(campo('Base (ICAO)')).toHaveValue('SB1P');
    expect(screen.getByRole('alert')).toHaveTextContent('Revise 2 campos: Modelo, Base (ICAO).');
    expect(screen.getByRole('button', { name: 'Salvar' })).not.toHaveAttribute('aria-disabled');
    expect(envios).toEqual([]);
  });

  it('peso com ponto de milhar é lido como milhar, e o pouso não passa da decolagem', async () => {
    const { envios } = montar(false);
    await substituir('Peso máx. de pouso (kg)', '9.999');

    await salvar();

    expect(campo('Peso máx. de pouso (kg)')).toHaveAccessibleDescription(
      'O peso máximo de pouso não pode passar do peso máximo de decolagem. Até o peso máximo de decolagem.',
    );
    await substituir('Peso máx. de pouso (kg)', '8.482');
    await salvar();

    expect(envios[0]?.corpo).toMatchObject({ pesoMaxDecolagemKg: 9163, pesoMaxPousoKg: 8482 });
  });

  it('a recusa do servidor cai no campo que ela nomeia, e não no Modelo', async () => {
    montar(false, {
      '/api/aeronaves/1/ficha-tecnica': () =>
        Promise.resolve(respostaDe({ campos: { base: 'Base fora do cadastro ICAO.' } }, 400)),
    });

    await salvar();

    expect(await screen.findByText('Base fora do cadastro ICAO.')).toBeInTheDocument();
    expect(campo('Base (ICAO)')).toHaveFocus();
    expect(campo('Modelo')).not.toHaveAttribute('aria-invalid');
  });

  it('trocar só o hangar não reenvia os contadores', async () => {
    const { envios, aoFechar } = montar(true);
    await substituir('Hangar', 'Hangar 3');

    await salvar();

    await vi.waitFor(() => expect(aoFechar).toHaveBeenCalled());
    expect(envios.map((envio) => envio.caminho)).toEqual(['/api/aeronaves/1/ficha-tecnica']);
    expect(envios[0]?.corpo).toMatchObject({ hangar: 'Hangar 3' });
    expect(envios[0]?.corpo).not.toHaveProperty('apoliceDoSeguro');
  });

  it('Enter num campo salva, como o botão', async () => {
    const { envios, aoFechar } = montar(false);
    await substituir('Hangar', 'Hangar 3{Enter}');

    await vi.waitFor(() => expect(aoFechar).toHaveBeenCalled());
    expect(envios[0]?.corpo).toMatchObject({ hangar: 'Hangar 3' });
  });

  it('corrigir as horas envia o número no formato brasileiro e os totais lidos', async () => {
    const { envios, aoFechar } = montar(true);
    await substituir('Horas de célula (h)', '3.500,5');

    await salvar();

    await vi.waitFor(() => expect(aoFechar).toHaveBeenCalled());
    expect(envios[1]?.caminho).toBe('/api/aeronaves/1/contadores');
    expect(envios[1]?.corpo).toMatchObject({
      horasDeCelula: 3500.5,
      ciclos: 2890,
      lidos: { horasDeCelula: 3412.5, ciclos: 2890 },
    });
  });

  it('limpar as horas de célula é falta, e não zera o contador', async () => {
    const { envios } = montar(true);
    await substituir('Horas de célula (h)', '');

    await salvar();

    expect(campo('Horas de célula (h)')).toHaveFocus();
    expect(campo('Horas de célula (h)')).toHaveAccessibleDescription(
      expect.stringContaining('Informe as horas de célula.') as string,
    );
    expect(envios).toEqual([]);
  });

  it('se os contadores são recusados, o painel diz que a identificação já foi salva', async () => {
    const { aoFechar } = montar(true, {
      '/api/aeronaves/1/contadores': () =>
        Promise.resolve(
          respostaDe({ title: 'Contadores desatualizados', detail: 'Um voo foi lançado.' }, 409),
        ),
    });
    await substituir('Ciclos (pousos)', '2950');

    await salvar();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'A identificação foi salva, mas os contadores não foram corrigidos. Um voo foi lançado.',
    );
    expect(aoFechar).not.toHaveBeenCalled();
  });

  it('durante o envio, Cancelar fica inerte', async () => {
    const { aoFechar } = montar(false, {
      '/api/aeronaves/1/ficha-tecnica': () => new Promise<Response>(() => {}),
    });

    await salvar();
    const cancelar = screen.getByRole('button', { name: 'Cancelar' });
    await userEvent.click(cancelar);

    expect(cancelar).toHaveAttribute('aria-disabled', 'true');
    expect(aoFechar).not.toHaveBeenCalled();
  });
});
