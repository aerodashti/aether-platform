import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { CampoDeTexto } from './CampoDeTexto';

describe('CampoDeTexto', () => {
  it('liga o rótulo ao campo, então a consulta por rótulo acessível encontra a entrada', () => {
    render(<CampoDeTexto rotulo="E-mail" valor="" aoMudar={() => {}} />);

    expect(screen.getByLabelText('E-mail')).toBeInTheDocument();
  });

  it('devolve o que a pessoa digitou', async () => {
    const aoMudar = vi.fn();
    render(<CampoDeTexto rotulo="E-mail" valor="" aoMudar={aoMudar} />);

    await userEvent.type(screen.getByLabelText('E-mail'), 'a');

    expect(aoMudar).toHaveBeenCalledWith('a');
  });

  it('esconde o que é digitado quando o tipo é senha', () => {
    render(<CampoDeTexto rotulo="Senha" tipo="senha" valor="" aoMudar={() => {}} />);

    expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'password');
  });

  it('marca o campo como inválido e associa a mensagem de erro', () => {
    render(
      <CampoDeTexto
        rotulo="E-mail"
        valor="x"
        aoMudar={() => {}}
        erro="Informe um e-mail válido."
      />,
    );

    const entrada = screen.getByLabelText('E-mail');
    expect(entrada).toHaveAttribute('aria-invalid', 'true');
    expect(entrada).toHaveAccessibleDescription('Informe um e-mail válido.');
  });

  it('sem erro, não anuncia invalidez', () => {
    render(<CampoDeTexto rotulo="E-mail" valor="x" aoMudar={() => {}} />);

    expect(screen.getByLabelText('E-mail')).not.toHaveAttribute('aria-invalid');
  });

  it('associa apoio e erro ao mesmo tempo', () => {
    render(
      <CampoDeTexto
        rotulo="Nova senha"
        tipo="senha"
        valor=""
        aoMudar={() => {}}
        apoio="Mínimo de 8 caracteres."
        erro="A confirmação não confere."
      />,
    );

    expect(screen.getByLabelText('Nova senha')).toHaveAccessibleDescription(
      'A confirmação não confere. Mínimo de 8 caracteres.',
    );
  });

  it('não aceita digitação quando desabilitado', () => {
    render(<CampoDeTexto rotulo="E-mail" valor="" aoMudar={() => {}} desabilitado />);

    expect(screen.getByLabelText('E-mail')).toBeDisabled();
  });
});
