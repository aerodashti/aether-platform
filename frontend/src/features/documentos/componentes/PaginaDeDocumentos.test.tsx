import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PaginaDeDocumentos } from './PaginaDeDocumentos';

function respostaDe(corpo: unknown, status = 200) {
  return {
    ok: status < 300,
    status,
    statusText: 'OK',
    headers: new Headers({ 'X-Request-Id': 'abc-123' }),
    json: () => Promise.resolve(corpo),
    blob: () => Promise.resolve(new Blob(['%PDF'])),
  } as unknown as Response;
}

const GESTORA = { nome: 'Patrícia', email: 'p@x.com.br', papel: 'GESTOR' };
const PROPRIETARIO = { nome: 'Rubens', email: 'r@x.com.br', papel: 'PROPRIETARIO' };

const APOLICE = {
  id: 7,
  aeronaveId: 1,
  nome: 'Apólice RETA 2026.pdf',
  tipoDeConteudo: 'application/pdf',
  tamanho: 2516582,
  enviadoPor: 'Patrícia',
  criadoEm: '2026-10-06T12:00:00Z',
};
const CVA = { ...APOLICE, id: 8, nome: 'CVA 2026.pdf' };
const LISTA = { documentos: [APOLICE, CVA], tamanhoTotal: 2 * 2516582 };

type Resposta = (url: string, opcoes?: RequestInit) => Promise<Response> | undefined;

/** `responder` atende o que quiser; o resto cai nas respostas padrão de uma gestora. */
function montar({
  url = '/aeronaves/1/documentos',
  sessao = GESTORA,
  responder,
}: { url?: string; sessao?: unknown; responder?: Resposta } = {}) {
  vi.stubGlobal(
    'fetch',
    vi.fn((entrada: string, opcoes?: RequestInit) => {
      const especial = responder?.(entrada, opcoes);
      if (especial) {
        return especial;
      }
      if (opcoes?.method === 'POST') {
        return Promise.resolve(respostaDe([{ ...CVA, id: 9 }], 201));
      }
      if (opcoes?.method === 'DELETE') {
        return Promise.resolve(respostaDe(undefined, 204));
      }
      if (entrada.startsWith('/api/autenticacao/sessao')) {
        return Promise.resolve(respostaDe(sessao));
      }
      if (entrada === '/api/aeronaves') {
        return Promise.resolve(respostaDe([{ id: 1, matricula: 'PS-MEP', modelo: 'Citation' }]));
      }
      return Promise.resolve(respostaDe(LISTA));
    }),
  );
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={cliente}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/aeronaves/:id/documentos" element={<PaginaDeDocumentos />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function chamadas() {
  return vi.mocked(fetch).mock.calls.map(([url, opcoes]) => ({
    url: String(url),
    metodo: (opcoes as RequestInit | undefined)?.method ?? 'GET',
    corpo: (opcoes as RequestInit | undefined)?.body,
  }));
}

function pdf(nome: string) {
  return new File(['%PDF'], nome, { type: 'application/pdf' });
}

async function seletor() {
  return screen.findByLabelText('+ Adicionar documentos');
}

describe('PaginaDeDocumentos', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('lista com resumo, data e tamanho legível', async () => {
    montar();

    expect(await screen.findByText('2 documentos · 4,8 MB')).toBeInTheDocument();
    expect(await screen.findByText('PS-MEP')).toBeInTheDocument();
    const linha = screen.getByText('Apólice RETA 2026.pdf').closest('tr') as HTMLElement;
    expect(within(linha).getByText('2,4 MB')).toBeInTheDocument();
    expect(within(linha).getByText('enviado por Patrícia')).toBeInTheDocument();
  });

  it('envia os arquivos escolhidos como multipart e anuncia quantos entraram', async () => {
    montar();

    await screen.findByText('Apólice RETA 2026.pdf');
    const arquivo = pdf('CVA.pdf');
    await userEvent.upload(await seletor(), [arquivo]);

    const envio = chamadas().find((chamada) => chamada.metodo === 'POST');
    expect(envio?.url).toBe('/api/aeronaves/1/documentos');
    expect((envio?.corpo as FormData).getAll('arquivos')).toEqual([arquivo]);
    expect(await screen.findByRole('status', { name: '' })).toHaveTextContent(
      '1 documento enviado.',
    );
  });

  it('os limites do envio ficam sempre à vista, ligados ao botão', async () => {
    montar();

    expect(await seletor()).toHaveAccessibleDescription(
      'PDF, imagens, planilhas e documentos do Office. Até 20 MB cada; por envio, até 10 arquivos e 100 MB.',
    );
  });

  it('onze arquivos nem vão ao servidor: o botão fica inválido e diz o limite', async () => {
    montar();

    await screen.findByText('Apólice RETA 2026.pdf');
    const onze = Array.from({ length: 11 }, (_, n) => pdf(`laudo-${n}.pdf`));
    await userEvent.upload(await seletor(), onze);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Envie até 10 arquivos por vez; foram escolhidos 11.',
    );
    expect(await seletor()).toBeInvalid();
    expect(await seletor()).toHaveAccessibleDescription(/^Envie até 10 arquivos por vez/);
    expect(chamadas().some((chamada) => chamada.metodo === 'POST')).toBe(false);
  });

  it('arquivo acima de 20 MB nem vai ao servidor', async () => {
    montar();

    await screen.findByText('Apólice RETA 2026.pdf');
    const grande = pdf('scan.pdf');
    Object.defineProperty(grande, 'size', { value: 21 * 1024 * 1024 });
    await userEvent.upload(await seletor(), [grande]);

    expect(screen.getByRole('alert')).toHaveTextContent('O arquivo "scan.pdf" passa de 20 MB.');
    expect(chamadas().some((chamada) => chamada.metodo === 'POST')).toBe(false);
  });

  it('o erro do servidor aparece com a mensagem dele', async () => {
    montar({
      responder: (_url, opcoes) =>
        opcoes?.method === 'POST'
          ? Promise.resolve(
              respostaDe({ campos: { arquivos: 'O tipo de "x.html" não é aceito.' } }, 400),
            )
          : undefined,
    });

    await screen.findByText('Apólice RETA 2026.pdf');
    await userEvent.upload(await seletor(), [pdf('x.pdf')]);

    expect(await screen.findByText('O tipo de "x.html" não é aceito.')).toBeInTheDocument();
  });

  it('o proprietário só lê: sem enviar nem remover', async () => {
    montar({ sessao: PROPRIETARIO });

    await screen.findByText('Apólice RETA 2026.pdf');
    await waitFor(() =>
      expect(chamadas().some((chamada) => chamada.url.includes('sessao'))).toBe(true),
    );
    expect(screen.queryByLabelText('+ Adicionar documentos')).toBeNull();
    expect(screen.queryByRole('button', { name: /^Remover/ })).toBeNull();
  });

  it('remover avisa que não tem volta, leva o foco ao Não, e o Não o devolve', async () => {
    montar();

    const remover = await screen.findByRole('button', { name: 'Remover Apólice RETA 2026.pdf' });
    await userEvent.click(remover);

    const nao = screen.getByRole('button', { name: 'Não remover Apólice RETA 2026.pdf' });
    expect(nao).toHaveFocus();
    expect(nao).toHaveAccessibleDescription('Remover? Não pode ser desfeito.');
    await userEvent.click(nao);

    expect(screen.getByRole('button', { name: 'Remover Apólice RETA 2026.pdf' })).toHaveFocus();
  });

  it('remover apaga, anuncia e deixa o foco na grade', async () => {
    montar();

    await userEvent.click(
      await screen.findByRole('button', { name: 'Remover Apólice RETA 2026.pdf' }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Sim, remover Apólice RETA 2026.pdf' }),
    );

    expect(chamadas()).toContainEqual(
      expect.objectContaining({ url: '/api/aeronaves/1/documentos/7', metodo: 'DELETE' }),
    );
    expect(await screen.findByText('"Apólice RETA 2026.pdf" removido.')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Documentos da aeronave' })).toHaveFocus();
  });

  it('a remoção que falha diz o porquê, em vez de fechar em silêncio', async () => {
    montar({
      responder: (_url, opcoes) =>
        opcoes?.method === 'DELETE'
          ? Promise.resolve(respostaDe({ detail: 'Documento não encontrado.' }, 404))
          : undefined,
    });

    await userEvent.click(
      await screen.findByRole('button', { name: 'Remover Apólice RETA 2026.pdf' }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Sim, remover Apólice RETA 2026.pdf' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível remover "Apólice RETA 2026.pdf": Documento não encontrado.',
    );
    expect(screen.getByRole('button', { name: 'Remover Apólice RETA 2026.pdf' })).toHaveFocus();
  });

  it('a remoção em andamento de uma linha não ocupa nem fecha a confirmação de outra', async () => {
    let concluir: (resposta: Response) => void = () => undefined;
    montar({
      responder: (_url, opcoes) =>
        opcoes?.method === 'DELETE'
          ? new Promise<Response>((resolver) => {
              concluir = resolver;
            })
          : undefined,
    });

    await userEvent.click(
      await screen.findByRole('button', { name: 'Remover Apólice RETA 2026.pdf' }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Sim, remover Apólice RETA 2026.pdf' }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Remover CVA 2026.pdf' }));

    const simDoCva = screen.getByRole('button', { name: 'Sim, remover CVA 2026.pdf' });
    expect(simDoCva).not.toHaveAttribute('aria-busy');
    concluir(respostaDe(undefined, 204));

    expect(await screen.findByText('"Apólice RETA 2026.pdf" removido.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sim, remover CVA 2026.pdf' })).toBeInTheDocument();
  });

  it('baixar busca o arquivo sem sair da tela, e a falha fica no alerta', async () => {
    const criarEndereco = vi.fn(() => 'blob:documento');
    Object.assign(URL, { createObjectURL: criarEndereco, revokeObjectURL: vi.fn() });
    const clicar = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    montar({
      responder: (url) =>
        url.endsWith('/8/conteudo')
          ? Promise.resolve(
              respostaDe({ detail: 'O arquivo deste documento não foi encontrado.' }, 404),
            )
          : undefined,
    });

    await screen.findByText('Apólice RETA 2026.pdf');
    await userEvent.click(
      screen.getByRole('button', { name: /^Apólice RETA 2026\.pdf\s*— baixar$/ }),
    );
    await waitFor(() => expect(clicar).toHaveBeenCalled());
    expect(criarEndereco).toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: /^CVA 2026\.pdf\s*— baixar$/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível baixar "CVA 2026.pdf": O arquivo deste documento não foi encontrado.',
    );
  });

  it('id que não é de aeronave na rota: diz que não encontrou e não oferece o envio', async () => {
    montar({ url: '/aeronaves/abc/documentos' });

    expect(await screen.findByText('Aeronave não encontrada.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voltar para a frota' })).toHaveAttribute(
      'href',
      '/aeronaves',
    );
    expect(screen.queryByLabelText('+ Adicionar documentos')).toBeNull();
  });

  it('aeronave que não existe: o 404 da lista vira "Aeronave não encontrada."', async () => {
    montar({
      url: '/aeronaves/9999/documentos',
      responder: (url) =>
        url === '/api/aeronaves/9999/documentos'
          ? Promise.resolve(respostaDe({ detail: 'Aeronave não encontrada.' }, 404))
          : undefined,
    });

    expect(await screen.findByText('Aeronave não encontrada.')).toBeInTheDocument();
    expect(screen.queryByLabelText('+ Adicionar documentos')).toBeNull();
  });
});
