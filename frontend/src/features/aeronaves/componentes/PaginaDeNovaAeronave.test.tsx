import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PaginaDeNovaAeronave } from './PaginaDeNovaAeronave';

function respostaDe(corpo: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: 'OK',
    headers: new Headers({ 'X-Request-Id': 'abc-123' }),
    json: () => Promise.resolve(corpo),
  } as unknown as Response;
}

const GESTORA = { nome: 'Patrícia Duarte', email: 'patricia@x.com.br', papel: 'GESTOR' };
const PROPRIETARIOS = [
  { id: 1, nome: 'Ricardo Meirelles', corDeIdentificacao: 'PETROLEO', situacao: 'ATIVO' },
  { id: 2, nome: 'Vetor Participações', corDeIdentificacao: 'AMBAR', situacao: 'ATIVO' },
];

let chamadas: Array<{ url: string; corpo: unknown }>;

function montar() {
  chamadas = [];
  vi.stubGlobal(
    'fetch',
    vi.fn((entrada: string, opcoes?: RequestInit) => {
      if (opcoes?.method === 'POST' && entrada === '/api/aeronaves') {
        chamadas.push({ url: entrada, corpo: JSON.parse(String(opcoes.body)) });
        return Promise.resolve(respostaDe({ id: 9, matricula: 'PS-AER' }, 201));
      }
      if (opcoes?.method === 'POST' && entrada === '/api/proprietarios') {
        chamadas.push({ url: entrada, corpo: JSON.parse(String(opcoes.body)) });
        return Promise.resolve(
          respostaDe(
            { id: 3, nome: 'Helena Sabino', corDeIdentificacao: 'OLIVA', situacao: 'ATIVO' },
            201,
          ),
        );
      }
      if (opcoes?.method === 'POST' && entrada.includes('/contratos')) {
        chamadas.push({ url: entrada, corpo: JSON.parse(String(opcoes.body)) });
        return Promise.resolve(respostaDe({ vigente: null, historico: [] }));
      }
      if (entrada.startsWith('/api/autenticacao/sessao')) {
        return Promise.resolve(respostaDe(GESTORA));
      }
      if (entrada.startsWith('/api/proprietarios')) {
        return Promise.resolve(respostaDe(PROPRIETARIOS));
      }
      return Promise.resolve(respostaDe({}));
    }),
  );

  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter initialEntries={['/aeronaves/nova']}>
      <QueryClientProvider client={cliente}>
        <Routes>
          <Route path="/aeronaves/nova" element={<PaginaDeNovaAeronave />} />
          <Route path="/aeronaves/:id" element={<p>detalhe da aeronave 9</p>} />
        </Routes>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

async function preencherObrigatorios() {
  await userEvent.type(screen.getByLabelText('Matrícula'), 'ps-aer');
  await userEvent.type(screen.getByLabelText('Modelo'), 'Phenom 300E');
  await userEvent.type(screen.getByLabelText('Base (ICAO)'), 'SBJD');
  await userEvent.type(screen.getByLabelText('Vencimento do CVA'), '2027-06-01');
  await userEvent.type(screen.getByLabelText('Vigência do seguro (vencimento)'), '2027-08-01');
  await userEvent.type(screen.getByLabelText('Horas de voo (célula)'), '1200');
  await userEvent.type(screen.getByLabelText('Kilômetros voados'), '510000');
}

describe('PaginaDeNovaAeronave', () => {
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

  it('não cadastra sem os obrigatórios; com eles, o botão libera', async () => {
    montar();

    const botao = await screen.findByRole('button', { name: 'Cadastrar aeronave' });
    expect(botao).toBeDisabled();

    await preencherObrigatorios();
    expect(botao).toBeEnabled();
  });

  it('a quantidade de motores decide quantos campos de horas existem', async () => {
    montar();

    await screen.findByRole('button', { name: 'Cadastrar aeronave' });
    expect(screen.getByLabelText('Motor 1 (h)')).toBeInTheDocument();
    expect(screen.getByLabelText('Motor 2 (h)')).toBeInTheDocument();
    expect(screen.queryByLabelText('Motor 3 (h)')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('radio', { name: '3 motores' }));
    expect(screen.getByLabelText('Motor 3 (h)')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('radio', { name: '1 motor' }));
    expect(screen.queryByLabelText('Motor 2 (h)')).not.toBeInTheDocument();
  });

  it('o conversor transforma milhas náuticas em km e preenche o campo', async () => {
    montar();

    await screen.findByRole('button', { name: 'Cadastrar aeronave' });
    await userEvent.click(screen.getByRole('button', { name: 'Conversor de milhas náuticas' }));
    await userEvent.type(screen.getByLabelText('Milhas náuticas (NM)'), '1000');

    expect(screen.getByText('Equivale a 1.852 km')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Usar valor' }));

    expect(screen.getByLabelText('Kilômetros voados')).toHaveValue('1852');
  });

  it('com vínculos, a soma precisa fechar em 100 para liberar o cadastro', async () => {
    montar();

    await screen.findByRole('button', { name: 'Cadastrar aeronave' });
    await preencherObrigatorios();

    await userEvent.selectOptions(screen.getByLabelText('Adicionar vínculo'), '1');
    await userEvent.type(screen.getByLabelText('Participação de Ricardo Meirelles em %'), '60');

    const botao = screen.getByRole('button', { name: 'Cadastrar aeronave' });
    expect(botao).toBeDisabled();

    await userEvent.selectOptions(screen.getByLabelText('Adicionar vínculo'), '2');
    await userEvent.type(screen.getByLabelText('Participação de Vetor Participações em %'), '40');
    expect(botao).toBeEnabled();
  });

  it('cadastra um proprietário sem sair do fluxo e já o vincula', async () => {
    montar();

    await screen.findByRole('button', { name: 'Cadastrar aeronave' });
    await userEvent.click(screen.getByRole('button', { name: '+ Cadastrar proprietário' }));

    const painel = screen.getByRole('dialog', { name: 'Novo proprietário' });
    await userEvent.type(within(painel).getByLabelText('Nome / Nome fantasia'), 'Helena Sabino');
    await userEvent.click(within(painel).getByRole('button', { name: 'Cadastrar' }));

    expect(await screen.findByLabelText('Participação de Helena Sabino em %')).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Novo proprietário' })).not.toBeInTheDocument();
    const [cadastro] = chamadas;
    expect(cadastro?.url).toBe('/api/proprietarios');
    expect((cadastro?.corpo as { nome: string }).nome).toBe('Helena Sabino');
  });

  it('cadastra, define o contrato na rota dele e navega para o detalhe', async () => {
    montar();

    await screen.findByRole('button', { name: 'Cadastrar aeronave' });
    await preencherObrigatorios();
    await userEvent.selectOptions(screen.getByLabelText('Adicionar vínculo'), '1');
    await userEvent.type(screen.getByLabelText('Participação de Ricardo Meirelles em %'), '100');

    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar aeronave' }));

    expect(await screen.findByText('detalhe da aeronave 9')).toBeInTheDocument();
    const [criacao, contrato] = chamadas;
    expect(criacao?.url).toBe('/api/aeronaves');
    const cadastro = criacao?.corpo as { matricula: string; contadores: { kmVoados: number } };
    expect(cadastro.matricula).toBe('ps-aer');
    expect(cadastro.contadores.kmVoados).toBe(510000);
    expect(contrato?.url).toBe('/api/aeronaves/9/contratos');
    expect(contrato?.corpo).toEqual({
      participacoes: [{ proprietarioId: 1, percentual: 100 }],
    });
  });
});
