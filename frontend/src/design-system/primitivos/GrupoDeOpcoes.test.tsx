import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { GrupoDeOpcoes } from './GrupoDeOpcoes';

const OPCOES = [
  { valor: 'MENSAL', rotulo: 'Mensal' },
  { valor: 'PERIODO', rotulo: 'Período' },
];

describe('GrupoDeOpcoes', () => {
  it.each(['cartoes', 'segmentado', 'trilho'] as const)(
    'na variante %s continua um radiogroup que anuncia a escolhida',
    async (variante) => {
      const aoEscolher = vi.fn();
      render(
        <GrupoDeOpcoes
          rotulo="Recorte"
          valor="MENSAL"
          opcoes={OPCOES}
          aoEscolher={aoEscolher}
          variante={variante}
        />,
      );

      expect(screen.getByRole('radiogroup', { name: 'Recorte' })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: 'Mensal' })).toHaveAttribute('aria-checked', 'true');
      await userEvent.click(screen.getByRole('radio', { name: 'Período' }));
      expect(aoEscolher).toHaveBeenCalledWith('PERIODO');
    },
  );

  it('é uma parada só de Tab, e as setas mudam a escolha junto com o foco', async () => {
    const aoEscolher = vi.fn();
    render(
      <GrupoDeOpcoes rotulo="Recorte" valor="MENSAL" opcoes={OPCOES} aoEscolher={aoEscolher} />,
    );

    await userEvent.tab();
    expect(screen.getByRole('radio', { name: 'Mensal' })).toHaveFocus();
    expect(screen.getByRole('radio', { name: 'Período' })).toHaveAttribute('tabindex', '-1');

    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: 'Período' })).toHaveFocus();
    expect(aoEscolher).toHaveBeenLastCalledWith('PERIODO');

    await userEvent.keyboard('{ArrowRight}');
    expect(aoEscolher).toHaveBeenLastCalledWith('MENSAL');
  });

  it('mostra a legenda, e liga obrigatório, apoio e erro ao grupo', () => {
    render(
      <GrupoDeOpcoes
        rotulo="Moeda"
        valor=""
        opcoes={OPCOES}
        aoEscolher={() => {}}
        obrigatorio
        apoio="Em USD, informe o câmbio."
        erro="Escolha a moeda."
      />,
    );

    const grupo = screen.getByRole('radiogroup', { name: 'Moeda' });
    expect(screen.getByText('Moeda')).toBeVisible();
    expect(grupo).toHaveAttribute('aria-required', 'true');
    expect(grupo).toHaveAttribute('aria-invalid', 'true');
    expect(grupo).toHaveAccessibleDescription('Escolha a moeda. Em USD, informe o câmbio.');
  });
});
