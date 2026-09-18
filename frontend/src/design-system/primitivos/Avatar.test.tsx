import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Avatar, iniciaisDe } from './Avatar';

describe('Avatar', () => {
  it('tira a primeira letra do primeiro e do último nome', () => {
    expect(iniciaisDe('Leonardo Andrade')).toBe('LA');
    expect(iniciaisDe('Vetor Participações Ltda')).toBe('VL');
    expect(iniciaisDe('Vetor')).toBe('V');
    expect(iniciaisDe(undefined)).toBe('');
  });

  it('é decorativo: o nome ao lado é quem informa', () => {
    const { container } = render(<Avatar nome="Helena Sarraf" />);
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
    expect(container.firstChild).toHaveTextContent('HS');
  });
});
