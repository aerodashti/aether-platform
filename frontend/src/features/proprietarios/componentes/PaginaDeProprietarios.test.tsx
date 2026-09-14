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
  { proprietarioId: 1, aeronaveId: 7, matricula: 'PS-AER', modelo: 'Phenom 300E', percentual: 60 },
  { proprietarioId: 1, aeronaveId: 8, matricula: 'PR-HEL', modelo: 'AW109', percentual: 33.34 },
];

/** O cartão que contém o nome: o `li` mais próximo que é item da grade, não da lista de vínculos. */
function cartaoDe(nome: string) {
  return screen.getByText(nome).closest('ul[aria-label="Proprietários"] > li') as HTMLElement;
}

function prepararFetch(sessao: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn((entrada: string) => {
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

  it('abre o painel de cadastro com a paleta de cores', async () => {
    prepararFetch(GESTORA);
    envolver(<PaginaDeProprietarios />);

    await screen.findByText('Ricardo Meirelles');
    await userEvent.click(screen.getByRole('button', { name: '+ Novo proprietário' }));

    expect(screen.getByRole('radiogroup', { name: 'Cor de identificação' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Petróleo' })).toBeChecked();
    expect(screen.getByRole('button', { name: 'Cadastrar' })).toBeDisabled();
  });
});
