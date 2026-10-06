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
});
