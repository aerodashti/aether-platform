import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PaginaDeProprietarios } from './PaginaDeProprietarios';

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

const GESTORA = {
  nome: 'Patrícia Duarte',
  email: 'patricia@administraair.com.br',
  papel: 'GESTOR',
};

const PILOTO = {
  nome: 'Caio Martins',
  email: 'caio@administraair.com.br',
  papel: 'PILOTO',
};

const PROPRIETARIOS = [
  {
    id: 3,
    nome: 'Helena Sarraf',
    corDeIdentificacao: 'VERDE',
    situacao: 'ATIVO',
  },
  {
    id: 4,
    nome: 'Otávio Lins',
    cpfCnpj: '15350946056',
    email: 'otavio@exemplo.com.br',
    corDeIdentificacao: 'CINZA',
    situacao: 'INATIVO',
  },
  {
    id: 1,
    nome: 'Ricardo Meirelles',
    cpfCnpj: '52998224725',
    email: 'ricardo@meirelles.com.br',
    telefone: '+55 11 98888-0000',
    corDeIdentificacao: 'PETROLEO',
    situacao: 'ATIVO',
  },
];

const VINCULOS = [
  {
    proprietarioId: 1,
    aeronaveId: 7,
    contratoId: 70,
    matricula: 'PS-AER',
    modelo: 'Phenom 300E',
    percentual: 60,
  },
  {
    proprietarioId: 1,
    aeronaveId: 8,
    contratoId: 80,
    matricula: 'PR-HEL',
    modelo: 'AW109',
    percentual: 33.34,
  },
];

/** O cartão que contém o nome: o `li` mais próximo que é item da grade, não da lista de vínculos. */
function cartaoDe(nome: string) {
  return screen.getByText(nome).closest('ul[aria-label="Proprietários"] > li') as HTMLElement;
}

/** `respostas` troca a resposta de um caminho (pelo começo do endereço) para o teste. */
function prepararFetch(sessao: unknown, respostas: Record<string, Response> = {}) {
  vi.stubGlobal(
    'fetch',
    vi.fn((entrada: string) => {
      const trocada = Object.entries(respostas).find(([caminho]) => entrada.startsWith(caminho));
      if (trocada) {
        return Promise.resolve(trocada[1]);
      }
      if (entrada.startsWith('/api/autenticacao/sessao')) {
        return Promise.resolve(respostaDe(sessao));
      }
      if (entrada.startsWith('/api/participacoes/vigentes')) {
        return Promise.resolve(respostaDe(VINCULOS));
      }
      return Promise.resolve(respostaDe(PROPRIETARIOS));
    }),
  );
}

describe('PaginaDeProprietarios', () => {
  beforeEach(() => {
    // O jsdom não implementa a API de <dialog>; o painel de cadastro depende dela.
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

  it('mostra documento pontuado e contato numa linha, e as aeronaves com o percentual', async () => {
    prepararFetch(GESTORA);
    envolver(<PaginaDeProprietarios />);

    expect(await screen.findByText('Ricardo Meirelles')).toBeInTheDocument();
    const cartao = cartaoDe('Ricardo Meirelles');
    expect(
      within(cartao).getByText('529.982.247-25 · ricardo@meirelles.com.br · +55 11 98888-0000'),
    ).toBeInTheDocument();

    const aeronaves = await within(cartao).findByRole('list', {
      name: 'Aeronaves de Ricardo Meirelles',
    });
    expect(within(aeronaves).getByRole('link', { name: 'PS-AER' })).toHaveAttribute(
      'href',
      '/aeronaves/7',
    );
    expect(within(aeronaves).getByText('60%')).toBeInTheDocument();
    expect(within(aeronaves).getByText('33,34%')).toBeInTheDocument();
  });

  it('sem contrato vigente o cartão diz que falta o vínculo', async () => {
    prepararFetch(GESTORA);
    envolver(<PaginaDeProprietarios />);

    await screen.findByText('Helena Sarraf');
    expect(
      within(cartaoDe('Helena Sarraf')).getByText(/Sem vínculo com aeronave/),
    ).toBeInTheDocument();
  });

  it('sem documento mostra travessão, e só o inativo ganha etiqueta', async () => {
    prepararFetch(GESTORA);
    envolver(<PaginaDeProprietarios />);

    await screen.findByText('Helena Sarraf');
    expect(within(cartaoDe('Helena Sarraf')).getByText('—')).toBeInTheDocument();
    expect(within(cartaoDe('Otávio Lins')).getByText('Inativo')).toBeInTheDocument();
    expect(screen.queryByText('Ativo')).not.toBeInTheDocument();
  });

  it('inativo oferece reativar; ativo oferece desativar', async () => {
    prepararFetch(GESTORA);
    envolver(<PaginaDeProprietarios />);

    await screen.findByText('Otávio Lins');
    expect(
      within(cartaoDe('Otávio Lins')).getByRole('button', { name: 'Reativar' }),
    ).toBeInTheDocument();
    expect(
      within(cartaoDe('Ricardo Meirelles')).getByRole('button', { name: 'Desativar' }),
    ).toBeInTheDocument();
  });

  it('para quem não gere o cadastro, a grade é só leitura', async () => {
    prepararFetch(PILOTO);
    envolver(<PaginaDeProprietarios />);

    await screen.findByText('Ricardo Meirelles');
    expect(screen.queryByRole('button', { name: '+ Novo proprietário' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Desativar' })).not.toBeInTheDocument();
    // Documento e contato não chegam a quem não gere a conta: nem o travessão do "sem contato".
    expect(within(cartaoDe('Helena Sarraf')).queryByText('—')).not.toBeInTheDocument();
  });

  it('o filtro de situação recorta a lista sem nova requisição', async () => {
    prepararFetch(GESTORA);
    envolver(<PaginaDeProprietarios />);

    await screen.findByText('Ricardo Meirelles');
    await userEvent.selectOptions(screen.getByLabelText('Filtrar por situação'), 'INATIVO');

    expect(screen.getByText('Otávio Lins')).toBeInTheDocument();
    expect(screen.queryByText('Ricardo Meirelles')).not.toBeInTheDocument();
  });

  it('a busca encontra por documento, não só por nome', async () => {
    prepararFetch(GESTORA);
    envolver(<PaginaDeProprietarios />);

    await screen.findByText('Ricardo Meirelles');
    await userEvent.type(screen.getByLabelText('Buscar proprietário'), '15350946056');

    expect(await screen.findByText('Otávio Lins')).toBeInTheDocument();
    expect(screen.queryByText('Helena Sarraf')).not.toBeInTheDocument();
  });

  it('a busca acha o documento copiado do cartão e o nome sem acento', async () => {
    prepararFetch(GESTORA);
    envolver(<PaginaDeProprietarios />);

    await screen.findByText('Ricardo Meirelles');
    await userEvent.type(screen.getByLabelText('Buscar proprietário'), '529.982.247-25');
    await vi.waitFor(() => expect(screen.queryByText('Otávio Lins')).not.toBeInTheDocument());
    expect(screen.getByText('Ricardo Meirelles')).toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText('Buscar proprietário'));
    await userEvent.type(screen.getByLabelText('Buscar proprietário'), 'otavio');
    expect(await screen.findByText('Otávio Lins')).toBeInTheDocument();
    await vi.waitFor(() => expect(screen.queryByText('Ricardo Meirelles')).not.toBeInTheDocument());
  });

  it('abre o painel de cadastro com a paleta, e cancelar devolve o foco a quem o abriu', async () => {
    prepararFetch(GESTORA);
    envolver(<PaginaDeProprietarios />);

    await screen.findByText('Ricardo Meirelles');
    const novo = screen.getByRole('button', { name: '+ Novo proprietário' });
    await userEvent.click(novo);

    expect(screen.getByRole('radiogroup', { name: 'Cor de identificação' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Petróleo' })).toBeChecked();
    expect(screen.getByRole('button', { name: 'Cadastrar' })).not.toHaveAttribute('aria-disabled');

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('dialog', { name: 'Novo proprietário' })).not.toBeInTheDocument();
    expect(novo).toHaveFocus();
  });

  it('sem as participações, o cartão não afirma "sem vínculo" e o Desativar espera', async () => {
    prepararFetch(GESTORA, {
      '/api/participacoes/vigentes': respostaDe({ title: 'Erro interno' }, 500),
    });
    envolver(<PaginaDeProprietarios />);

    expect(
      await screen.findByText('Não foi possível carregar as participações.'),
    ).toBeInTheDocument();
    const cartao = cartaoDe('Helena Sarraf');
    expect(within(cartao).queryByText(/Sem vínculo com aeronave/)).not.toBeInTheDocument();
    const desativar = within(cartao).getByRole('button', { name: 'Desativar' });
    expect(desativar).toHaveAttribute('aria-disabled', 'true');
    expect(desativar).toHaveAccessibleDescription('Participações ainda não carregadas.');

    await userEvent.click(desativar);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('reativar que falha diz por quê, no cartão', async () => {
    prepararFetch(GESTORA, {
      '/api/proprietarios/4/reativacao': respostaDe(
        { title: 'Acesso negado', detail: 'Seu perfil não tem permissão para esta ação.' },
        403,
      ),
    });
    envolver(<PaginaDeProprietarios />);

    await screen.findByText('Otávio Lins');
    await userEvent.click(
      within(cartaoDe('Otávio Lins')).getByRole('button', { name: 'Reativar' }),
    );

    expect(await within(cartaoDe('Otávio Lins')).findByRole('alert')).toHaveTextContent(
      'Não foi possível reativar. Seu perfil não tem permissão para esta ação.',
    );
  });

  it('desativar quem está em contrato pede a redistribuição e manda tudo numa saída só', async () => {
    prepararFetch(GESTORA);
    envolver(<PaginaDeProprietarios />);

    await screen.findByText('Ricardo Meirelles');
    await userEvent.click(
      within(cartaoDe('Ricardo Meirelles')).getByRole('button', { name: 'Desativar' }),
    );
    const painel = screen.getByRole('dialog', { name: 'Desativar Ricardo Meirelles' });
    const confirmar = within(painel).getByRole('button', { name: 'Redistribuir e desativar' });

    // Ricardo era o único nas duas: confirmar já diz que falta quem assuma cada uma.
    await userEvent.click(confirmar);
    expect(within(painel).getByRole('alert')).toHaveTextContent(
      'Revise 2 campos: Soma da PS-AER, Soma da PR-HEL.',
    );

    // A participação inteira vai para quem entra no lugar.
    for (const matricula of ['PS-AER', 'PR-HEL']) {
      await userEvent.selectOptions(
        within(painel).getByLabelText(`Incluir proprietário na ${matricula}`),
        '3',
      );
      await userEvent.click(
        within(painel).getByRole('button', { name: `Incluir na ${matricula}` }),
      );
      await userEvent.type(
        within(painel).getByLabelText(`Participação de Helena Sarraf na ${matricula} em %`),
        '100',
      );
    }
    await userEvent.click(confirmar);

    const saida = vi
      .mocked(fetch)
      .mock.calls.find(([entrada]) => String(entrada) === '/api/proprietarios/1/saida');
    expect(JSON.parse(String(saida?.[1]?.body))).toEqual({
      contratos: [
        {
          aeronaveId: 7,
          contratoVigenteId: 70,
          participacoes: [{ proprietarioId: 3, percentual: 100 }],
        },
        {
          aeronaveId: 8,
          contratoVigenteId: 80,
          participacoes: [{ proprietarioId: 3, percentual: 100 }],
        },
      ],
    });
  });
});
