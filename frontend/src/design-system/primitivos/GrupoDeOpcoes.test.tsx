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
});
