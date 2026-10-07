import { describe, expect, it, vi } from 'vitest';

import { ErroDeApi } from '@/api/cliente';

import { ehConflito, recomecarNoConflito } from './conflito';

describe('recomecarNoConflito', () => {
  it('num 409, recarrega e só depois recomeça', async () => {
    const ordem: string[] = [];
    const recarregar = vi.fn(() => {
      ordem.push('recarregar');
      return Promise.resolve();
    });

    recomecarNoConflito(new ErroDeApi('Contrato desatualizado', 409, null), recarregar, () =>
      ordem.push('recomecar'),
    );
    await vi.waitFor(() => expect(ordem).toEqual(['recarregar', 'recomecar']));
  });

  it('fora de um 409, deixa o erro no resumo e não recarrega', () => {
    const recarregar = vi.fn(() => Promise.resolve());

    recomecarNoConflito(new ErroDeApi('Dados inválidos', 400, null), recarregar, vi.fn());
    recomecarNoConflito(new Error('rede'), recarregar, vi.fn());

    expect(recarregar).not.toHaveBeenCalled();
    expect(ehConflito(new ErroDeApi('x', 409, null))).toBe(true);
  });
});
