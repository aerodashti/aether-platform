import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { SeletorDeCor } from './SeletorDeCor';

describe('SeletorDeCor', () => {
  it('é um radiogroup com uma amostra nomeada por cor', () => {
    render(<SeletorDeCor rotulo="Cor de identificação" valor="PETROLEO" aoEscolher={() => {}} />);

    const grupo = screen.getByRole('radiogroup', { name: 'Cor de identificação' });
    expect(grupo).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Petróleo' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Âmbar' })).not.toBeChecked();
  });

  it('entrega o valor da cor escolhida', async () => {
    const escolher = vi.fn();
    render(<SeletorDeCor rotulo="Cor de identificação" valor="PETROLEO" aoEscolher={escolher} />);

    await userEvent.click(screen.getByRole('radio', { name: 'Verde' }));

    expect(escolher).toHaveBeenCalledWith('VERDE');
  });
});
