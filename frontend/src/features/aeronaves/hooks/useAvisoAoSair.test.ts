import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useAvisoAoSair } from './useAvisoAoSair';

function sair(): boolean {
  const evento = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(evento);
  return evento.defaultPrevented;
}

describe('useAvisoAoSair', () => {
  it('pede confirmação ao fechar só enquanto há o que perder', () => {
    const { rerender, unmount } = renderHook(({ ativo }) => useAvisoAoSair(ativo), {
      initialProps: { ativo: false },
    });
    expect(sair()).toBe(false);

    rerender({ ativo: true });
    expect(sair()).toBe(true);

    unmount();
    expect(sair()).toBe(false);
  });
});
