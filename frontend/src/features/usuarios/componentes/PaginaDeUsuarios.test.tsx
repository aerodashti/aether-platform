import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PaginaDeUsuarios } from './PaginaDeUsuarios';

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

const SESSAO = {
  nome: 'Leonardo Andrade',
  email: 'leonardo@administraair.com.br',
  papel: 'ADMINISTRADOR',
};

const PAGINA = {
  itens: [
    {
      id: 1,
      nome: 'Leonardo Andrade',
      email: 'leonardo@administraair.com.br',
      papel: 'ADMINISTRADOR',
      situacao: 'ATIVO',
      ultimoAcesso: '2026-09-09T12:00:00Z',
    },
    {
      id: 3,
      nome: 'Camila Nogueira',
      email: 'camila@administraair.com.br',
      papel: 'PROPRIETARIO',
      situacao: 'PENDENTE',
    },
    {
      id: 4,
      nome: 'Diego Furtado',
      email: 'diego.furtado@administraair.com.br',
      papel: 'PILOTO',
      situacao: 'INATIVO',
      ultimoAcesso: '2026-05-02T09:30:00Z',
    },
  ],
  pagina: 0,
  tamanho: 20,
  total: 3,
  totalDePaginas: 1,
};

/** Devolve a linha da tabela que contém aquele nome. */
function linhaDe(nome: string) {
  return screen.getByText(nome).closest('tr') as HTMLElement;
}

describe('PaginaDeUsuarios', () => {
  beforeEach(() => {
    // O jsdom não implementa a API de <dialog>; o painel de convite depende dela.
    HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
      this.open = true;
    });
    HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
      this.open = false;
    });

    vi.stubGlobal(
      'fetch',
      vi.fn((entrada: string) => {
        if (entrada.startsWith('/api/autenticacao/sessao')) {
          return Promise.resolve(respostaDe(SESSAO));
        }
        return Promise.resolve(respostaDe(PAGINA));
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('mostra papel, situação e último acesso de cada usuário', async () => {
    envolver(<PaginaDeUsuarios />);

    expect(await screen.findByText('Camila Nogueira')).toBeInTheDocument();
    expect(within(linhaDe('Camila Nogueira')).getByText('Proprietário')).toBeInTheDocument();
    expect(within(linhaDe('Camila Nogueira')).getByText('Convite pendente')).toBeInTheDocument();
    expect(within(linhaDe('Diego Furtado')).getByText('02/05/26')).toBeInTheDocument();
  });

  it('não rotula quem está ativo — só a exceção precisa de etiqueta', async () => {
    envolver(<PaginaDeUsuarios />);

    await screen.findByText('Leonardo Andrade');
    expect(screen.queryByText('Ativo')).not.toBeInTheDocument();
  });

  it('quem nunca entrou mostra travessão, não uma data inventada', async () => {
    envolver(<PaginaDeUsuarios />);

    await screen.findByText('Camila Nogueira');
    expect(within(linhaDe('Camila Nogueira')).getByText('—')).toBeInTheDocument();
  });

  it('não oferece desativar a si mesmo, e marca a própria linha', async () => {
    envolver(<PaginaDeUsuarios />);

    await screen.findByText('Leonardo Andrade');
    const propria = linhaDe('Leonardo Andrade');

    expect(within(propria).getByText('você')).toBeInTheDocument();
    expect(within(propria).queryByRole('button', { name: 'Desativar' })).not.toBeInTheDocument();
    expect(
      within(linhaDe('Diego Furtado')).getByRole('button', { name: 'Reativar' }),
    ).toBeInTheDocument();
  });

  it('só oferece reenviar convite para quem ainda não concluiu', async () => {
    envolver(<PaginaDeUsuarios />);

    await screen.findByText('Camila Nogueira');
    expect(
      within(linhaDe('Camila Nogueira')).getByRole('button', { name: 'Reenviar' }),
    ).toBeInTheDocument();
    expect(
      within(linhaDe('Diego Furtado')).queryByRole('button', { name: 'Reenviar' }),
    ).not.toBeInTheDocument();
  });

  it('desativar chama o endpoint e recarrega a lista', async () => {
    const usuario = userEvent.setup();
    envolver(<PaginaDeUsuarios />);

    await screen.findByText('Camila Nogueira');
    await usuario.click(
      within(linhaDe('Camila Nogueira')).getByRole('button', { name: 'Desativar' }),
    );

    expect(fetch).toHaveBeenCalledWith(
      '/api/usuarios/3/desativacao',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('o filtro de papel entra na consulta; o vazio não vira parâmetro', async () => {
    const usuario = userEvent.setup();
    envolver(<PaginaDeUsuarios />);

    await screen.findByText('Camila Nogueira');
    await usuario.selectOptions(screen.getByLabelText('Filtrar por papel'), 'PILOTO');

    const chamadas = vi.mocked(fetch).mock.calls.map(([url]) => String(url));
    expect(chamadas.some((url) => url.includes('papel=PILOTO'))).toBe(true);
    expect(chamadas.some((url) => url.includes('busca='))).toBe(false);
  });

  it('o convite não tem campo de senha — quem a cria é a própria pessoa', async () => {
    const usuario = userEvent.setup();
    envolver(<PaginaDeUsuarios />);

    await screen.findByText('Camila Nogueira');
    await usuario.click(screen.getByRole('button', { name: 'Convidar usuário' }));

    expect(screen.getByLabelText('Nome')).toBeInTheDocument();
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument();
    expect(screen.getByLabelText('Papel')).toBeInTheDocument();
    expect(screen.queryByLabelText(/senha/i)).not.toBeInTheDocument();
  });

  it('envia o convite com nome, e-mail e papel', async () => {
    const usuario = userEvent.setup();
    envolver(<PaginaDeUsuarios />);

    await screen.findByText('Camila Nogueira');
    await usuario.click(screen.getByRole('button', { name: 'Convidar usuário' }));
    await usuario.type(screen.getByLabelText('Nome'), 'Rafael Prado');
    await usuario.type(screen.getByLabelText('E-mail'), 'rafael@administraair.com.br');
    await usuario.selectOptions(screen.getByLabelText('Papel'), 'PILOTO');
    await usuario.click(screen.getByRole('button', { name: 'Enviar convite' }));

    expect(fetch).toHaveBeenCalledWith(
      '/api/usuarios',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          nome: 'Rafael Prado',
          email: 'rafael@administraair.com.br',
          papel: 'PILOTO',
        }),
      }),
    );
  });

  it('erro de carga suprime a grade e oferece tentar de novo', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((entrada: string) => {
        if (entrada.startsWith('/api/autenticacao/sessao')) {
          return Promise.resolve(respostaDe(SESSAO));
        }
        return Promise.resolve(respostaDe({ detail: 'Falhou' }, 500));
      }),
    );
    envolver(<PaginaDeUsuarios />);

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText('Camila Nogueira')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument();
  });

  it('lista vazia explica a causa e aponta o caminho de volta', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((entrada: string) => {
        if (entrada.startsWith('/api/autenticacao/sessao')) {
          return Promise.resolve(respostaDe(SESSAO));
        }
        return Promise.resolve(
          respostaDe({ itens: [], pagina: 0, tamanho: 20, total: 0, totalDePaginas: 0 }),
        );
      }),
    );
    envolver(<PaginaDeUsuarios />);

    expect(await screen.findByText('Nenhum usuário encontrado')).toBeInTheDocument();
    expect(screen.getByText(/Ajuste a busca/)).toBeInTheDocument();
  });
});
