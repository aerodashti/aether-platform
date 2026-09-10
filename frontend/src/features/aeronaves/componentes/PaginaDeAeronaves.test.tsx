import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PaginaDeAeronaves } from './PaginaDeAeronaves';

function envolver(conteudo: ReactNode) {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={cliente}>{conteudo}</QueryClientProvider>);
}

function respostaDe(corpo: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Erro',
    headers: new Headers({ 'X-Request-Id': 'abc-123' }),
    json: () => Promise.resolve(corpo),
  } as unknown as Response;
}

const FROTA = [
  {
    id: 1,
    matricula: 'PS-MEP',
    modelo: 'Cessna Citation XLS+',
    base: 'SBSP',
    situacaoRegular: 'REGULAR',
    documentoDoProximoVencimento: 'CVA',
    proximoVencimento: '2027-05-09',
    diasAteOProximoVencimento: 242,
    podeVoar: true,
  },
  {
    id: 2,
    matricula: 'PT-XLB',
    modelo: 'Leonardo AW109 GrandNew',
    base: 'SBBH',
    situacaoRegular: 'ATENCAO',
    documentoDoProximoVencimento: 'RETA',
    proximoVencimento: '2026-09-21',
    diasAteOProximoVencimento: 12,
    podeVoar: true,
  },
  {
    id: 3,
    matricula: 'PP-JHF',
    modelo: 'Pilatus PC-12 NGX',
    base: 'SBPS',
    situacaoRegular: 'VENCIDO',
    documentoDoProximoVencimento: 'CVA',
    proximoVencimento: '2026-09-06',
    diasAteOProximoVencimento: -3,
    podeVoar: false,
  },
];

function linhaDe(matricula: string) {
  return screen.getByText(matricula).closest('tr') as HTMLElement;
}

describe('PaginaDeAeronaves', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('mostra matrícula, modelo e situação de cada aeronave', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(respostaDe(FROTA))),
    );
    envolver(<PaginaDeAeronaves />);

    expect(await screen.findByText('PS-MEP')).toBeInTheDocument();
    expect(within(linhaDe('PS-MEP')).getByText('Saudável')).toBeInTheDocument();
    expect(within(linhaDe('PT-XLB')).getByText('Atenção')).toBeInTheDocument();
    expect(within(linhaDe('PP-JHF')).getByText('Vencido')).toBeInTheDocument();
  });

  it('nenhuma situação aparece sozinha: diz qual documento e quando', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(respostaDe(FROTA))),
    );
    envolver(<PaginaDeAeronaves />);

    await screen.findByText('PT-XLB');
    expect(within(linhaDe('PT-XLB')).getByText(/RETA · em 12 dias/)).toBeInTheDocument();
    expect(within(linhaDe('PP-JHF')).getByText(/CVA · há 3 dias/)).toBeInTheDocument();
    // Saudável mostra o documento e a data, sem o prazo: número sem pergunta é ruído.
    expect(within(linhaDe('PS-MEP')).getByText('CVA')).toBeInTheDocument();
    expect(within(linhaDe('PS-MEP')).queryByText(/dias/)).not.toBeInTheDocument();
  });

  it('o resumo conta a frota e denuncia quem não pode voar', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(respostaDe(FROTA))),
    );
    envolver(<PaginaDeAeronaves />);

    expect(await screen.findByText('3 aeronaves')).toBeInTheDocument();
    expect(screen.getByText('1 impedida de voar')).toBeInTheDocument();
  });

  it('sem aeronave impedida, o resumo não inventa um zero', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(respostaDe([FROTA[0]]))),
    );
    envolver(<PaginaDeAeronaves />);

    expect(await screen.findByText('1 aeronave')).toBeInTheDocument();
    expect(screen.queryByText(/impedida/)).not.toBeInTheDocument();
  });

  it('frota vazia explica o que fazer a seguir', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(respostaDe([]))),
    );
    envolver(<PaginaDeAeronaves />);

    expect(await screen.findByText('Nenhuma aeronave cadastrada')).toBeInTheDocument();
    expect(screen.getByText(/Cadastre a primeira aeronave/)).toBeInTheDocument();
  });

  it('erro de carga suprime a grade e oferece tentar de novo', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(respostaDe({ detail: 'Falhou' }, 500))),
    );
    envolver(<PaginaDeAeronaves />);

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText('PS-MEP')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument();
  });
});
