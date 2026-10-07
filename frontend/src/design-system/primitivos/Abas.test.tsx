import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Abas } from './Abas';

describe('Abas', () => {
  it('é uma lista de abas com a ativa marcada e a contagem ao lado', async () => {
    const escolher = vi.fn();
    render(
      <Abas
        rotulo="Seções"
        abas={[
          { valor: 'agenda', rotulo: 'Agenda', contagem: 2 },
          { valor: 'historico', rotulo: 'Histórico' },
        ]}
        valor="agenda"
        aoEscolher={escolher}
      />,
    );

    expect(screen.getByRole('tablist', { name: 'Seções' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^Agenda/ })).toHaveAttribute('aria-selected', 'true');
    await userEvent.click(screen.getByRole('tab', { name: 'Histórico' }));
    expect(escolher).toHaveBeenCalledWith('historico');
  });

  it.each(['trilho', 'contorno', 'fichas'] as const)(
    'na variante %s continua um tablist com a aba ativa marcada',
    (variante) => {
      render(
        <Abas
          rotulo="Situação das trocas"
          valor="PENDENTE"
          abas={[
            { valor: 'PENDENTE', rotulo: 'Pendentes', contagem: 2 },
            { valor: 'CONCLUIDA', rotulo: 'Realizadas', contagem: 1 },
          ]}
          aoEscolher={() => {}}
          variante={variante}
        />,
      );

      expect(screen.getByRole('tablist', { name: 'Situação das trocas' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Pendentes/ })).toHaveAttribute(
        'aria-selected',
        'true',
      );
    },
  );
});
