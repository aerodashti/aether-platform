import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
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

function aceito() {
  return {
    ok: true,
    status: 202,
    statusText: 'Accepted',
    headers: new Headers({ 'X-Request-Id': 'abc-123', 'Content-Length': '0' }),
    json: () => Promise.reject(new Error('sem corpo')),
  } as unknown as Response;
}

const SESSAO = {
  nome: 'Leonardo Andrade',
  email: 'leonardo@administraair.com.br',
  papel: 'ADMINISTRADOR',
};

const CAMILA = {
  id: 3,
  nome: 'Camila Nogueira',
  email: 'camila@administraair.com.br',
  papel: 'PROPRIETARIO',
  situacao: 'PENDENTE',
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
    CAMILA,
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

type Rota = (corpo: Record<string, unknown>) => Response | Promise<Response>;

/** O servidor de mentira: as rotas de escrita que um teste não troca respondem bem. */
function servidor(rotasDoTeste: Record<string, Rota> = {}) {
  const rotas: Record<string, Rota> = {
    'GET /api/autenticacao/sessao': () => respostaDe(SESSAO),
    'POST /api/usuarios': (corpo) => respostaDe({ id: 9, ...corpo, situacao: 'PENDENTE' }, 201),
    'POST /api/usuarios/3/convite': () => aceito(),
    'POST /api/usuarios/3/desativacao': () => respostaDe({ ...CAMILA, situacao: 'INATIVO' }),
    'POST /api/usuarios/4/reativacao': () => respostaDe({ ...PAGINA.itens[2], situacao: 'ATIVO' }),
    ...rotasDoTeste,
  };
  vi.stubGlobal(
    'fetch',
    vi.fn((entrada: string, opcoes?: RequestInit) => {
      const corpo = opcoes?.body
        ? (JSON.parse(String(opcoes.body)) as Record<string, unknown>)
        : {};
      const rota = rotas[`${opcoes?.method ?? 'GET'} ${entrada}`];
      return Promise.resolve(rota ? rota(corpo) : respostaDe(PAGINA));
    }),
  );
}

function nuncaResponde(): Promise<Response> {
  return new Promise(() => undefined);
}

/** Devolve a linha da tabela que contém aquele nome. */
function linhaDe(nome: string) {
  return screen.getByText(nome).closest('tr') as HTMLElement;
}

async function abrirConvite(usuario: ReturnType<typeof userEvent.setup>) {
  await screen.findByText('Camila Nogueira');
  await usuario.click(screen.getByRole('button', { name: '+ Convidar usuário' }));
  return screen.getByRole('dialog', { name: 'Convidar usuário' });
}

describe('PaginaDeUsuarios', () => {
  beforeEach(() => {
    // O jsdom não implementa a API de <dialog>; os painéis dependem dela.
    HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
      this.open = true;
    });
    HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
      this.open = false;
    });
    servidor();
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
    expect(within(propria).queryByRole('button', { name: /Desativar/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reativar Diego Furtado' })).toBeInTheDocument();
  });

  it('os botões de cada linha dizem de quem são', async () => {
    envolver(<PaginaDeUsuarios />);

    await screen.findByText('Camila Nogueira');
    expect(
      screen.getByRole('button', { name: 'Reenviar convite para Camila Nogueira' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Desativar Camila Nogueira' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Reenviar convite para Diego Furtado' }),
    ).not.toBeInTheDocument();
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

    expect(await screen.findByText('Não foi possível carregar os usuários.')).toBeInTheDocument();
    expect(screen.queryByText('Camila Nogueira')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument();
  });

  it('lista vazia explica a causa e aponta o caminho de volta', async () => {
    servidor({
      'GET /api/usuarios?page=0&size=20': () =>
        respostaDe({ itens: [], pagina: 0, tamanho: 20, total: 0, totalDePaginas: 0 }),
    });
    envolver(<PaginaDeUsuarios />);

    expect(await screen.findByText('Nenhum usuário encontrado')).toBeInTheDocument();
    expect(screen.getByText(/Ajuste a busca/)).toBeInTheDocument();
  });

  describe('ações na linha', () => {
    it('desativar pede confirmação nomeando a pessoa e diz o que acontece', async () => {
      const usuario = userEvent.setup();
      envolver(<PaginaDeUsuarios />);

      await usuario.click(await screen.findByRole('button', { name: 'Desativar Camila Nogueira' }));

      const painel = screen.getByRole('dialog', { name: 'Desativar Camila Nogueira' });
      expect(
        within(painel).getByText(/O convite enviado deixa de valer agora/),
      ).toBeInTheDocument();
      expect(vi.mocked(fetch)).not.toHaveBeenCalledWith(
        '/api/usuarios/3/desativacao',
        expect.anything(),
      );

      await usuario.click(within(painel).getByRole('button', { name: 'Desativar acesso' }));

      expect(fetch).toHaveBeenCalledWith(
        '/api/usuarios/3/desativacao',
        expect.objectContaining({ method: 'POST' }),
      );
      expect(
        await screen.findByText(
          'Acesso de Camila Nogueira desativado. Dá para reativar quando quiser.',
        ),
      ).toBeInTheDocument();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('cancelar a desativação não chama o servidor', async () => {
      const usuario = userEvent.setup();
      envolver(<PaginaDeUsuarios />);

      await usuario.click(await screen.findByRole('button', { name: 'Desativar Camila Nogueira' }));
      await usuario.click(screen.getByRole('button', { name: 'Cancelar' }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(vi.mocked(fetch)).not.toHaveBeenCalledWith(
        '/api/usuarios/3/desativacao',
        expect.anything(),
      );
    });

    it('a recusa da desativação aparece no painel, que continua aberto', async () => {
      const usuario = userEvent.setup();
      servidor({
        'POST /api/usuarios/3/desativacao': () =>
          respostaDe({ title: 'Erro interno', detail: 'Tente novamente em instantes.' }, 500),
      });
      envolver(<PaginaDeUsuarios />);

      await usuario.click(await screen.findByRole('button', { name: 'Desativar Camila Nogueira' }));
      await usuario.click(screen.getByRole('button', { name: 'Desativar acesso' }));

      const painel = screen.getByRole('dialog', { name: 'Desativar Camila Nogueira' });
      expect(
        await within(painel).findByText(
          'Não foi possível desativar. Tente novamente em instantes.',
        ),
      ).toBeInTheDocument();
    });

    it('reenviar confirma para quem foi o convite e quanto ele vale', async () => {
      const usuario = userEvent.setup();
      envolver(<PaginaDeUsuarios />);

      await usuario.click(
        await screen.findByRole('button', { name: 'Reenviar convite para Camila Nogueira' }),
      );

      expect(
        await screen.findByText(
          'Convite reenviado para camila@administraair.com.br. O link anterior deixou de valer; o novo vale 48 horas.',
        ),
      ).toBeInTheDocument();
    });

    it('a recusa do reenvio aparece, em vez de sumir em silêncio', async () => {
      const usuario = userEvent.setup();
      servidor({
        'POST /api/usuarios/3/convite': () =>
          respostaDe(
            {
              title: 'Convite inválido',
              detail: 'Este convite expirou ou já foi usado. Peça um novo ao administrador.',
            },
            400,
          ),
      });
      envolver(<PaginaDeUsuarios />);

      await usuario.click(
        await screen.findByRole('button', { name: 'Reenviar convite para Camila Nogueira' }),
      );

      expect(
        await screen.findByText(/Não foi possível reenviar o convite para Camila Nogueira\./),
      ).toBeInTheDocument();
    });

    it('só a linha clicada fica em andamento', async () => {
      const usuario = userEvent.setup();
      servidor({ 'POST /api/usuarios/3/convite': () => nuncaResponde() });
      envolver(<PaginaDeUsuarios />);

      await usuario.click(
        await screen.findByRole('button', { name: 'Reenviar convite para Camila Nogueira' }),
      );

      expect(
        screen.getByRole('button', { name: 'Reenviar convite para Camila Nogueira' }),
      ).toHaveAttribute('aria-busy', 'true');
      expect(screen.getByRole('button', { name: 'Desativar Camila Nogueira' })).not.toHaveAttribute(
        'aria-busy',
      );
      expect(screen.getByRole('button', { name: 'Reativar Diego Furtado' })).not.toHaveAttribute(
        'aria-busy',
      );
    });

    it('reativar quem nunca concluiu o convite diz o próximo passo', async () => {
      const usuario = userEvent.setup();
      servidor({
        'POST /api/usuarios/4/reativacao': () =>
          respostaDe({ ...PAGINA.itens[2], situacao: 'PENDENTE' }),
      });
      envolver(<PaginaDeUsuarios />);

      await usuario.click(await screen.findByRole('button', { name: 'Reativar Diego Furtado' }));

      expect(await screen.findByText(/use Reenviar para mandar outro\./)).toBeInTheDocument();
    });
  });

  describe('convite', () => {
    it('não tem campo de senha — quem a cria é a própria pessoa', async () => {
      const usuario = userEvent.setup();
      envolver(<PaginaDeUsuarios />);

      await abrirConvite(usuario);

      expect(screen.getByLabelText('Nome')).toBeInTheDocument();
      expect(screen.getByLabelText('E-mail')).toBeInTheDocument();
      expect(screen.getByLabelText('Papel')).toBeInTheDocument();
      expect(screen.queryByLabelText(/senha/i)).not.toBeInTheDocument();
    });

    it('envia nome e e-mail sem os espaços das pontas, e o papel escolhido', async () => {
      const usuario = userEvent.setup();
      envolver(<PaginaDeUsuarios />);

      await abrirConvite(usuario);
      await usuario.type(screen.getByLabelText('Nome'), ' Rafael Prado ');
      await usuario.type(screen.getByLabelText('E-mail'), 'rafael@administraair.com.br ');
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

    it('o convite enviado fecha o painel e é anunciado com o e-mail e a validade', async () => {
      const usuario = userEvent.setup();
      envolver(<PaginaDeUsuarios />);

      await abrirConvite(usuario);
      await usuario.type(screen.getByLabelText('Nome'), 'Rafael Prado');
      await usuario.type(screen.getByLabelText('E-mail'), 'rafael@administraair.com.br{Enter}');

      expect(
        await screen.findByText(
          'Convite enviado para rafael@administraair.com.br. O link vale 48 horas.',
        ),
      ).toBeInTheDocument();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('enviar vazio foca o nome e o resumo lista o que falta', async () => {
      const usuario = userEvent.setup();
      envolver(<PaginaDeUsuarios />);

      await abrirConvite(usuario);
      await usuario.click(screen.getByRole('button', { name: 'Enviar convite' }));

      expect(screen.getByLabelText('Nome')).toHaveFocus();
      expect(screen.getByText('Revise 2 campos: Nome, E-mail.')).toBeInTheDocument();
      expect(vi.mocked(fetch)).not.toHaveBeenCalledWith('/api/usuarios', expect.anything());
    });

    it('e-mail sem domínio completo é apontado no campo', async () => {
      const usuario = userEvent.setup();
      envolver(<PaginaDeUsuarios />);

      await abrirConvite(usuario);
      await usuario.type(screen.getByLabelText('Nome'), 'Fulano');
      await usuario.type(screen.getByLabelText('E-mail'), 'fulano@exemplo');
      await usuario.click(screen.getByRole('button', { name: 'Enviar convite' }));

      expect(screen.getByLabelText('E-mail')).toHaveAccessibleDescription(
        'Informe um e-mail completo, como nome@empresa.com.br.',
      );
    });

    it('e-mail já cadastrado cai no campo e some quando a pessoa o corrige', async () => {
      const usuario = userEvent.setup();
      const mensagem = 'Já existe um usuário com este e-mail.';
      servidor({
        'POST /api/usuarios': () =>
          respostaDe(
            { title: 'E-mail já cadastrado', detail: mensagem, campos: { email: mensagem } },
            409,
          ),
      });
      envolver(<PaginaDeUsuarios />);

      await abrirConvite(usuario);
      await usuario.type(screen.getByLabelText('Nome'), 'Camila');
      await usuario.type(screen.getByLabelText('E-mail'), 'camila@administraair.com.br');
      await usuario.click(screen.getByRole('button', { name: 'Enviar convite' }));

      const email = screen.getByLabelText('E-mail');
      await waitFor(() => expect(email).toHaveAttribute('aria-invalid', 'true'));
      expect(email).toHaveFocus();

      await usuario.type(email, 'x');

      expect(email).not.toHaveAttribute('aria-invalid');
    });

    it('recusa sem campo aparece junto dos botões, e não marca o e-mail', async () => {
      const usuario = userEvent.setup();
      servidor({
        'POST /api/usuarios': () =>
          respostaDe(
            { title: 'Acesso restrito', detail: 'Esta área é exclusiva de administradores.' },
            403,
          ),
      });
      envolver(<PaginaDeUsuarios />);

      const painel = await abrirConvite(usuario);
      await usuario.type(screen.getByLabelText('Nome'), 'Rafael Prado');
      await usuario.type(screen.getByLabelText('E-mail'), 'rafael@administraair.com.br');
      await usuario.click(screen.getByRole('button', { name: 'Enviar convite' }));

      expect(
        await within(painel).findByText('Esta área é exclusiva de administradores.'),
      ).toBeInTheDocument();
      expect(screen.getByLabelText('E-mail')).not.toHaveAttribute('aria-invalid');
    });

    it('cancelar fica inerte enquanto o convite é enviado', async () => {
      const usuario = userEvent.setup();
      servidor({ 'POST /api/usuarios': () => nuncaResponde() });
      envolver(<PaginaDeUsuarios />);

      await abrirConvite(usuario);
      await usuario.type(screen.getByLabelText('Nome'), 'Rafael Prado');
      await usuario.type(screen.getByLabelText('E-mail'), 'rafael@administraair.com.br');
      await usuario.click(screen.getByRole('button', { name: 'Enviar convite' }));

      const cancelar = screen.getByRole('button', { name: 'Cancelar' });
      expect(cancelar).toHaveAttribute('aria-disabled', 'true');
      await usuario.click(cancelar);
      expect(screen.getByRole('dialog', { name: 'Convidar usuário' })).toBeInTheDocument();
    });

    it('o papel escolhido diz o que concede', async () => {
      const usuario = userEvent.setup();
      envolver(<PaginaDeUsuarios />);

      await abrirConvite(usuario);
      await usuario.selectOptions(screen.getByLabelText('Papel'), 'ADMINISTRADOR');

      expect(screen.getByLabelText('Papel')).toHaveAccessibleDescription(
        'Administra usuários e os dados da empresa: convida, desativa e reativa acessos.',
      );
    });
  });
});
