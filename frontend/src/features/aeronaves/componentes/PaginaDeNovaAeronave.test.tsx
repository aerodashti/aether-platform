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

function recusa(status: number, campos: Record<string, string>) {
  return respostaDe({ title: 'Dados inválidos', detail: 'Verifique os campos.', campos }, status);
}

const GESTORA = { nome: 'Patrícia Duarte', email: 'patricia@x.com.br', papel: 'GESTOR' };
const PROPRIETARIOS = [
  { id: 1, nome: 'Ricardo Meirelles', corDeIdentificacao: 'PETROLEO', situacao: 'ATIVO' },
  { id: 2, nome: 'Vetor Participações', corDeIdentificacao: 'AMBAR', situacao: 'ATIVO' },
  { id: 5, nome: 'Marcos Lins', corDeIdentificacao: 'OLIVA', situacao: 'ATIVO' },
];

type Rota = () => Response;

let chamadas: Array<{ url: string; corpo: unknown }>;

/** Cada rota responde o padrão, a menos que o teste troque — por uma lista, uma resposta por vez. */
function montar(trocas: Record<string, Rota | Rota[]> = {}) {
  chamadas = [];
  const rotas: Record<string, Rota | Rota[]> = {
    'GET /api/autenticacao/sessao': () => respostaDe(GESTORA),
    'GET /api/proprietarios': () => respostaDe(PROPRIETARIOS),
    'POST /api/aeronaves': () => respostaDe({ id: 9, matricula: 'PS-AER' }, 201),
    'POST /api/aeronaves/9/contratos': () => respostaDe({ vigente: null, historico: [] }),
    'POST /api/proprietarios': () =>
      respostaDe(
        { id: 3, nome: 'Helena Sabino', corDeIdentificacao: 'OLIVA', situacao: 'ATIVO' },
        201,
      ),
    ...trocas,
  };
  vi.stubGlobal(
    'fetch',
    vi.fn((entrada: string, opcoes?: RequestInit) => {
      const metodo = opcoes?.method ?? 'GET';
      if (metodo !== 'GET') {
        chamadas.push({ url: entrada, corpo: JSON.parse(String(opcoes?.body)) });
      }
      const rota = rotas[`${metodo} ${entrada}`];
      const resposta = Array.isArray(rota) ? rota.shift() : rota;
      return Promise.resolve(resposta ? resposta() : respostaDe({}));
    }),
  );

  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter initialEntries={['/aeronaves/nova']}>
      <QueryClientProvider client={cliente}>
        <Routes>
          <Route path="/aeronaves" element={<p>frota</p>} />
          <Route path="/aeronaves/nova" element={<PaginaDeNovaAeronave />} />
          <Route path="/aeronaves/:id" element={<p>detalhe da aeronave 9</p>} />
        </Routes>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

const cadastrar = () => screen.findByRole('button', { name: 'Cadastrar aeronave' });

async function preencherObrigatorios() {
  await userEvent.type(screen.getByLabelText('Matrícula'), 'ps-aer ');
  await userEvent.type(screen.getByLabelText('Modelo'), 'Phenom 300E');
  await userEvent.type(screen.getByLabelText('Base (ICAO)'), 'sbjd');
  await userEvent.type(screen.getByLabelText('Vencimento do CVA'), '2027-06-01');
  await userEvent.type(screen.getByLabelText('Vigência do seguro (vencimento)'), '2027-08-01');
  await userEvent.type(screen.getByLabelText('Horas de célula (h)'), '3.500');
  await userEvent.type(screen.getByLabelText('Ciclos (pousos)'), '2.890');
  await userEvent.type(screen.getByLabelText('Quilômetros voados (km)'), '510.000');
  await userEvent.type(screen.getByLabelText('Motor 1 (h)'), '3.400');
  await userEvent.type(screen.getByLabelText('Motor 2 (h)'), '0');
  await userEvent.type(screen.getByLabelText('Valor de cada aporte (R$)'), '1.500,00');
  await userEvent.type(screen.getByLabelText('Saldo atual do fundo (R$)'), '-12.500,00');
}

async function vincular(nome: string, percentual?: string) {
  await screen.findByRole('option', { name: nome });
  await userEvent.selectOptions(
    screen.getByLabelText('Adicionar vínculo'),
    screen.getByRole('option', { name: nome }),
  );
  await userEvent.click(screen.getByRole('button', { name: 'Vincular' }));
  if (percentual !== undefined) {
    await userEvent.type(screen.getByLabelText(`Participação de ${nome} (%)`), percentual);
  }
}

function corpoDoCadastro() {
  return chamadas.find((chamada) => chamada.url === '/api/aeronaves')?.corpo as {
    matricula: string;
    fabricante?: string;
    pesoMaxDecolagemKg?: number;
    contadores: Record<string, number | undefined>;
    configuracaoFinanceira: Record<string, unknown>;
  };
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

  it('tentar cadastrar vazio foca o primeiro campo e o resumo lista os que faltam', async () => {
    montar();

    const botao = await cadastrar();
    expect(botao).not.toHaveAttribute('aria-disabled');
    expect(screen.getByText('Os campos marcados com * são obrigatórios.')).toBeInTheDocument();

    await userEvent.click(botao);

    const matricula = screen.getByLabelText('Matrícula');
    expect(matricula).toHaveFocus();
    expect(matricula).toHaveAccessibleDescription(/Informe a matrícula\./);
    expect(screen.getByRole('alert')).toHaveTextContent(
      /^Revise 12 campos: Matrícula, Modelo, Base \(ICAO\),.* Ciclos \(pousos\),.* Saldo atual do fundo \(R\$\)\.$/,
    );
    expect(chamadas).toHaveLength(0);
  });

  it('lê os números no formato brasileiro e envia o cadastro limpo', async () => {
    montar();
    await cadastrar();
    await preencherObrigatorios();
    await userEvent.type(screen.getByLabelText('Peso máx. de decolagem (kg)'), '12.000');

    await userEvent.click(await cadastrar());

    expect(await screen.findByText('detalhe da aeronave 9')).toBeInTheDocument();
    const cadastro = corpoDoCadastro();
    expect(cadastro.matricula).toBe('PS-AER');
    expect(cadastro.fabricante).toBeUndefined();
    expect(cadastro.pesoMaxDecolagemKg).toBe(12000);
    expect(cadastro.contadores).toEqual({
      horasDeCelula: 3500,
      ciclos: 2890,
      kmVoados: 510000,
      horasMotor1: 3400,
      horasMotor2: 0,
    });
    expect(cadastro.configuracaoFinanceira).toMatchObject({
      valorDoAporte: 1500,
      diaDeFechamento: 1,
      saldoDeAbertura: -12500,
    });
  });

  it('o 400 do servidor cai no campo aninhado, leva o foco e some quando o campo muda', async () => {
    montar({
      'POST /api/aeronaves': () =>
        recusa(400, {
          'configuracaoFinanceira.saldoDeAbertura': 'O saldo vai até R$ 999.999.999.999,99.',
        }),
    });
    await cadastrar();
    await preencherObrigatorios();

    await userEvent.click(await cadastrar());

    const saldo = await screen.findByLabelText('Saldo atual do fundo (R$)');
    expect(await screen.findByText('O saldo vai até R$ 999.999.999.999,99.')).toBeInTheDocument();
    expect(saldo).toHaveAttribute('aria-invalid', 'true');
    expect(saldo).toHaveFocus();

    await userEvent.type(saldo, '0');
    expect(saldo).not.toHaveAttribute('aria-invalid');
  });

  it('a matrícula duplicada (409) é erro do campo Matrícula', async () => {
    montar({
      'POST /api/aeronaves': () =>
        recusa(409, { matricula: 'Já existe uma aeronave com esta matrícula na frota.' }),
    });
    await cadastrar();
    await preencherObrigatorios();

    await userEvent.click(await cadastrar());

    expect(await screen.findByLabelText('Matrícula')).toHaveAccessibleDescription(
      /Já existe uma aeronave com esta matrícula na frota\./,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Revise o campo Matrícula.');
  });

  it('a quantidade de motores decide quantos campos de horas existem e são exigidos', async () => {
    montar();
    await cadastrar();

    expect(screen.getByLabelText('Motor 2 (h)')).toBeRequired();
    expect(screen.queryByLabelText('Motor 3 (h)')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('radio', { name: '3 motores' }));
    expect(screen.getByLabelText('Motor 3 (h)')).toBeRequired();

    await userEvent.click(screen.getByRole('radio', { name: '1 motor' }));
    expect(screen.queryByLabelText('Motor 2 (h)')).not.toBeInTheDocument();
  });

  it('no aporte proporcional o valor some da tela', async () => {
    montar();
    await cadastrar();

    await userEvent.selectOptions(screen.getByLabelText('Modelo de aporte'), 'PROPORCIONAL_AO_USO');

    expect(screen.queryByLabelText('Valor de cada aporte (R$)')).not.toBeInTheDocument();
  });

  it('o conversor transforma milhas náuticas em km, preenche o campo e devolve o foco', async () => {
    montar();
    await cadastrar();
    const abrir = screen.getByRole('button', { name: 'Conversor de milhas náuticas' });
    await userEvent.click(abrir);

    const painel = screen.getByRole('dialog', { name: 'Conversor de milhas náuticas' });
    await userEvent.type(within(painel).getByLabelText('Milhas náuticas (NM)'), '-5');
    await userEvent.click(within(painel).getByRole('button', { name: 'Usar valor' }));
    expect(within(painel).getByText('O mínimo é 0.')).toBeInTheDocument();

    await userEvent.clear(within(painel).getByLabelText('Milhas náuticas (NM)'));
    await userEvent.type(within(painel).getByLabelText('Milhas náuticas (NM)'), '1.000');
    expect(within(painel).getByText('Equivale a 1.852 km')).toBeInTheDocument();
    await userEvent.click(within(painel).getByRole('button', { name: 'Usar valor' }));

    expect(screen.getByLabelText('Quilômetros voados (km)')).toHaveValue('1852');
    expect(abrir).toHaveFocus();
  });

  it('cada percentual segue o contrato, e a soma precisa fechar em 100 para cadastrar', async () => {
    montar();
    await cadastrar();
    await preencherObrigatorios();
    await vincular('Ricardo Meirelles', '0');

    await userEvent.click(await cadastrar());
    const percentual = screen.getByLabelText('Participação de Ricardo Meirelles (%)');
    expect(percentual).toHaveFocus();
    expect(percentual).toHaveAccessibleDescription('O mínimo é 0,01.');

    await userEvent.clear(percentual);
    await userEvent.type(percentual, '60');
    expect(screen.getByText('Soma das participações: 60% — faltam 40%')).toBeInTheDocument();
    await userEvent.click(await cadastrar());
    expect(screen.getByText('As participações precisam fechar em 100%.')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Revise o campo Soma das participações.');
    expect(chamadas).toHaveLength(0);
  });

  it('vincular pede a escolha, leva o foco ao percentual, e dividir escreve com vírgula', async () => {
    montar();
    await cadastrar();
    await screen.findByRole('option', { name: 'Ricardo Meirelles' });

    await userEvent.click(screen.getByRole('button', { name: 'Vincular' }));
    expect(screen.getByLabelText('Adicionar vínculo')).toHaveAccessibleDescription(
      'Escolha quem vincular.',
    );

    await vincular('Ricardo Meirelles');
    expect(screen.getByLabelText('Participação de Ricardo Meirelles (%)')).toHaveFocus();
    await vincular('Vetor Participações');
    await vincular('Marcos Lins');
    await userEvent.click(screen.getByRole('button', { name: 'Dividir igualmente' }));

    expect(screen.getByLabelText('Participação de Ricardo Meirelles (%)')).toHaveValue('33,34');
    expect(screen.getByLabelText('Participação de Marcos Lins (%)')).toHaveValue('33,33');
    expect(screen.getByText('Soma das participações: 100% — fechada')).toBeInTheDocument();
  });

  it('sem a lista de proprietários, não afirma que não há nenhum e oferece tentar de novo', async () => {
    montar({ 'GET /api/proprietarios': () => respostaDe({}, 500) });
    await cadastrar();

    expect(
      await screen.findByText('Não foi possível carregar os proprietários.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument();
    expect(screen.queryByText(/Nenhum proprietário/)).not.toBeInTheDocument();
  });

  it('cadastra um proprietário sem sair do fluxo e já o vincula', async () => {
    montar();
    await cadastrar();
    await userEvent.click(screen.getByRole('button', { name: '+ Cadastrar proprietário' }));

    const painel = screen.getByRole('dialog', { name: 'Novo proprietário' });
    await userEvent.type(within(painel).getByLabelText('Nome / Nome fantasia'), 'Helena Sabino');
    await userEvent.click(within(painel).getByRole('button', { name: 'Cadastrar' }));

    expect(await screen.findByLabelText('Participação de Helena Sabino (%)')).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Novo proprietário' })).not.toBeInTheDocument();
    const [cadastro] = chamadas;
    expect(cadastro?.url).toBe('/api/proprietarios');
  });

  it('cadastra, define o contrato na rota dele e navega para o detalhe', async () => {
    montar();
    await cadastrar();
    await preencherObrigatorios();
    await vincular('Ricardo Meirelles', '66,67');
    await vincular('Vetor Participações', '33,33');

    await userEvent.click(await cadastrar());

    expect(await screen.findByText('detalhe da aeronave 9')).toBeInTheDocument();
    expect(chamadas.map((chamada) => chamada.url)).toEqual([
      '/api/aeronaves',
      '/api/aeronaves/9/contratos',
    ]);
    expect(chamadas[1]?.corpo).toEqual({
      participacoes: [
        { proprietarioId: 1, percentual: 66.67 },
        { proprietarioId: 2, percentual: 33.33 },
      ],
    });
  });

  it('se o contrato for recusado, a aeronave não é recadastrada: salva só as participações', async () => {
    montar({
      'POST /api/aeronaves/9/contratos': [
        () => recusa(400, { 'participacoes[0].percentual': 'Proprietário inativo.' }),
        () => respostaDe({ vigente: null, historico: [] }),
      ],
    });
    await cadastrar();
    await preencherObrigatorios();
    await vincular('Ricardo Meirelles', '100');

    await userEvent.click(await cadastrar());

    const percentual = await screen.findByLabelText('Participação de Ricardo Meirelles (%)');
    expect(await screen.findByText(/A aeronave PS-AER já está cadastrada/)).toBeInTheDocument();
    expect(percentual).toHaveAccessibleDescription('Proprietário inativo.');
    expect(screen.getByLabelText('Matrícula')).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'Salvar participações' }));

    expect(await screen.findByText('detalhe da aeronave 9')).toBeInTheDocument();
    expect(chamadas.filter((chamada) => chamada.url === '/api/aeronaves')).toHaveLength(1);
  });

  it('cancelar com algo preenchido pede confirmação antes de descartar', async () => {
    montar();
    await cadastrar();
    await userEvent.type(screen.getByLabelText('Modelo'), 'PC-24');

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    const painel = screen.getByRole('dialog', { name: 'Descartar o cadastro?' });
    await userEvent.click(within(painel).getByRole('button', { name: 'Continuar cadastrando' }));
    expect(screen.getByLabelText('Modelo')).toHaveValue('PC-24');

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    await userEvent.click(screen.getByRole('button', { name: 'Descartar' }));
    expect(await screen.findByText('frota')).toBeInTheDocument();
  });

  it('quem não cadastra aeronave fica sabendo antes de preencher', async () => {
    montar({ 'GET /api/autenticacao/sessao': () => respostaDe({ ...GESTORA, papel: 'PILOTO' }) });

    expect(await screen.findByText(/Seu perfil não cadastra aeronaves/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cadastrar aeronave' })).not.toBeInTheDocument();
  });
});
