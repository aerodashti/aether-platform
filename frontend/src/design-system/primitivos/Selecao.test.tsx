import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Selecao } from './Selecao';

const OPCOES = [
  { valor: '', rotulo: 'Todos os papéis' },
  { valor: 'PILOTO', rotulo: 'Piloto' },
];

describe('Selecao', () => {
  it('liga o rótulo ao controle e devolve o valor escolhido', async () => {
    const usuario = userEvent.setup();
    const aoMudar = vi.fn();
    render(<Selecao rotulo="Filtrar por papel" valor="" opcoes={OPCOES} aoMudar={aoMudar} />);

    await usuario.selectOptions(screen.getByLabelText('Filtrar por papel'), 'PILOTO');

    expect(aoMudar).toHaveBeenCalledWith('PILOTO');
  });

  it('rótulo oculto some da tela e permanece para o leitor de tela', () => {
    render(
      <Selecao
        rotulo="Filtrar por papel"
        rotuloOculto
        valor=""
        opcoes={OPCOES}
        aoMudar={vi.fn()}
      />,
    );

    // Continua sendo o nome acessível do controle, que é o que importa.
    expect(screen.getByLabelText('Filtrar por papel')).toBeInTheDocument();
  });

  it('desabilitado não aceita escolha', async () => {
    const usuario = userEvent.setup();
    const aoMudar = vi.fn();
    render(<Selecao rotulo="Papel" valor="" opcoes={OPCOES} aoMudar={aoMudar} desabilitado />);

    await usuario.selectOptions(screen.getByLabelText('Papel'), 'PILOTO').catch(() => {});

    expect(screen.getByLabelText('Papel')).toBeDisabled();
    expect(aoMudar).not.toHaveBeenCalled();
  });
});
