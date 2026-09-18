import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PaginaDeDetalheDaAeronave } from './PaginaDeDetalheDaAeronave';

function respostaDe(corpo: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Erro',
    headers: new Headers({ 'X-Request-Id': 'abc-123' }),
    json: () => Promise.resolve(corpo),
  } as unknown as Response;
}

const GESTORA = { nome: 'Patrícia Duarte', email: 'patricia@x.com.br', papel: 'GESTOR' };
const PILOTO = { nome: 'Caio Martins', email: 'caio@x.com.br', papel: 'PILOTO' };

const DETALHE = {
  id: 1,
  matricula: 'PS-MEP',
  fabricante: 'Cessna',
  modelo: 'Citation XLS+',
  numeroDeSerie: '560-6321',
  base: 'SBSP',
  hangar: 'Hangar 7 — Congonhas',
  apoliceDoSeguro: 'RETA-88412-7',
  situacaoRegular: 'ATENCAO',
  documentoDoProximoVencimento: 'RETA',
  proximoVencimento: '2026-09-22',
  diasAteOProximoVencimento: 12,
  podeVoar: true,
  vencimentoCva: '2027-02-10',
  vencimentoReta: '2026-09-22',
  contadores: {
    horasDeCelula: 3412.5,
    ciclos: 2890,
    kmVoados: 1482300,
    horasMotor1: 3390.2,
    horasMotor2: 3388.7,
  },
  configuracaoFinanceira: {
    baseDoRateio: 'POR_USO',
    modeloDeAporte: 'FIXO',
    periodicidadeDoAporteMeses: 1,
    valorDoAporte: 85000,
    diaDeFechamento: 5,
  },
};

const CONTRATOS = {
  vigente: {
    id: 10,
    inicioDaVigencia: '2026-07-10T12:00:00Z',
    fimDaVigencia: null,
    criadoPor: 'Leonardo Andrade',
    participacoes: [
      {
        proprietarioId: 1,
        nome: 'Ricardo Meirelles',
        corDeIdentificacao: 'PETROLEO',
        percentual: 60,
      },
      {
        proprietarioId: 2,
        nome: 'Vetor Participações',
        corDeIdentificacao: 'AMBAR',
        percentual: 40,
      },
    ],
  },
  historico: [
    {
      id: 9,
      inicioDaVigencia: '2025-01-10T12:00:00Z',
      fimDaVigencia: '2026-07-10T12:00:00Z',
      criadoPor: 'Leonardo Andrade',
      participacoes: [
        {
          proprietarioId: 1,
          nome: 'Ricardo Meirelles',
          corDeIdentificacao: 'PETROLEO',
          percentual: 100,
        },
      ],
    },
  ],
};

const TRIPULANTES = [
  {
    id: 7,
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
];

const PROPRIETARIOS = [
  { id: 1, nome: 'Ricardo Meirelles', corDeIdentificacao: 'PETROLEO', situacao: 'ATIVO' },
  { id: 2, nome: 'Vetor Participações', corDeIdentificacao: 'AMBAR', situacao: 'ATIVO' },
  { id: 3, nome: 'Helena Sarraf', corDeIdentificacao: 'VERDE', situacao: 'ATIVO' },
];

/** As respostas que um caso pode trocar: sem histórico, sem tripulação. */
interface Respostas {
  contratos?: unknown;
  tripulantes?: unknown;
}

function montar(sessao: unknown, respostas: Respostas = {}) {
  vi.stubGlobal(
    'fetch',
    vi.fn((entrada: string) => {
      if (entrada.startsWith('/api/autenticacao/sessao')) {
        return Promise.resolve(respostaDe(sessao));
      }
      if (entrada.startsWith('/api/aeronaves/1/contratos')) {
        return Promise.resolve(respostaDe(respostas.contratos ?? CONTRATOS));
      }
      if (entrada.startsWith('/api/aeronaves/1/tripulantes')) {
        return Promise.resolve(respostaDe(respostas.tripulantes ?? TRIPULANTES));
      }
      if (entrada.startsWith('/api/proprietarios')) {
        return Promise.resolve(respostaDe(PROPRIETARIOS));
      }
      return Promise.resolve(respostaDe(DETALHE));
    }),
  );

  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter initialEntries={['/aeronaves/1']}>
      <QueryClientProvider client={cliente}>
        <Routes>
          <Route path="/aeronaves/:id" element={<PaginaDeDetalheDaAeronave />} />
        </Routes>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('PaginaDeDetalheDaAeronave', () => {
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

  it('o cabeçalho diz o que está acontecendo: situação, documento e prazo', async () => {
    montar(GESTORA);

    expect((await screen.findAllByText('PS-MEP')).length).toBeGreaterThan(0);
    expect(screen.getByText('Atenção')).toBeInTheDocument();
    expect(screen.getByText('RETA vence em 12 dias')).toBeInTheDocument();
    expect(
      screen.getByText('Cessna Citation XLS+ · SBSP · Hangar 7 — Congonhas'),
    ).toBeInTheDocument();
  });

  it('o cabeçalho não inventa saldo nem documentos: coluna vazia não existe', async () => {
    montar(GESTORA);

    await screen.findAllByText('PS-MEP');
    expect(screen.queryByText('Saldo do fundo')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Documentos/ })).not.toBeInTheDocument();
  });

  it('mostra o contrato vigente numa tabela e o histórico num cartão próprio', async () => {
    montar(GESTORA);

    const contrato = await screen.findByRole('region', { name: 'Contrato de participações' });
    expect(await within(contrato).findByText('Ricardo Meirelles')).toBeInTheDocument();
    expect(
      within(contrato).getByRole('columnheader', { name: '% de propriedade' }),
    ).toBeInTheDocument();
    expect(within(contrato).getByText('60%')).toBeInTheDocument();
    expect(
      within(contrato).getByText(/Contrato vigente · jul\. de 2026 – atual/),
    ).toBeInTheDocument();

    const historico = screen.getByRole('region', {
      name: 'Histórico de contratos de participação',
    });
    expect(within(historico).getByText('100%')).toBeInTheDocument();
    expect(within(historico).getByText(/criado por Leonardo Andrade/)).toBeInTheDocument();
  });

  it('sem histórico, o cartão de histórico não aparece', async () => {
    montar(GESTORA, { contratos: { ...CONTRATOS, historico: [] } });

    await screen.findByRole('region', { name: 'Contrato de participações' });
    expect(
      screen.queryByRole('region', { name: 'Histórico de contratos de participação' }),
    ).not.toBeInTheDocument();
  });

  it('a soma manda no salvar: 90% desabilita, 100% sem mudança mantém, 100% com mudança habilita', async () => {
    montar(GESTORA);

    await userEvent.click(await screen.findByRole('button', { name: 'Alterar participações' }));
    const ricardo = screen.getByLabelText('Participação de Ricardo Meirelles em %');
    const vetor = screen.getByLabelText('Participação de Vetor Participações em %');
    const salvar = () => screen.getByRole('button', { name: 'Salvar novo contrato' });

    // Sem mexer, 60/40 é o contrato vigente: salvar não arquivaria nada.
    expect(salvar()).toBeDisabled();
    expect(
      screen.getByText(/Nenhuma alteração nas participações — contrato mantido\./),
    ).toBeInTheDocument();

    await userEvent.clear(ricardo);
    await userEvent.type(ricardo, '50');
    expect(salvar()).toBeDisabled();
    expect(screen.getByText(/Ajuste os percentuais para somar 100%\./)).toBeInTheDocument();

    await userEvent.clear(ricardo);
    await userEvent.type(ricardo, '70');
    await userEvent.clear(vetor);
    await userEvent.type(vetor, '30');
    expect(salvar()).toBeEnabled();
    expect(
      screen.getByText(/Fechado em 100% — salvar cria um novo contrato vigente\./),
    ).toBeInTheDocument();
  });

  it('a edição oferece os proprietários que ainda não estão no contrato', async () => {
    montar(GESTORA);

    await userEvent.click(await screen.findByRole('button', { name: 'Alterar participações' }));
    const selecao = screen.getByLabelText('Adicionar proprietário ao contrato');
    expect(within(selecao).getByRole('option', { name: 'Helena Sarraf' })).toBeInTheDocument();
    expect(
      within(selecao).queryByRole('option', { name: 'Ricardo Meirelles' }),
    ).not.toBeInTheDocument();

    await userEvent.selectOptions(selecao, '3');
    expect(screen.getByLabelText('Participação de Helena Sarraf em %')).toBeInTheDocument();
    expect(
      screen.getByText('Todos os proprietários cadastrados já estão neste contrato.'),
    ).toBeInTheDocument();
  });

  it('o CHT vencido sai com a palavra, não só com a cor', async () => {
    montar(GESTORA);

    const tripulacao = await screen.findByRole('region', { name: 'Tripulação' });
    expect(await within(tripulacao).findByText(/vencida/)).toBeInTheDocument();
    expect(within(tripulacao).getByText(/CANAC 445566/)).toBeInTheDocument();
    expect(
      within(tripulacao).getByText('1 tripulante · validades de CMA e habilitação (CHT)'),
    ).toBeInTheDocument();
  });

  it('tripulação vazia diz que não há tripulante vinculado', async () => {
    montar(GESTORA, { tripulantes: [] });

    const tripulacao = await screen.findByRole('region', { name: 'Tripulação' });
    expect(
      await within(tripulacao).findByText('Nenhum tripulante vinculado a esta aeronave.'),
    ).toBeInTheDocument();
    expect(
      within(tripulacao).getByText('Nenhum tripulante · validades de CMA e habilitação (CHT)'),
    ).toBeInTheDocument();
  });

  it('para quem não gere, a tela é só leitura', async () => {
    montar(PILOTO);

    await screen.findAllByText('PS-MEP');
    expect(screen.queryByRole('button', { name: 'Alterar participações' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Adicionar tripulante' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
  });

  it('a ficha técnica mostra os contadores formatados, com travessão para o APU ausente', async () => {
    montar(GESTORA);

    const ficha = await screen.findByRole('region', { name: 'Ficha técnica' });
    expect(within(ficha).getByText('3.412,5 h')).toBeInTheDocument();
    expect(within(ficha).getByText('1.482.300')).toBeInTheDocument();
    const apu = within(ficha).getByText('Horas APU').closest('div') as HTMLElement;
    expect(within(apu).getByText('—')).toBeInTheDocument();
  });
});
