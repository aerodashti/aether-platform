import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { CampoDeTexto } from '@/design-system/primitivos/CampoDeTexto';

import { Formulario } from './Formulario';

describe('Formulario', () => {
  it('Enter num campo envia, sem recarregar a página', async () => {
    const aoEnviar = vi.fn();
    render(
      <Formulario referencia={createRef()} aoEnviar={aoEnviar} rotulo="Registrar custo">
        <CampoDeTexto rotulo="Descrição" valor="" aoMudar={() => {}} />
      </Formulario>,
    );

    await userEvent.type(screen.getByLabelText('Descrição'), '{Enter}');

    expect(aoEnviar).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('form', { name: 'Registrar custo' })).toHaveAttribute('novalidate');
  });
});
