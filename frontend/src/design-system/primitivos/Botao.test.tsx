import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Botao } from './Botao';

describe('Botao', () => {
  it('avisa quem clicou', async () => {
    const aoClicar = vi.fn();
    render(<Botao aoClicar={aoClicar}>Atualizar</Botao>);

    await userEvent.click(screen.getByRole('button', { name: 'Atualizar' }));

    expect(aoClicar).toHaveBeenCalledTimes(1);
  });

  it('fica inerte e anuncia a espera enquanto carrega', async () => {
    const aoClicar = vi.fn();
    render(
      <Botao aoClicar={aoClicar} carregando>
        Atualizando
      </Botao>,
    );

    const botao = screen.getByRole('button', { name: 'Atualizando' });
    expect(botao).toHaveAttribute('aria-disabled', 'true');
    expect(botao).toHaveAttribute('aria-busy', 'true');

    await userEvent.click(botao);
    expect(aoClicar).not.toHaveBeenCalled();
  });

  it('desabilitado continua na ordem de Tab e diz por quê', async () => {
    render(
      <>
        <Botao desabilitado descritoPor="motivo">
          Salvar
        </Botao>
        <p id="motivo">Falta a data.</p>
      </>,
    );

    await userEvent.tab();

    const botao = screen.getByRole('button', { name: 'Salvar' });
    expect(botao).toHaveFocus();
    expect(botao).toHaveAccessibleDescription('Falta a data.');
  });

  it('não envia o formulário enquanto está inerte', async () => {
    const aoEnviar = vi.fn((evento: { preventDefault: () => void }) => evento.preventDefault());
    render(
      <form onSubmit={aoEnviar}>
        <Botao tipo="submit" carregando>
          Entrar
        </Botao>
      </form>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(aoEnviar).not.toHaveBeenCalled();
  });

  it('na variante de contorno, o nome acessível continua sendo o rótulo uma única vez', () => {
    // A variante duplica o rótulo em três camadas para animar a troca. Só uma delas pode contar
    // para o leitor de tela — as outras são aria-hidden.
    render(
      <Botao variante="contorno" iconeAoFim={<span aria-hidden="true">→</span>}>
        Entrar
      </Botao>,
    );

    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument();
  });
});
