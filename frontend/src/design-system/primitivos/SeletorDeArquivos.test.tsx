import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { SeletorDeArquivos } from './SeletorDeArquivos';

describe('SeletorDeArquivos', () => {
  it('entrega os arquivos escolhidos e limpa o campo para a próxima escolha', async () => {
    const aoEscolher = vi.fn();
    render(<SeletorDeArquivos rotulo="+ Adicionar documentos" aoEscolher={aoEscolher} multiplo />);

    const entrada = screen.getByLabelText('+ Adicionar documentos') as HTMLInputElement;
    const pdf = new File(['%PDF'], 'CVA.pdf', { type: 'application/pdf' });
    await userEvent.upload(entrada, [pdf]);

    expect(aoEscolher).toHaveBeenCalledWith([pdf]);
    expect(entrada.value).toBe('');
  });

  it('liga a orientação e a recusa ao controle, e o anuncia inválido', () => {
    render(
      <>
        <p id="limites">Até 20 MB cada.</p>
        <p id="recusa">Envie até 10 arquivos por vez.</p>
        <SeletorDeArquivos
          rotulo="+ Adicionar documentos"
          aoEscolher={vi.fn()}
          descritoPor="recusa limites"
          invalido
        />
      </>,
    );

    const entrada = screen.getByLabelText('+ Adicionar documentos');
    expect(entrada).toHaveAccessibleDescription('Envie até 10 arquivos por vez. Até 20 MB cada.');
    expect(entrada).toBeInvalid();
  });
});
