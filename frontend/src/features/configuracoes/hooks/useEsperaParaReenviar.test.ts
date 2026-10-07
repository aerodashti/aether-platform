import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useEsperaParaReenviar } from './useEsperaParaReenviar';

describe('useEsperaParaReenviar', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('não espera nada antes do primeiro envio', () => {
    const { result } = renderHook(() => useEsperaParaReenviar(60));

    expect(result.current.restante).toBe(0);
  });

  it('conta os segundos até poder pedir de novo', () => {
    const { result } = renderHook(() => useEsperaParaReenviar(3));

    act(() => result.current.iniciar());
    expect(result.current.restante).toBe(3);

    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.restante).toBe(2);

    act(() => vi.advanceTimersByTime(1000));
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.restante).toBe(0);
  });
});
