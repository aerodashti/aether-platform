import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PaginaDeConfiguracoes } from './PaginaDeConfiguracoes';

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

function semCorpo(status: number) {
  return {
    ok: true,
    status,
    statusText: 'Sem corpo',
    headers: new Headers({ 'X-Request-Id': 'abc-123', 'Content-Length': '0' }),
    json: () => Promise.reject(new Error('sem corpo')),
  } as unknown as Response;
}

const EMPRESA = {
  nomeFantasia: 'Administra Air',
  razaoSocial: 'Administra Air Gestão de Aeronaves LTDA',
  cnpj: '19274653000188',
  email: 'contato@administraair.com.br',
  telefone: '+55 11 3000-0000',
  diasDeAviso: 30,
};

/** O corpo do PUT /empresa: sem CNPJ, que não muda, e sem a antecedência, que tem rota própria. */
const DADOS_DE_CONTATO = {
  nomeFantasia: EMPRESA.nomeFantasia,
  razaoSocial: EMPRESA.razaoSocial,
  email: EMPRESA.email,
  telefone: EMPRESA.telefone,
};

type Rota = (corpo: Record<string, unknown>) => Response;

interface Servidor {
  papel: string;
  alterarEmpresa?: Rota;
  alterarAviso?: Rota;
  trocarSenha?: Rota;
  pedirCodigo?: Rota;
}

/** O servidor de mentira: cada teste troca só a rota que interessa a ele. */
function servidor({
  papel,
  alterarEmpresa = (corpo) => respostaDe({ ...EMPRESA, ...corpo }),
  alterarAviso = (corpo) => respostaDe({ ...EMPRESA, ...corpo }),
  trocarSenha = () => semCorpo(204),
  pedirCodigo = () => semCorpo(202),
}: Servidor) {
  vi.stubGlobal(
    'fetch',
    vi.fn((entrada: string, opcoes?: RequestInit) => {
      const corpo = opcoes?.body
        ? (JSON.parse(String(opcoes.body)) as Record<string, unknown>)
        : {};
      const rotas: Record<string, () => Response> = {
        'GET /api/autenticacao/sessao': () =>
          respostaDe({ nome: 'Leonardo', email: 'leonardo@administraair.com.br', papel }),
        'GET /api/empresa': () => respostaDe(EMPRESA),
        'PUT /api/empresa': () => alterarEmpresa(corpo),
        'PUT /api/empresa/aviso-de-vencimento': () => alterarAviso(corpo),
        'POST /api/autenticacao/senha': () => trocarSenha(corpo),
        'POST /api/autenticacao/senha/token': () => pedirCodigo(corpo),
      };
      const rota = rotas[`${opcoes?.method ?? 'GET'} ${entrada}`];
      return Promise.resolve(rota ? rota() : respostaDe({}));
    }),
  );
}

function chamadasA(metodo: string, caminho: string) {
  return vi
    .mocked(fetch)
    .mock.calls.filter(([url, opcoes]) => url === caminho && opcoes?.method === metodo);
}

async function preencherTroca(usuario: ReturnType<typeof userEvent.setup>) {
  await usuario.type(await screen.findByLabelText('Senha atual'), 'a-senha-atual');
  await usuario.type(screen.getByLabelText('Nova senha'), 'a-nova-senha');
  await usuario.type(screen.getByLabelText('Confirmar nova senha'), 'a-nova-senha');
  await usuario.type(screen.getByLabelText('Código de confirmação'), '042917');
}

describe('PaginaDeConfiguracoes', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('o administrador vê as quatro seções', async () => {
    servidor({ papel: 'ADMINISTRADOR' });
    envolver(<PaginaDeConfiguracoes />);

    expect(await screen.findByText('Dados da empresa')).toBeInTheDocument();
    expect(screen.getByText('Aparência')).toBeInTheDocument();
    expect(await screen.findByText('Alertas de vencimento')).toBeInTheDocument();
    expect(screen.getByText('Segurança')).toBeInTheDocument();
  });

  it('quem não é administrador só vê o que é seu', async () => {
    servidor({ papel: 'GESTOR' });
    envolver(<PaginaDeConfiguracoes />);

    expect(await screen.findByText('Aparência')).toBeInTheDocument();
    expect(screen.getByText('Segurança')).toBeInTheDocument();
    expect(screen.queryByText('Dados da empresa')).not.toBeInTheDocument();
    expect(screen.queryByText('Alertas de vencimento')).not.toBeInTheDocument();
  });

  it('o CNPJ aparece com máscara e bloqueado', async () => {
    servidor({ papel: 'ADMINISTRADOR' });
    envolver(<PaginaDeConfiguracoes />);

    expect(await screen.findByText('19.274.653/0001-88')).toBeInTheDocument();
    expect(screen.getByText('BLOQUEADO')).toBeInTheDocument();
  });

  it('escolher o tema escreve o atributo que os tokens leem', async () => {
    const usuario = userEvent.setup();
    servidor({ papel: 'GESTOR' });
    envolver(<PaginaDeConfiguracoes />);

    await usuario.click(await screen.findByRole('radio', { name: 'Tema escuro' }));

    expect(document.documentElement.getAttribute('data-theme')).toBe('escuro');
    expect(localStorage.getItem('aether_tema')).toBe('escuro');
  });

  it('seguir o sistema é a ausência do atributo, não um terceiro valor', async () => {
    const usuario = userEvent.setup();
    servidor({ papel: 'GESTOR' });
    envolver(<PaginaDeConfiguracoes />);

    await usuario.click(await screen.findByRole('radio', { name: 'Tema escuro' }));
    await usuario.click(screen.getByRole('radio', { name: 'Do sistema' }));

    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
    expect(localStorage.getItem('aether_tema')).toBe('sistema');
  });

  describe('Dados da empresa', () => {
    it('salvar a antecedência no cartão vizinho não apaga o telefone digitado', async () => {
      const usuario = userEvent.setup();
      servidor({ papel: 'ADMINISTRADOR' });
      envolver(<PaginaDeConfiguracoes />);

      const telefone = await screen.findByLabelText('Telefone');
      await usuario.clear(telefone);
      await usuario.type(telefone, '+55 11 99999-0000');
      await usuario.click(screen.getByRole('radio', { name: '60 dias' }));
      await usuario.click(screen.getByRole('button', { name: 'Salvar antecedência' }));

      expect(await screen.findByText('Antecedência salva.')).toBeInTheDocument();
      expect(telefone).toHaveValue('+55 11 99999-0000');
    });

    it('Enter num campo salva, e os textos vão sem os espaços das pontas', async () => {
      const usuario = userEvent.setup();
      servidor({ papel: 'ADMINISTRADOR' });
      envolver(<PaginaDeConfiguracoes />);

      const nome = await screen.findByLabelText('Nome fantasia');
      await usuario.clear(nome);
      await usuario.type(nome, '  Administra Air Táxi Aéreo {Enter}');

      expect(await screen.findByText('Dados salvos.')).toBeInTheDocument();
      expect(chamadasA('PUT', '/api/empresa')[0]?.[1]?.body).toBe(
        JSON.stringify({ ...DADOS_DE_CONTATO, nomeFantasia: 'Administra Air Táxi Aéreo' }),
      );
    });

    it('telefone fora do formato é apontado no campo, sem chamar o servidor', async () => {
      const usuario = userEvent.setup();
      servidor({ papel: 'ADMINISTRADOR' });
      envolver(<PaginaDeConfiguracoes />);

      const telefone = await screen.findByLabelText('Telefone');
      await usuario.clear(telefone);
      await usuario.type(telefone, 'abc');
      await usuario.click(screen.getByRole('button', { name: 'Salvar alterações' }));

      expect(telefone).toHaveAttribute('aria-invalid', 'true');
      expect(telefone).toHaveFocus();
      expect(screen.getByText('Revise o campo Telefone.')).toBeInTheDocument();
      expect(chamadasA('PUT', '/api/empresa')).toHaveLength(0);
    });

    it('sem mudança, o servidor não é chamado e o cartão diz por quê', async () => {
      const usuario = userEvent.setup();
      servidor({ papel: 'ADMINISTRADOR' });
      envolver(<PaginaDeConfiguracoes />);

      await usuario.click(await screen.findByRole('button', { name: 'Salvar alterações' }));

      expect(screen.getByText('Nenhuma alteração para salvar.')).toBeInTheDocument();
      expect(chamadasA('PUT', '/api/empresa')).toHaveLength(0);
    });

    it('"Dados salvos." some quando a pessoa volta a editar', async () => {
      const usuario = userEvent.setup();
      servidor({ papel: 'ADMINISTRADOR' });
      envolver(<PaginaDeConfiguracoes />);

      const razao = await screen.findByLabelText('Razão social');
      await usuario.type(razao, ' S.A.');
      await usuario.click(screen.getByRole('button', { name: 'Salvar alterações' }));
      expect(await screen.findByText('Dados salvos.')).toBeInTheDocument();

      await usuario.type(razao, 'x');

      expect(screen.queryByText('Dados salvos.')).not.toBeInTheDocument();
    });

    it('recusa sem campo aparece junto do botão, e não marca o e-mail', async () => {
      const usuario = userEvent.setup();
      servidor({
        papel: 'ADMINISTRADOR',
        alterarEmpresa: () =>
          respostaDe(
            { title: 'Acesso restrito', detail: 'Esta área é exclusiva de administradores.' },
            403,
          ),
      });
      envolver(<PaginaDeConfiguracoes />);

      await usuario.type(await screen.findByLabelText('Razão social'), ' S.A.');
      await usuario.click(screen.getByRole('button', { name: 'Salvar alterações' }));

      expect(
        await screen.findByText('Esta área é exclusiva de administradores.'),
      ).toBeInTheDocument();
      expect(screen.getByLabelText('E-mail')).not.toHaveAttribute('aria-invalid');
    });
  });

  describe('Alertas de vencimento', () => {
    it('salva a antecedência escolhida e anuncia o resultado', async () => {
      const usuario = userEvent.setup();
      servidor({ papel: 'ADMINISTRADOR' });
      envolver(<PaginaDeConfiguracoes />);

      await usuario.click(await screen.findByRole('radio', { name: '90 dias' }));
      await usuario.click(screen.getByRole('button', { name: 'Salvar antecedência' }));

      expect(fetch).toHaveBeenCalledWith(
        '/api/empresa/aviso-de-vencimento',
        expect.objectContaining({ method: 'PUT', body: JSON.stringify({ diasDeAviso: 90 }) }),
      );
      expect(await screen.findByText('Antecedência salva.')).toBeInTheDocument();
    });

    it('a antecedência vigente não volta ao servidor', async () => {
      const usuario = userEvent.setup();
      servidor({ papel: 'ADMINISTRADOR' });
      envolver(<PaginaDeConfiguracoes />);

      await usuario.click(await screen.findByRole('button', { name: 'Salvar antecedência' }));

      expect(screen.getByText('Nenhuma alteração para salvar.')).toBeInTheDocument();
      expect(chamadasA('PUT', '/api/empresa/aviso-de-vencimento')).toHaveLength(0);
    });

    it('fora da faixa, nada acusa durante a digitação; ao salvar, o campo diz o limite', async () => {
      const usuario = userEvent.setup();
      servidor({ papel: 'ADMINISTRADOR' });
      envolver(<PaginaDeConfiguracoes />);

      const campo = await screen.findByLabelText('Personalizado (dias)');
      await usuario.clear(campo);
      expect(campo).not.toHaveAttribute('aria-invalid');
      await usuario.type(campo, '999');
      await usuario.click(screen.getByRole('button', { name: 'Salvar antecedência' }));

      expect(campo).toHaveAttribute('aria-invalid', 'true');
      expect(campo).toHaveFocus();
      expect(campo).toHaveAccessibleDescription(
        'O máximo é 365. Dias antes do vencimento, de 1 a 365.',
      );
      expect(chamadasA('PUT', '/api/empresa/aviso-de-vencimento')).toHaveLength(0);
    });
  });

  describe('Segurança', () => {
    it('tentar trocar com tudo vazio foca a senha atual e o resumo lista os campos', async () => {
      const usuario = userEvent.setup();
      servidor({ papel: 'GESTOR' });
      envolver(<PaginaDeConfiguracoes />);

      await usuario.click(await screen.findByRole('button', { name: 'Alterar senha' }));

      expect(screen.getByLabelText('Senha atual')).toHaveFocus();
      expect(
        screen.getByText(
          'Revise 4 campos: Senha atual, Nova senha, Confirmar nova senha, Código de confirmação.',
        ),
      ).toBeInTheDocument();
    });

    it('a confirmação não é acusada enquanto se digita pela primeira vez', async () => {
      const usuario = userEvent.setup();
      servidor({ papel: 'GESTOR' });
      envolver(<PaginaDeConfiguracoes />);

      await usuario.type(await screen.findByLabelText('Nova senha'), 'a-nova-senha');
      await usuario.type(screen.getByLabelText('Confirmar nova senha'), 'a-no');

      expect(screen.queryByText('As duas senhas não conferem.')).not.toBeInTheDocument();
      expect(screen.getByLabelText('Confirmar nova senha')).not.toHaveAttribute('aria-invalid');
    });

    it('a troca envia os três campos do request e limpa o formulário', async () => {
      const usuario = userEvent.setup();
      servidor({ papel: 'GESTOR' });
      envolver(<PaginaDeConfiguracoes />);

      await preencherTroca(usuario);
      await usuario.click(screen.getByRole('button', { name: 'Alterar senha' }));

      expect(fetch).toHaveBeenCalledWith(
        '/api/autenticacao/senha',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            senhaAtual: 'a-senha-atual',
            novaSenha: 'a-nova-senha',
            codigo: '042917',
          }),
        }),
      );
      expect(
        await screen.findByText('Senha alterada. As outras sessões foram encerradas.'),
      ).toBeInTheDocument();
      expect(screen.getByLabelText('Senha atual')).toHaveValue('');
      expect(screen.getByLabelText('Senha atual')).not.toHaveAttribute('aria-invalid');
    });

    it('o código recusado é apontado no campo do código, e não na senha atual', async () => {
      const usuario = userEvent.setup();
      const mensagem = 'Código inválido ou expirado. Peça um novo para continuar.';
      servidor({
        papel: 'GESTOR',
        trocarSenha: () =>
          respostaDe(
            { title: 'Código inválido', detail: mensagem, campos: { codigo: mensagem } },
            400,
          ),
      });
      envolver(<PaginaDeConfiguracoes />);

      await preencherTroca(usuario);
      await usuario.click(screen.getByRole('button', { name: 'Alterar senha' }));

      const codigo = screen.getByLabelText('Código de confirmação');
      await waitFor(() => expect(codigo).toHaveAttribute('aria-invalid', 'true'));
      expect(codigo).toHaveFocus();
      expect(screen.getByText(mensagem)).toBeInTheDocument();
      expect(screen.getByLabelText('Senha atual')).not.toHaveAttribute('aria-invalid');
    });

    it('o bloqueio por tentativas aparece junto do botão, com o tempo que falta', async () => {
      const usuario = userEvent.setup();
      const detalhe =
        'A conta está bloqueada por tentativas erradas de senha. Tente de novo em 15 minutos.';
      servidor({
        papel: 'GESTOR',
        trocarSenha: () => respostaDe({ title: 'Troca de senha bloqueada', detail: detalhe }, 429),
      });
      envolver(<PaginaDeConfiguracoes />);

      await preencherTroca(usuario);
      await usuario.click(screen.getByRole('button', { name: 'Alterar senha' }));

      expect(await screen.findByText(detalhe)).toBeInTheDocument();
    });

    it('pedir o código confirma o envio e segura o reenvio pelo intervalo', async () => {
      const usuario = userEvent.setup();
      servidor({ papel: 'GESTOR' });
      envolver(<PaginaDeConfiguracoes />);

      await usuario.click(await screen.findByRole('button', { name: 'Enviar código por e-mail' }));

      expect(
        await screen.findByText('Código enviado para o e-mail cadastrado. Ele vale 10 minutos.'),
      ).toBeInTheDocument();
      const reenviar = screen.getByRole('button', { name: 'Reenviar código' });
      expect(reenviar).toHaveAttribute('aria-disabled', 'true');
      expect(reenviar).toHaveAccessibleDescription('Outro código em 60 s.');
    });

    it('depois da troca, o código gasto sai da tela e o intervalo continua valendo', async () => {
      const usuario = userEvent.setup();
      servidor({ papel: 'GESTOR' });
      envolver(<PaginaDeConfiguracoes />);

      await usuario.click(await screen.findByRole('button', { name: 'Enviar código por e-mail' }));
      await screen.findByText('Código enviado para o e-mail cadastrado. Ele vale 10 minutos.');
      await preencherTroca(usuario);
      await usuario.click(screen.getByRole('button', { name: 'Alterar senha' }));

      await screen.findByText('Senha alterada. As outras sessões foram encerradas.');
      expect(
        screen.queryByText('Código enviado para o e-mail cadastrado. Ele vale 10 minutos.'),
      ).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Enviar código por e-mail' })).toHaveAttribute(
        'aria-disabled',
        'true',
      );
    });

    it('a falha ao pedir o código aparece, em vez de silêncio', async () => {
      const usuario = userEvent.setup();
      servidor({
        papel: 'GESTOR',
        pedirCodigo: () =>
          respostaDe({ title: 'Erro interno', detail: 'Tente novamente em instantes.' }, 500),
      });
      envolver(<PaginaDeConfiguracoes />);

      await usuario.click(await screen.findByRole('button', { name: 'Enviar código por e-mail' }));

      expect(
        await screen.findByText('Não foi possível enviar o código. Tente novamente em instantes.'),
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Enviar código por e-mail' })).not.toHaveAttribute(
        'aria-disabled',
      );
    });
  });
});
