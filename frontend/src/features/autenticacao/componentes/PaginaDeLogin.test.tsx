import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PaginaDeLogin } from './PaginaDeLogin';

type Usuario = ReturnType<typeof userEvent.setup>;

/** Mostra o endereço atual, para conferir que o token do convite saiu da URL. */
function Endereco() {
  const { pathname, search } = useLocation();
  return (
    <p>
      endereço: {pathname}
      {search}
    </p>
  );
}

/** A tela de entrada e destinos para o pós-login, com o `state.de` que `RotaAutenticada` grava. */
function envolver({ de, busca = '' }: { de?: string; busca?: string } = {}) {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter
      initialEntries={[{ pathname: '/entrar', search: busca, state: de ? { de } : null }]}
    >
      <QueryClientProvider client={cliente}>
        <Routes>
          <Route
            path="/entrar"
            element={
              <>
                <PaginaDeLogin />
                <Endereco />
              </>
            }
          />
          <Route path="/" element={<p>tela inicial</p>} />
          <Route path="/aeronaves/nova" element={<p>nova aeronave</p>} />
        </Routes>
      </QueryClientProvider>
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

/** O 202 e o 204 dos passos de recuperação não têm corpo: ler como JSON quebraria. */
function semConteudo() {
  return {
    ok: true,
    status: 204,
    statusText: 'No Content',
    headers: new Headers({ 'X-Request-Id': 'abc-123' }),
    json: () => Promise.reject(new Error('sem corpo')),
  } as unknown as Response;
}

type Resposta = Response | (() => Promise<Response>);

/** Um servidor de mentira: responde por caminho, e sem conteúdo ao que não foi combinado. */
function servidor(respostas: Record<string, Resposta> = {}) {
  const chamada = vi.fn<(endereco: string, opcoes?: RequestInit) => Promise<Response>>(
    (endereco) => {
      const resposta = respostas[endereco.replace(/^\/api/, '')];
      if (typeof resposta === 'function') {
        return resposta();
      }
      return Promise.resolve(resposta ?? semConteudo());
    },
  );
  vi.stubGlobal('fetch', chamada);
  return chamada;
}

function chamadasA(chamada: ReturnType<typeof servidor>, caminho: string) {
  return chamada.mock.calls.filter(([endereco]) => endereco === `/api${caminho}`);
}

function corpoEnviadoA(chamada: ReturnType<typeof servidor>, caminho: string): unknown {
  const [, opcoes] = chamadasA(chamada, caminho).at(-1) ?? [];
  return JSON.parse(String(opcoes?.body));
}

async function chegarAoCodigo(usuario: Usuario) {
  await usuario.type(screen.getByLabelText('E-mail'), 'leonardo@administraair.com.br');
  await usuario.click(screen.getByRole('button', { name: 'Esqueci minha senha' }));
  await usuario.click(screen.getByRole('button', { name: 'Enviar código' }));
  return screen.findByLabelText('Código de verificação');
}

async function chegarANovaSenha(usuario: Usuario) {
  await usuario.type(await chegarAoCodigo(usuario), '519274');
  await usuario.click(screen.getByRole('button', { name: 'Validar código' }));
  await screen.findByRole('heading', { name: 'Nova senha' });
}

async function preencherSenhaNova(usuario: Usuario, senha: string, confirmacao = senha) {
  await usuario.type(screen.getByLabelText('Nova senha'), senha);
  await usuario.type(screen.getByLabelText('Confirmar nova senha'), confirmacao);
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
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('entrada', () => {
    it('abre no passo de entrada, com e-mail e senha obrigatórios', () => {
      servidor();
      envolver();

      expect(screen.getByRole('heading', { name: 'Bem-vindo de volta' })).toBeInTheDocument();
      expect(screen.getByLabelText('E-mail')).toBeRequired();
      expect(screen.getByLabelText('Senha')).toBeRequired();
    });

    it('tentar entrar vazio foca o primeiro campo e o resumo lista os campos', async () => {
      const chamada = servidor();
      envolver();

      await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));

      expect(screen.getByLabelText('E-mail')).toHaveFocus();
      expect(screen.getByLabelText('E-mail')).toHaveAccessibleDescription('Informe o e-mail.');
      expect(screen.getByLabelText('Senha')).toHaveAccessibleDescription('Informe a senha.');
      expect(screen.getByRole('alert')).toHaveTextContent('Revise 2 campos: E-mail, Senha.');
      expect(chamada).not.toHaveBeenCalled();
    });

    it('não chama a API com um e-mail que o servidor recusaria', async () => {
      const chamada = servidor();
      envolver();

      await userEvent.type(screen.getByLabelText('E-mail'), 'a,b@exemplo.test');
      await userEvent.type(screen.getByLabelText('Senha'), 'segredo123');
      await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));

      expect(screen.getByLabelText('E-mail')).toHaveAccessibleDescription(
        'Informe um e-mail válido, como nome@empresa.com.br.',
      );
      expect(chamada).not.toHaveBeenCalled();
    });

    it('senha só com espaços é cobrada antes de chamar a API', async () => {
      const chamada = servidor();
      envolver();

      await userEvent.type(screen.getByLabelText('E-mail'), 'leonardo@administraair.com.br');
      await userEvent.type(screen.getByLabelText('Senha'), '        ');
      await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));

      expect(screen.getByLabelText('Senha')).toHaveAccessibleDescription('Informe a senha.');
      expect(chamada).not.toHaveBeenCalled();
    });

    it('a recusa das credenciais cai na senha, com o foco nela', async () => {
      servidor({
        '/autenticacao/entrar': respostaDe(
          { title: 'Não foi possível entrar', detail: 'E-mail ou senha incorretos.' },
          401,
        ),
      });
      envolver();

      await userEvent.type(screen.getByLabelText('E-mail'), 'leonardo@administraair.com.br');
      await userEvent.type(screen.getByLabelText('Senha'), 'errada');
      await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));

      const senha = screen.getByLabelText('Senha');
      expect(await screen.findByRole('alert')).toHaveTextContent('Revise o campo Senha.');
      expect(senha).toHaveAccessibleDescription('E-mail ou senha incorretos.');
      expect(senha).toHaveFocus();
      // O aviso de andamento não serve de canal para recusa.
      expect(screen.getByRole('status')).toBeEmptyDOMElement();
    });

    it('o campo recusado pelo servidor recebe a mensagem dele', async () => {
      servidor({
        '/autenticacao/entrar': respostaDe(
          { title: 'Dados inválidos', campos: { email: 'Este e-mail não pode entrar assim.' } },
          400,
        ),
      });
      envolver();

      await userEvent.type(screen.getByLabelText('E-mail'), 'nome@exemplo.com');
      await userEvent.type(screen.getByLabelText('Senha'), 'segredo123');
      await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));

      expect(await screen.findByText('Este e-mail não pode entrar assim.')).toBeInTheDocument();
      expect(screen.getByLabelText('E-mail')).toHaveAttribute('aria-invalid', 'true');
      expect(screen.getByLabelText('E-mail')).toHaveFocus();
    });

    it('o bloqueio por tentativas aparece junto do botão, com o tempo que falta', async () => {
      servidor({
        '/autenticacao/entrar': respostaDe(
          {
            title: 'Acesso temporariamente bloqueado',
            detail: 'Tentativas demais em sequência. Tente de novo em 15 minutos.',
          },
          429,
        ),
      });
      envolver();

      await userEvent.type(screen.getByLabelText('E-mail'), 'leonardo@administraair.com.br');
      await userEvent.type(screen.getByLabelText('Senha'), 'qualquer');
      await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));

      expect(await screen.findByRole('alert')).toHaveTextContent('Tente de novo em 15 minutos.');
    });

    it('depois de entrar, volta para a rota que barrou a pessoa', async () => {
      servidor({
        '/autenticacao/entrar': respostaDe({ nome: 'Leonardo', papel: 'ADMINISTRADOR' }),
      });
      envolver({ de: '/aeronaves/nova' });

      await userEvent.type(screen.getByLabelText('E-mail'), 'leonardo@administraair.com.br');
      await userEvent.type(screen.getByLabelText('Senha'), 'aether-dev-2026');
      await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));

      expect(await screen.findByText('nova aeronave')).toBeInTheDocument();
    });

    it('sem rota de origem, entrar leva à raiz', async () => {
      servidor({
        '/autenticacao/entrar': respostaDe({ nome: 'Leonardo', papel: 'ADMINISTRADOR' }),
      });
      envolver();

      await userEvent.type(screen.getByLabelText('E-mail'), 'leonardo@administraair.com.br');
      await userEvent.type(screen.getByLabelText('Senha'), 'aether-dev-2026');
      await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));

      expect(await screen.findByText('tela inicial')).toBeInTheDocument();
    });
  });

  describe('recuperação', () => {
    it('percorre os passos até voltar à entrada com a senha redefinida', async () => {
      const chamada = servidor();
      const usuario = userEvent.setup();
      envolver();

      // O e-mail já digitado atravessa para a recuperação: ninguém deve redigitá-lo.
      await usuario.type(screen.getByLabelText('E-mail'), 'leonardo@administraair.com.br');
      await usuario.click(screen.getByRole('button', { name: 'Esqueci minha senha' }));
      expect(screen.getByRole('heading', { name: 'Recuperar acesso' })).toBeInTheDocument();
      expect(screen.getByLabelText('E-mail')).toHaveValue('leonardo@administraair.com.br');
      await usuario.click(screen.getByRole('button', { name: 'Enviar código' }));

      await usuario.type(await screen.findByLabelText('Código de verificação'), '519274');
      await usuario.click(screen.getByRole('button', { name: 'Validar código' }));

      expect(await screen.findByRole('heading', { name: 'Nova senha' })).toBeInTheDocument();
      // A conta da senha nova fica à vista, e o gerenciador de senhas sabe a quem ela pertence.
      const conta = screen.getByLabelText('E-mail');
      expect(conta).toHaveValue('leonardo@administraair.com.br');
      expect(conta).toHaveAttribute('readonly');
      expect(conta).toHaveAttribute('autocomplete', 'username');
      expect(screen.getByLabelText('Nova senha')).toHaveFocus();

      await preencherSenhaNova(usuario, 'senha-nova-longa');
      await usuario.click(screen.getByRole('button', { name: 'Redefinir senha' }));

      expect(
        await screen.findByRole('heading', { name: 'Bem-vindo de volta' }),
      ).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent(
        'Senha redefinida. Entre com a nova senha.',
      );
      expect(screen.getByLabelText('E-mail')).toHaveValue('leonardo@administraair.com.br');
      expect(screen.getByLabelText('Senha')).toHaveFocus();
      expect(corpoEnviadoA(chamada, '/autenticacao/recuperacao/senha')).toEqual({
        email: 'leonardo@administraair.com.br',
        codigo: '519274',
        novaSenha: 'senha-nova-longa',
      });
    });

    it('acusa senha curta e confirmação diferente juntas, sem chamar a API', async () => {
      const chamada = servidor();
      const usuario = userEvent.setup();
      envolver();
      await chegarANovaSenha(usuario);
      const chamadasAteAqui = chamada.mock.calls.length;

      await preencherSenhaNova(usuario, 'curta', 'outra');
      await usuario.click(screen.getByRole('button', { name: 'Redefinir senha' }));

      expect(screen.getByLabelText('Nova senha')).toHaveAccessibleDescription(
        'A senha precisa de ao menos 8 caracteres. Entre 8 e 72 caracteres.',
      );
      expect(screen.getByLabelText('Confirmar nova senha')).toHaveAccessibleDescription(
        'A confirmação não confere com a nova senha.',
      );
      expect(screen.getByLabelText('Nova senha')).toHaveFocus();
      expect(chamada.mock.calls).toHaveLength(chamadasAteAqui);
    });

    it('a senha igual à atual volta no campo da nova senha', async () => {
      servidor({
        '/autenticacao/recuperacao/senha': respostaDe(
          {
            title: 'Senha repetida',
            campos: { novaSenha: 'A nova senha precisa ser diferente da atual.' },
          },
          400,
        ),
      });
      const usuario = userEvent.setup();
      envolver();
      await chegarANovaSenha(usuario);

      await preencherSenhaNova(usuario, 'a-mesma-de-sempre');
      await usuario.click(screen.getByRole('button', { name: 'Redefinir senha' }));

      expect(
        await screen.findByText('A nova senha precisa ser diferente da atual.'),
      ).toBeInTheDocument();
      expect(screen.getByLabelText('Nova senha')).toHaveFocus();
    });

    it('o código que vence antes da troca leva de volta ao passo do código, com o erro no campo', async () => {
      servidor({
        '/autenticacao/recuperacao/senha': respostaDe(
          {
            title: 'Código inválido',
            detail: 'Código incorreto ou expirado. Confira os dígitos ou peça um novo.',
            campos: { codigo: 'Código incorreto ou expirado. Confira os dígitos ou peça um novo.' },
          },
          400,
        ),
      });
      const usuario = userEvent.setup();
      envolver();
      await chegarANovaSenha(usuario);

      await preencherSenhaNova(usuario, 'senha-nova-longa');
      await usuario.click(screen.getByRole('button', { name: 'Redefinir senha' }));

      expect(await screen.findByRole('heading', { name: 'Confirme o código' })).toBeInTheDocument();
      const codigo = screen.getByLabelText('Código de verificação');
      expect(codigo).toHaveAccessibleDescription(
        'Código incorreto ou expirado. Confira os dígitos ou peça um novo.',
      );
      expect(codigo).toHaveFocus();
    });

    it('colar o código com espaço, como vem no e-mail, não perde dígito', async () => {
      servidor();
      const usuario = userEvent.setup();
      envolver();
      const campo = await chegarAoCodigo(usuario);

      await usuario.click(campo);
      await usuario.paste('    519 274');

      expect(campo).toHaveValue('519274');
    });

    it('o código recusado marca o campo', async () => {
      servidor({
        '/autenticacao/recuperacao/codigo': respostaDe(
          {
            title: 'Código inválido',
            campos: { codigo: 'Código incorreto ou expirado. Confira os dígitos ou peça um novo.' },
          },
          400,
        ),
      });
      const usuario = userEvent.setup();
      envolver();

      await usuario.type(await chegarAoCodigo(usuario), '000000');
      await usuario.click(screen.getByRole('button', { name: 'Validar código' }));

      expect(
        await screen.findByText(
          'Código incorreto ou expirado. Confira os dígitos ou peça um novo.',
        ),
      ).toBeInTheDocument();
      expect(screen.getByLabelText('Código de verificação')).toHaveAttribute(
        'aria-invalid',
        'true',
      );
    });

    it('a queda de rede vai para o resumo, sem acusar o código', async () => {
      servidor({
        '/autenticacao/recuperacao/codigo': () => Promise.reject(new TypeError('Failed to fetch')),
      });
      const usuario = userEvent.setup();
      envolver();

      await usuario.type(await chegarAoCodigo(usuario), '519274');
      await usuario.click(screen.getByRole('button', { name: 'Validar código' }));

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Não foi possível falar com o servidor.',
      );
      expect(screen.getByLabelText('Código de verificação')).not.toHaveAttribute('aria-invalid');
    });

    it('Voltar do código leva ao e-mail, e recomeçar não reaproveita o código digitado', async () => {
      servidor();
      const usuario = userEvent.setup();
      envolver();
      await usuario.type(await chegarAoCodigo(usuario), '123456');

      await usuario.click(screen.getByRole('button', { name: 'Voltar' }));

      expect(screen.getByRole('heading', { name: 'Recuperar acesso' })).toBeInTheDocument();
      expect(screen.getByLabelText('E-mail')).toHaveValue('leonardo@administraair.com.br');

      await usuario.click(screen.getByRole('button', { name: 'Enviar código' }));
      expect(await screen.findByLabelText('Código de verificação')).toHaveValue('');
    });

    it('voltar ao login e pedir de novo não apaga o e-mail da recuperação', async () => {
      servidor();
      const usuario = userEvent.setup();
      envolver();

      await usuario.click(screen.getByRole('button', { name: 'Esqueci minha senha' }));
      await usuario.type(screen.getByLabelText('E-mail'), 'leonardo@administraair.com.br');
      await usuario.click(screen.getByRole('button', { name: 'Voltar ao login' }));
      expect(screen.getByRole('heading', { name: 'Bem-vindo de volta' })).toBeInTheDocument();

      await usuario.click(screen.getByRole('button', { name: 'Esqueci minha senha' }));

      expect(screen.getByLabelText('E-mail')).toHaveValue('leonardo@administraair.com.br');
    });

    it('reenviar espera um minuto, limpa o campo e avisa que o código anterior deixa de valer', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const chamada = servidor();
      const usuario = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      envolver();
      await usuario.type(await chegarAoCodigo(usuario), '111111');

      // O servidor ignora em silêncio o pedido feito antes de um minuto: a tela não o oferece.
      expect(screen.queryByRole('button', { name: 'Reenviar código' })).not.toBeInTheDocument();
      expect(screen.getByText('Reenviar em 1:00')).toBeInTheDocument();

      // Um minuto passa no relógio com um tique só, como numa aba em segundo plano, onde o
      // navegador espaça os timers: a contagem vem do relógio, e não do número de tiques.
      act(() => {
        vi.setSystemTime(Date.now() + 60_000);
        vi.advanceTimersByTime(1_000);
      });
      await usuario.click(screen.getByRole('button', { name: 'Reenviar código' }));

      expect(await screen.findByRole('status')).toHaveTextContent(
        'Use o do e-mail mais recente: o anterior deixa de valer.',
      );
      const campo = screen.getByLabelText('Código de verificação');
      expect(campo).toHaveValue('');
      expect(campo).not.toHaveAttribute('aria-invalid');
      expect(campo).toHaveFocus();
      expect(screen.getByText(/^Reenviar em/)).toBeInTheDocument();
      expect(chamadasA(chamada, '/autenticacao/recuperacao')).toHaveLength(2);
    });
  });

  describe('convite', () => {
    it('o link do convite abre o passo de criar senha e conclui pela API', async () => {
      const chamada = servidor();
      const usuario = userEvent.setup();
      envolver({ busca: '?convite=token-do-link' });

      expect(screen.getByRole('heading', { name: 'Crie sua senha' })).toBeInTheDocument();
      expect(screen.getByLabelText('Nova senha')).toHaveFocus();

      await preencherSenhaNova(usuario, 'senha-do-convidado');
      await usuario.click(screen.getByRole('button', { name: 'Criar senha' }));

      expect(
        await screen.findByRole('heading', { name: 'Bem-vindo de volta' }),
      ).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent('Senha criada.');
      expect(corpoEnviadoA(chamada, '/autenticacao/convite/senha')).toEqual({
        convite: 'token-do-link',
        novaSenha: 'senha-do-convidado',
      });
      // O link foi gasto: o token sai da barra de endereço e do histórico.
      expect(screen.getByText('endereço: /entrar')).toBeInTheDocument();
    });

    it('tentar criar a senha vazia foca a nova senha e lista os dois campos', async () => {
      const chamada = servidor();
      envolver({ busca: '?convite=token-do-link' });

      await userEvent.click(screen.getByRole('button', { name: 'Criar senha' }));

      expect(screen.getByLabelText('Nova senha')).toHaveFocus();
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Revise 2 campos: Nova senha, Confirmar nova senha.',
      );
      expect(chamada).not.toHaveBeenCalled();
    });

    it('o convite vencido mostra a recusa do servidor e o caminho para o login', async () => {
      servidor({
        '/autenticacao/convite/senha': respostaDe(
          {
            title: 'Convite inválido',
            detail: 'Este convite expirou ou já foi usado. Peça um novo ao administrador.',
          },
          400,
        ),
      });
      const usuario = userEvent.setup();
      envolver({ busca: '?convite=token-vencido' });

      await preencherSenhaNova(usuario, 'senha-do-convidado');
      await usuario.click(screen.getByRole('button', { name: 'Criar senha' }));

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Este convite expirou ou já foi usado. Peça um novo ao administrador.',
      );

      await usuario.click(screen.getByRole('button', { name: 'Ir para o login' }));

      expect(screen.getByRole('heading', { name: 'Bem-vindo de volta' })).toBeInTheDocument();
      expect(screen.getByText('endereço: /entrar')).toBeInTheDocument();
    });
  });
});
