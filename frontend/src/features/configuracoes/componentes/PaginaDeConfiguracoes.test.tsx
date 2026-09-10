import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
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

function semConteudo() {
  return {
    ok: true,
    status: 204,
    statusText: 'No Content',
    headers: new Headers({ 'X-Request-Id': 'abc-123' }),
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

function sessaoDe(papel: string) {
  return { nome: 'Leonardo', email: 'leonardo@administraair.com.br', papel };
}

function comPapel(papel: string) {
  vi.stubGlobal(
    'fetch',
    vi.fn((entrada: string, opcoes?: RequestInit) => {
      if (entrada.startsWith('/api/autenticacao/sessao')) {
        return Promise.resolve(respostaDe(sessaoDe(papel)));
      }
      if (entrada.startsWith('/api/autenticacao/senha')) {
        return Promise.resolve(opcoes?.method === 'POST' ? semConteudo() : respostaDe({}));
      }
      if (entrada.startsWith('/api/empresa')) {
        return Promise.resolve(respostaDe(EMPRESA));
      }
      return Promise.resolve(respostaDe({}));
    }),
  );
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
    comPapel('ADMINISTRADOR');
    envolver(<PaginaDeConfiguracoes />);

    expect(await screen.findByText('Dados da empresa')).toBeInTheDocument();
    expect(screen.getByText('Aparência')).toBeInTheDocument();
    expect(await screen.findByText('Alertas de vencimento')).toBeInTheDocument();
    expect(screen.getByText('Segurança')).toBeInTheDocument();
  });

  it('quem não é administrador só vê o que é seu', async () => {
    comPapel('GESTOR');
    envolver(<PaginaDeConfiguracoes />);

    expect(await screen.findByText('Aparência')).toBeInTheDocument();
    expect(screen.getByText('Segurança')).toBeInTheDocument();
    expect(screen.queryByText('Dados da empresa')).not.toBeInTheDocument();
    expect(screen.queryByText('Alertas de vencimento')).not.toBeInTheDocument();
  });

  it('o CNPJ aparece com máscara e bloqueado', async () => {
    comPapel('ADMINISTRADOR');
    envolver(<PaginaDeConfiguracoes />);

    expect(await screen.findByText('19.274.653/0001-88')).toBeInTheDocument();
    expect(screen.getByText('BLOQUEADO')).toBeInTheDocument();
  });

  it('escolher o tema escreve o atributo que os tokens leem', async () => {
    const usuario = userEvent.setup();
    comPapel('GESTOR');
    envolver(<PaginaDeConfiguracoes />);

    await usuario.click(await screen.findByRole('radio', { name: 'Tema escuro' }));

    expect(document.documentElement.getAttribute('data-theme')).toBe('escuro');
    expect(localStorage.getItem('aether_tema')).toBe('escuro');
  });

  it('seguir o sistema é a ausência do atributo, não um terceiro valor', async () => {
    const usuario = userEvent.setup();
    comPapel('GESTOR');
    envolver(<PaginaDeConfiguracoes />);

    await usuario.click(await screen.findByRole('radio', { name: 'Tema escuro' }));
    await usuario.click(screen.getByRole('radio', { name: 'Do sistema' }));

    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
    expect(localStorage.getItem('aether_tema')).toBe('sistema');
  });

  it('a antecedência só salva quando muda e quando é plausível', async () => {
    const usuario = userEvent.setup();
    comPapel('ADMINISTRADOR');
    envolver(<PaginaDeConfiguracoes />);

    const salvar = await screen.findByRole('button', { name: 'Salvar antecedência' });
    // Vigente é 30: nada a salvar.
    expect(salvar).toBeDisabled();

    await usuario.click(screen.getByRole('radio', { name: '90 dias' }));
    expect(salvar).toBeEnabled();

    await usuario.click(salvar);
    expect(fetch).toHaveBeenCalledWith(
      '/api/empresa/aviso-de-vencimento',
      expect.objectContaining({ method: 'PUT', body: JSON.stringify({ diasDeAviso: 90 }) }),
    );
  });

  it('antecedência fora da faixa é barrada antes de chamar o servidor', async () => {
    const usuario = userEvent.setup();
    comPapel('ADMINISTRADOR');
    envolver(<PaginaDeConfiguracoes />);

    const campo = await screen.findByLabelText('Personalizado');
    await usuario.clear(campo);
    await usuario.type(campo, '999');

    expect(screen.getByText('Informe de 1 a 365 dias.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salvar antecedência' })).toBeDisabled();
  });

  it('a troca de senha exige senha atual, confirmação e código de seis dígitos', async () => {
    const usuario = userEvent.setup();
    comPapel('GESTOR');
    envolver(<PaginaDeConfiguracoes />);

    const alterar = await screen.findByRole('button', { name: 'Alterar senha' });
    expect(alterar).toBeDisabled();

    await usuario.type(screen.getByLabelText('Senha atual'), 'a-senha-atual');
    await usuario.type(screen.getByLabelText('Nova senha'), 'a-nova-senha');
    await usuario.type(screen.getByLabelText('Confirmar nova senha'), 'outra-coisa');

    expect(screen.getByText('As duas senhas não conferem.')).toBeInTheDocument();
    expect(alterar).toBeDisabled();

    await usuario.clear(screen.getByLabelText('Confirmar nova senha'));
    await usuario.type(screen.getByLabelText('Confirmar nova senha'), 'a-nova-senha');
    await usuario.type(screen.getByLabelText('Código de confirmação'), '042917');

    expect(alterar).toBeEnabled();
    await usuario.click(alterar);

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
  });
});
