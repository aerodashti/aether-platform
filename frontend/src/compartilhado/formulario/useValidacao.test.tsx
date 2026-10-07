import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ErroDeApi } from '@/api/cliente';
import { Botao } from '@/design-system/primitivos/Botao';
import { CampoDeTexto } from '@/design-system/primitivos/CampoDeTexto';
import { GrupoDeOpcoes } from '@/design-system/primitivos/GrupoDeOpcoes';

import { obrigatorio, numero, primeiraFalha } from './regras';
import { ResumoDoFormulario } from './ResumoDoFormulario';
import { useValidacao, type Erros } from './useValidacao';

type Campo = 'descricao' | 'valor' | 'moeda';

const ROTULOS: Record<Campo, string> = { descricao: 'Descrição', valor: 'Valor', moeda: 'Moeda' };

function validar(valores: Record<Campo, string>): Erros<Campo> {
  return {
    descricao: primeiraFalha(valores.descricao, obrigatorio('Informe a descrição.')),
    valor: primeiraFalha(valores.valor, obrigatorio('Informe o valor.'), numero({ maiorQue: 0 })),
    moeda: primeiraFalha(valores.moeda, obrigatorio('Escolha a moeda.')),
  };
}

function Formulario({ aoSalvar, falha }: { aoSalvar: () => void; falha?: unknown }) {
  const [valores, setValores] = useState<Record<Campo, string>>({
    descricao: '',
    valor: '',
    moeda: '',
  });
  const alterar = (campo: Campo) => (valor: string) =>
    setValores((atuais) => ({ ...atuais, [campo]: valor }));
  const validacao = useValidacao({ erros: validar(valores), valores, rotulos: ROTULOS, falha });

  return (
    <div ref={validacao.refDoFormulario}>
      <CampoDeTexto
        rotulo="Descrição"
        obrigatorio
        valor={valores.descricao}
        aoMudar={alterar('descricao')}
        erro={validacao.erroDe('descricao')}
      />
      <CampoDeTexto
        rotulo="Valor"
        obrigatorio
        valor={valores.valor}
        aoMudar={alterar('valor')}
        erro={validacao.erroDe('valor')}
      />
      <GrupoDeOpcoes
        rotulo="Moeda"
        obrigatorio
        valor={valores.moeda}
        opcoes={[
          { valor: 'BRL', rotulo: 'BRL' },
          { valor: 'USD', rotulo: 'USD' },
        ]}
        aoEscolher={alterar('moeda')}
        erro={validacao.erroDe('moeda')}
      />
      <ResumoDoFormulario resumo={validacao.resumo} />
      <Botao aoClicar={() => validacao.enviar(aoSalvar)}>Salvar</Botao>
    </div>
  );
}

describe('useValidacao', () => {
  it('não acusa nada antes da primeira tentativa de salvar', () => {
    render(<Formulario aoSalvar={vi.fn()} />);

    expect(screen.getByLabelText('Descrição')).not.toHaveAttribute('aria-invalid');
    expect(screen.getByRole('alert')).toBeEmptyDOMElement();
  });

  it('ao salvar com problema, mostra todos, resume e leva o foco ao primeiro', async () => {
    const aoSalvar = vi.fn();
    render(<Formulario aoSalvar={aoSalvar} />);

    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(aoSalvar).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Descrição')).toHaveFocus();
    expect(screen.getByLabelText('Descrição')).toHaveAccessibleDescription('Informe a descrição.');
    expect(screen.getByRole('radiogroup', { name: 'Moeda' })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Revise 3 campos: Descrição, Valor, Moeda.',
    );
  });

  it('depois da tentativa, o erro acompanha a digitação e o envio passa quando tudo está certo', async () => {
    const aoSalvar = vi.fn();
    render(<Formulario aoSalvar={aoSalvar} />);
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await userEvent.type(screen.getByLabelText('Descrição'), 'Pouso');
    await userEvent.type(screen.getByLabelText('Valor'), '0');
    expect(screen.getByLabelText('Valor')).toHaveAccessibleDescription(
      'Informe um valor maior que 0.',
    );

    await userEvent.clear(screen.getByLabelText('Valor'));
    await userEvent.type(screen.getByLabelText('Valor'), '1.850,00');
    await userEvent.click(screen.getByRole('radio', { name: 'BRL' }));
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(aoSalvar).toHaveBeenCalledTimes(1);
  });

  it('o erro do servidor cai no campo de mesmo nome e some quando o campo muda', async () => {
    const falha = new ErroDeApi('O valor passa do limite.', 400, null, {
      valor: 'O valor passa do limite.',
    });
    render(<Formulario aoSalvar={vi.fn()} falha={falha} />);

    expect(screen.getByLabelText('Valor')).toHaveAccessibleDescription('O valor passa do limite.');
    expect(screen.getByLabelText('Valor')).toHaveFocus();

    await userEvent.type(screen.getByLabelText('Valor'), '1');

    expect(screen.getByLabelText('Valor')).not.toHaveAttribute('aria-invalid');
  });

  it('a recusa sem campo vai para o resumo', () => {
    render(
      <Formulario
        aoSalvar={vi.fn()}
        falha={new ErroDeApi('Lançamento em BRL não carrega câmbio.', 400, null)}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Lançamento em BRL não carrega câmbio.');
  });
});
