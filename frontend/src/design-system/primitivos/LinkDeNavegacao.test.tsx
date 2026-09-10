import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { LinkDeNavegacao } from './LinkDeNavegacao';

function montar(rotaAtual: string) {
  return render(
    <MemoryRouter initialEntries={[rotaAtual]}>
      <LinkDeNavegacao para="/" exata>
        Saúde
      </LinkDeNavegacao>
      <LinkDeNavegacao para="/usuarios">Usuários</LinkDeNavegacao>
      <Routes>
        <Route path="*" element={null} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('LinkDeNavegacao', () => {
  it('marca como página corrente só o item da rota ativa', () => {
    montar('/usuarios');

    expect(screen.getByRole('link', { name: 'Usuários' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Saúde' })).not.toHaveAttribute('aria-current');
  });

  it('a rota exata impede que a raiz fique ativa na aplicação inteira', () => {
    montar('/usuarios');

    expect(screen.getByRole('link', { name: 'Saúde' })).not.toHaveAttribute('aria-current');
  });

  it('navega de verdade: é link com endereço, não botão que troca estado', () => {
    montar('/');

    expect(screen.getByRole('link', { name: 'Usuários' })).toHaveAttribute('href', '/usuarios');
  });
});
