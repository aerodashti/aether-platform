import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Texto } from './Texto';

describe('Texto', () => {
  it('usa h1 na variante título e p no corpo', () => {
    render(
      <>
        <Texto variante="titulo">Saúde do Aether</Texto>
        <Texto>Um parágrafo</Texto>
      </>,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Saúde do Aether' })).toBeInTheDocument();
    expect(screen.getByText('Um parágrafo').tagName).toBe('P');
  });

  it('troca o elemento sem mudar a variante', () => {
    render(
      <Texto variante="titulo" como="span">
        Título em span
      </Texto>,
    );

    expect(screen.getByText('Título em span').tagName).toBe('SPAN');
  });
});
