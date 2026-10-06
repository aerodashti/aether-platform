import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { MenuSuspenso } from './MenuSuspenso';

function montar(aoEscolher = vi.fn()) {
  render(
    <>
      <MenuSuspenso
        rotulo="+ Registrar"
        titulo="Registro rápido"
        itens={[{ rotulo: 'Custo', apoio: 'Despesa fixa ou variável', aoEscolher }]}
      />
      <p>fora</p>
    </>,
  );
  return { gatilho: screen.getByRole('button', { name: /Registrar/ }), aoEscolher };
}

describe('MenuSuspenso', () => {
  it('abre e fecha pelo gatilho, anunciando o estado', async () => {
    const { gatilho } = montar();
    expect(gatilho).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: /Custo/ })).not.toBeInTheDocument();

    await userEvent.click(gatilho);
    expect(gatilho).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('list', { name: 'Registro rápido' })).toBeInTheDocument();
  });

  it('escolher um item fecha o menu e executa a ação', async () => {
    const { gatilho, aoEscolher } = montar();
    await userEvent.click(gatilho);
    await userEvent.click(screen.getByRole('button', { name: /Custo/ }));

    expect(aoEscolher).toHaveBeenCalledOnce();
    expect(gatilho).toHaveAttribute('aria-expanded', 'false');
  });

  it('Esc fecha e devolve o foco ao gatilho', async () => {
    const { gatilho } = montar();
    await userEvent.click(gatilho);
    await userEvent.tab();
    expect(screen.getByRole('button', { name: /Custo/ })).toHaveFocus();

    await userEvent.keyboard('{Escape}');
    expect(gatilho).toHaveAttribute('aria-expanded', 'false');
    expect(gatilho).toHaveFocus();
  });

  it('clicar fora fecha', async () => {
    const { gatilho } = montar();
    await userEvent.click(gatilho);
    await userEvent.click(screen.getByText('fora'));

    expect(gatilho).toHaveAttribute('aria-expanded', 'false');
  });

  it('com ícone, o nome acessível carrega a contagem; vazio e rodapé aparecem', async () => {
    const abrirCentral = vi.fn();
    render(
      <MenuSuspenso
        rotulo="Notificações"
        icone={<svg aria-hidden="true" />}
        contagem={3}
        itens={[]}
        vazio="Nenhum alerta no momento."
        rodape={{ rotulo: 'Abrir central de avisos', aoEscolher: abrirCentral }}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Notificações: 3 não lidos' }));
    expect(screen.getByText('Nenhum alerta no momento.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Abrir central de avisos' }));
    expect(abrirCentral).toHaveBeenCalledOnce();
  });
});
