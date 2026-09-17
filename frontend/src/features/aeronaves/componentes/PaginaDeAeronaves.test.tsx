import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PaginaDeAeronaves } from './PaginaDeAeronaves';

// A grade agora navega (a matrícula é Link), então o teste precisa de um Router por volta.
function envolver(conteudo: ReactNode) {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={cliente}>{conteudo}</QueryClientProvider>
    </MemoryRouter>,
  );
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

const VINCULOS = [
  { proprietarioId: 1, aeronaveId: 1, matricula: 'PS-MEP', percentual: 50 },
  { proprietarioId: 2, aeronaveId: 1, matricula: 'PS-MEP', percentual: 30 },
  { proprietarioId: 3, aeronaveId: 1, matricula: 'PS-MEP', percentual: 20 },
];

/** O fetch da tela: a frota em `/aeronaves` e os vínculos vigentes em `/participacoes`. */
function prepararFetch(frota: unknown, status = 200) {
  vi.stubGlobal(
    'fetch',
    vi.fn((entrada: string) =>
      Promise.resolve(
        entrada.startsWith('/api/participacoes') ? respostaDe(VINCULOS) : respostaDe(frota, status),
      ),
    ),
  );
}

function cartaoDe(matricula: string) {
  return screen.getByText(matricula).closest('li') as HTMLElement;
}

describe('PaginaDeAeronaves', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('mostra matrícula, modelo e situação de cada aeronave', async () => {
    prepararFetch(FROTA);
    envolver(<PaginaDeAeronaves />);

    expect(await screen.findByText('PS-MEP')).toBeInTheDocument();
    expect(within(cartaoDe('PS-MEP')).getByText('Saudável')).toBeInTheDocument();
    expect(within(cartaoDe('PT-XLB')).getByText('Atenção')).toBeInTheDocument();
    expect(within(cartaoDe('PP-JHF')).getByText('Vencido')).toBeInTheDocument();
  });

  it('conta os proprietários do contrato vigente e abre o detalhe pela seta', async () => {
    prepararFetch(FROTA);
    envolver(<PaginaDeAeronaves />);

    await screen.findByText('PS-MEP');
    const cartao = cartaoDe('PS-MEP');
    expect(await within(cartao).findByText('Proprietários')).toBeInTheDocument();
    expect(within(cartao).getByText('3')).toBeInTheDocument();
    // Sem contrato o número é 0 de verdade, não uma coluna em branco.
    expect(within(cartaoDe('PT-XLB')).getByText('0')).toBeInTheDocument();
    expect(within(cartao).getByRole('link', { name: 'Abrir PS-MEP' })).toHaveAttribute(
      'href',
      '/aeronaves/1',
    );
  });

  it('nenhuma situação aparece sozinha: diz qual documento e quando', async () => {
    prepararFetch(FROTA);
    envolver(<PaginaDeAeronaves />);

    await screen.findByText('PT-XLB');
    expect(within(cartaoDe('PT-XLB')).getByText(/RETA · em 12 dias/)).toBeInTheDocument();
    expect(within(cartaoDe('PP-JHF')).getByText(/CVA · há 3 dias/)).toBeInTheDocument();
    // Saudável mostra o documento e a data, sem o prazo: número sem pergunta é ruído.
    expect(within(cartaoDe('PS-MEP')).getByText('CVA')).toBeInTheDocument();
    expect(within(cartaoDe('PS-MEP')).queryByText(/dias/)).not.toBeInTheDocument();
  });

  it('o resumo conta a frota e denuncia quem não pode voar', async () => {
    prepararFetch(FROTA);
    envolver(<PaginaDeAeronaves />);

    expect(await screen.findByText('3 aeronaves')).toBeInTheDocument();
    expect(screen.getByText('1 impedida de voar')).toBeInTheDocument();
  });

  it('sem aeronave impedida, o resumo não inventa um zero', async () => {
    prepararFetch([FROTA[0]]);
    envolver(<PaginaDeAeronaves />);

    expect(await screen.findByText('1 aeronave')).toBeInTheDocument();
    expect(screen.queryByText(/impedida/)).not.toBeInTheDocument();
  });

  it('frota vazia explica o que fazer a seguir', async () => {
    prepararFetch([]);
    envolver(<PaginaDeAeronaves />);

    expect(await screen.findByText('Nenhuma aeronave cadastrada')).toBeInTheDocument();
    expect(screen.getByText(/Cadastre a primeira aeronave/)).toBeInTheDocument();
  });

  it('erro de carga suprime a grade e oferece tentar de novo', async () => {
    prepararFetch({ detail: 'Falhou' }, 500);
    envolver(<PaginaDeAeronaves />);

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText('PS-MEP')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument();
  });
});
