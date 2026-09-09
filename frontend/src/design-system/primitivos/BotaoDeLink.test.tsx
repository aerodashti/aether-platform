import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { BotaoDeLink } from './BotaoDeLink';

describe('BotaoDeLink', () => {
  it('é anunciado como botão, não como link — ele não navega', () => {
    render(<BotaoDeLink aoClicar={() => {}}>Esqueci minha senha</BotaoDeLink>);

    expect(screen.getByRole('button', { name: 'Esqueci minha senha' })).toBeInTheDocument();
  });

  it('aciona no clique', async () => {
    const aoClicar = vi.fn();
    render(<BotaoDeLink aoClicar={aoClicar}>Reenviar código</BotaoDeLink>);

    await userEvent.click(screen.getByRole('button', { name: 'Reenviar código' }));

    expect(aoClicar).toHaveBeenCalledOnce();
  });

  it('responde ao teclado, que é o motivo de ser um button', async () => {
    const aoClicar = vi.fn();
    render(<BotaoDeLink aoClicar={aoClicar}>Voltar</BotaoDeLink>);

    await userEvent.tab();
    await userEvent.keyboard(' ');

    expect(aoClicar).toHaveBeenCalledOnce();
  });

  it('não aciona quando desabilitado', async () => {
    const aoClicar = vi.fn();
    render(
      <BotaoDeLink aoClicar={aoClicar} desabilitado>
        Reenviar código
      </BotaoDeLink>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Reenviar código' }));

    expect(aoClicar).not.toHaveBeenCalled();
  });
});
