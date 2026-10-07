import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { IncluirProprietario } from './IncluirProprietario';

const CANDIDATOS = [
  { id: 3, nome: 'Helena Sarraf' },
  { id: 5, nome: 'Marina Costa' },
];

function montar() {
  const aoIncluir = vi.fn();
  render(
    <IncluirProprietario
      rotulo="Incluir proprietário na PS-MEP"
      rotuloDoBotao="Incluir na PS-MEP"
      candidatos={CANDIDATOS}
      aoIncluir={aoIncluir}
    />,
  );
  return aoIncluir;
}

describe('IncluirProprietario', () => {
  it('percorrer a lista não inclui ninguém: só o botão inclui', async () => {
    const aoIncluir = montar();

    await userEvent.selectOptions(screen.getByLabelText('Incluir proprietário na PS-MEP'), '5');
    expect(aoIncluir).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Incluir na PS-MEP' }));
    expect(aoIncluir).toHaveBeenCalledWith(5);
    expect(screen.getByLabelText('Incluir proprietário na PS-MEP')).toHaveValue('');
  });

  it('incluir sem escolher acusa na escolha e leva o foco a ela', async () => {
    const aoIncluir = montar();

    await userEvent.click(screen.getByRole('button', { name: 'Incluir na PS-MEP' }));

    const escolha = screen.getByLabelText('Incluir proprietário na PS-MEP');
    expect(aoIncluir).not.toHaveBeenCalled();
    expect(escolha).toHaveFocus();
    expect(escolha).toHaveAccessibleDescription('Escolha quem incluir.');
  });
});
