import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PainelDeProprietario } from './PainelDeProprietario';
import type { ProprietarioResponse } from './useProprietarios';

function respostaDe(corpo: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: '',
    headers: new Headers({ 'X-Request-Id': 'abc-123' }),
    json: () => Promise.resolve(corpo),
  } as unknown as Response;
}

const SALVO: ProprietarioResponse = {
  id: 9,
  nome: 'Vetor SPE',
  cpfCnpj: '12ABC34501DE35',
  corDeIdentificacao: 'PETROLEO',
  situacao: 'ATIVO',
};

function montar(proprietario?: ProprietarioResponse) {
  const aoFechar = vi.fn();
  const aoSalvar = vi.fn();
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={cliente}>
      <PainelDeProprietario proprietario={proprietario} aoFechar={aoFechar} aoSalvar={aoSalvar} />
    </QueryClientProvider>,
  );
  return { aoFechar, aoSalvar };
}

function campo(rotulo: string) {
  return screen.getByLabelText(rotulo);
}

function corpoEnviado(): unknown {
  const [, opcoes] = vi.mocked(fetch).mock.calls[0] ?? [];
  return JSON.parse(String(opcoes?.body));
}

describe('PainelDeProprietario', () => {
  beforeEach(() => {
    // O jsdom não implementa a API de <dialog>.
    HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
      this.open = true;
    });
    HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
      this.open = false;
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(respostaDe(SALVO, 201))),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('o nome é o obrigatório: marcado, e o Cadastrar não fica desabilitado', () => {
    montar();

    expect(campo('Nome / Nome fantasia')).toBeRequired();
    expect(campo('CPF / CNPJ')).not.toBeRequired();
    expect(campo('CPF / CNPJ')).toHaveAccessibleDescription(/^Opcional\./);
    expect(screen.getByRole('button', { name: 'Cadastrar' })).not.toHaveAttribute('aria-disabled');
  });

  it('tentar salvar vazio leva o foco ao nome e o resumo diz o que falta', async () => {
    montar();

    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar' }));

    expect(campo('Nome / Nome fantasia')).toHaveFocus();
    expect(campo('Nome / Nome fantasia')).toHaveAccessibleDescription(
      'Informe o nome do proprietário.',
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Revise o campo Nome / Nome fantasia.');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('todos os problemas aparecem de uma vez, cada um no seu campo', async () => {
    montar();
    await userEvent.type(campo('Nome / Nome fantasia'), 'Otávio Lins');
    await userEvent.type(campo('CPF / CNPJ'), '123.456.789-01');
    await userEvent.type(campo('E-mail'), 'otavio@exemplo');
    await userEvent.type(campo('Telefone'), 'liga depois');

    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar' }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Revise 3 campos: CPF / CNPJ, E-mail, Telefone.',
    );
    expect(campo('CPF / CNPJ')).toHaveFocus();
    expect(campo('E-mail')).toHaveAccessibleDescription(
      'Informe um e-mail válido, como nome@empresa.com.br.',
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it('o documento ganha a pontuação enquanto se digita, inclusive o CNPJ com letras', async () => {
    montar();

    await userEvent.type(campo('CPF / CNPJ'), '12abc34501de35');

    expect(campo('CPF / CNPJ')).toHaveValue('12.ABC.345/01DE-35');
  });

  it('Enter num campo envia, e o salvo volta para quem abriu o painel', async () => {
    const { aoFechar, aoSalvar } = montar();
    await userEvent.type(campo('CPF / CNPJ'), '12abc34501de35');

    await userEvent.type(campo('Nome / Nome fantasia'), 'Vetor SPE{Enter}');

    await vi.waitFor(() => expect(aoSalvar).toHaveBeenCalledWith(SALVO));
    expect(aoFechar).toHaveBeenCalled();
    expect(corpoEnviado()).toEqual({
      nome: 'Vetor SPE',
      cpfCnpj: '12.ABC.345/01DE-35',
      email: '',
      telefone: '',
      corDeIdentificacao: 'PETROLEO',
    });
  });

  it('a recusa do servidor cai no campo dela, com o foco', async () => {
    vi.mocked(fetch).mockResolvedValue(
      respostaDe(
        {
          title: 'CPF ou CNPJ já cadastrado',
          detail: 'Este documento já é de Ricardo Meirelles.',
          campos: { cpfCnpj: 'Este documento já é de Ricardo Meirelles.' },
        },
        409,
      ),
    );
    montar();
    await userEvent.type(campo('Nome / Nome fantasia'), 'Homônimo');
    await userEvent.type(campo('CPF / CNPJ'), '52998224725');

    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar' }));

    await vi.waitFor(() =>
      expect(campo('CPF / CNPJ')).toHaveAccessibleDescription(
        /^Este documento já é de Ricardo Meirelles\./,
      ),
    );
    expect(campo('CPF / CNPJ')).toHaveFocus();
  });

  it('durante o envio, Cancelar fica inerte e o painel não sai de cena', async () => {
    vi.mocked(fetch).mockReturnValue(new Promise(() => {}));
    const { aoFechar } = montar();
    await userEvent.type(campo('Nome / Nome fantasia'), 'Helena Sabino');

    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar' }));
    const cancelar = screen.getByRole('button', { name: 'Cancelar' });
    await userEvent.click(cancelar);

    expect(cancelar).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('button', { name: 'Cadastrar' })).toHaveAttribute('aria-busy', 'true');
    expect(aoFechar).not.toHaveBeenCalled();
  });

  it('sem conexão, o resumo diz que não falou com o servidor', async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError('Failed to fetch'));
    montar();
    await userEvent.type(campo('Nome / Nome fantasia'), 'Helena Sabino');

    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar' }));

    expect(await screen.findByText(/Não foi possível falar com o servidor/)).toBeInTheDocument();
  });

  it('na edição, abre com o documento pontuado e envia um PUT', async () => {
    montar({ ...SALVO, email: 'contato@vetor.com.br' });

    expect(campo('CPF / CNPJ')).toHaveValue('12.ABC.345/01DE-35');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    await vi.waitFor(() => expect(fetch).toHaveBeenCalled());
    const [endereco, opcoes] = vi.mocked(fetch).mock.calls[0] ?? [];
    expect(endereco).toBe('/api/proprietarios/9');
    expect(opcoes?.method).toBe('PUT');
  });
});
