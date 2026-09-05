import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PaginaDeLogin } from './PaginaDeLogin';

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

/** O 204 dos passos de recuperação não tem corpo: ler como JSON quebraria. */
function semConteudo() {
  return {
    ok: true,
    status: 204,
    statusText: 'No Content',
    headers: new Headers({ 'X-Request-Id': 'abc-123' }),
    json: () => Promise.reject(new Error('sem corpo')),
  } as unknown as Response;
}

describe('PaginaDeLogin', () => {
  beforeEach(() => {
    // O globo mede o container e busca o GeoJSON; nenhum dos dois existe no jsdom.
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    vi.stubGlobal('requestAnimationFrame', () => 0);
    vi.stubGlobal('cancelAnimationFrame', () => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('abre no passo de entrada, com e-mail e senha', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(semConteudo())),
    );
    envolver(<PaginaDeLogin />);

    expect(screen.getByRole('heading', { name: 'Bem-vindo de volta' })).toBeInTheDocument();
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument();
    expect(screen.getByLabelText('Senha')).toBeInTheDocument();
  });

  it('não chama a API quando o e-mail não tem forma de e-mail', async () => {
    const chamada = vi.fn(() => Promise.resolve(semConteudo()));
    vi.stubGlobal('fetch', chamada);
    envolver(<PaginaDeLogin />);

    await userEvent.type(screen.getByLabelText('E-mail'), 'nao-e-email');
    await userEvent.type(screen.getByLabelText('Senha'), 'segredo123');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('Informe um e-mail válido.')).toBeInTheDocument();
    expect(chamada).not.toHaveBeenCalled();
  });

  it('cobra a senha antes de chamar a API', async () => {
    const chamada = vi.fn(() => Promise.resolve(semConteudo()));
    vi.stubGlobal('fetch', chamada);
    envolver(<PaginaDeLogin />);

    await userEvent.type(screen.getByLabelText('E-mail'), 'leonardo@administraair.com.br');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('Informe a senha.')).toBeInTheDocument();
    expect(chamada).not.toHaveBeenCalled();
  });

  it('mostra o motivo devolvido pela API quando a entrada é recusada', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          respostaDe(
            { title: 'Não foi possível entrar', detail: 'E-mail ou senha incorretos.' },
            401,
          ),
        ),
      ),
    );
    envolver(<PaginaDeLogin />);

    await userEvent.type(screen.getByLabelText('E-mail'), 'leonardo@administraair.com.br');
    await userEvent.type(screen.getByLabelText('Senha'), 'errada');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('status')).toHaveTextContent('E-mail ou senha incorretos.');
  });

  it('percorre os quatro passos até voltar à entrada com a senha redefinida', async () => {
    const chamada = vi.fn(() => Promise.resolve(semConteudo()));
    vi.stubGlobal('fetch', chamada);
    envolver(<PaginaDeLogin />);

    // O e-mail já digitado atravessa para a recuperação: ninguém deve redigitá-lo.
    await userEvent.type(screen.getByLabelText('E-mail'), 'leonardo@administraair.com.br');
    await userEvent.click(screen.getByRole('button', { name: 'Esqueci minha senha' }));

    expect(screen.getByRole('heading', { name: 'Recuperar acesso' })).toBeInTheDocument();
    expect(screen.getByLabelText('E-mail')).toHaveValue('leonardo@administraair.com.br');

    await userEvent.click(screen.getByRole('button', { name: 'Enviar código' }));

    expect(await screen.findByRole('heading', { name: 'Confirme o código' })).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Código de verificação'), '519274');
    await userEvent.click(screen.getByRole('button', { name: 'Validar código' }));

    expect(await screen.findByRole('heading', { name: 'Nova senha' })).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Nova senha'), 'senha-nova-longa');
    await userEvent.type(screen.getByLabelText('Confirmar nova senha'), 'senha-nova-longa');
    await userEvent.click(screen.getByRole('button', { name: 'Redefinir senha' }));

    expect(await screen.findByRole('heading', { name: 'Bem-vindo de volta' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Senha redefinida. Entre com a nova senha.',
    );
    expect(screen.getByLabelText('E-mail')).toHaveValue('leonardo@administraair.com.br');
  });

  it('recusa senha nova curta e confirmação diferente sem chamar a API', async () => {
    const chamada = vi.fn(() => Promise.resolve(semConteudo()));
    vi.stubGlobal('fetch', chamada);
    envolver(<PaginaDeLogin />);

    await userEvent.type(screen.getByLabelText('E-mail'), 'leonardo@administraair.com.br');
    await userEvent.click(screen.getByRole('button', { name: 'Esqueci minha senha' }));
    await userEvent.click(screen.getByRole('button', { name: 'Enviar código' }));
    await userEvent.type(await screen.findByLabelText('Código de verificação'), '519274');
    await userEvent.click(screen.getByRole('button', { name: 'Validar código' }));
    await screen.findByRole('heading', { name: 'Nova senha' });

    const chamadasAteAqui = chamada.mock.calls.length;

    await userEvent.type(screen.getByLabelText('Nova senha'), 'curta');
    await userEvent.click(screen.getByRole('button', { name: 'Redefinir senha' }));
    expect(
      await screen.findByText('A nova senha precisa de ao menos 8 caracteres.'),
    ).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Nova senha'), '-o-bastante');
    await userEvent.type(screen.getByLabelText('Confirmar nova senha'), 'outra-coisa-longa');
    await userEvent.click(screen.getByRole('button', { name: 'Redefinir senha' }));
    expect(
      await screen.findByText('A confirmação não confere com a nova senha.'),
    ).toBeInTheDocument();

    expect(chamada.mock.calls).toHaveLength(chamadasAteAqui);
  });

  it('descarta o que não é dígito no campo do código', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(semConteudo())),
    );
    envolver(<PaginaDeLogin />);

    await userEvent.type(screen.getByLabelText('E-mail'), 'leonardo@administraair.com.br');
    await userEvent.click(screen.getByRole('button', { name: 'Esqueci minha senha' }));
    await userEvent.click(screen.getByRole('button', { name: 'Enviar código' }));

    const campo = await screen.findByLabelText('Código de verificação');
    await userEvent.type(campo, '519-274');

    expect(campo).toHaveValue('519274');
  });

  it('volta ao início a partir de qualquer passo da recuperação', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(semConteudo())),
    );
    envolver(<PaginaDeLogin />);

    await userEvent.click(screen.getByRole('button', { name: 'Esqueci minha senha' }));
    await userEvent.click(screen.getByRole('button', { name: 'Voltar ao login' }));

    expect(screen.getByRole('heading', { name: 'Bem-vindo de volta' })).toBeInTheDocument();
  });
});
