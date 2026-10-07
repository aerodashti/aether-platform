import { describe, expect, it } from 'vitest';

import { CHAVE_DOS_AVISOS } from '@/compartilhado/avisos/useAvisos';

import { criarClienteDeConsultas } from './clienteDeConsultas';

describe('criarClienteDeConsultas', () => {
  it('qualquer escrita bem-sucedida invalida os avisos: eles derivam do estado da frota', async () => {
    const cliente = criarClienteDeConsultas();
    cliente.setQueryData(CHAVE_DOS_AVISOS, { avisos: [] });

    await cliente
      .getMutationCache()
      .build(cliente, { mutationFn: () => Promise.resolve('salvo') })
      .execute(undefined);

    expect(cliente.getQueryState(CHAVE_DOS_AVISOS)?.isInvalidated).toBe(true);
  });

  it('uma escrita que falhou não muda nada', async () => {
    const cliente = criarClienteDeConsultas();
    cliente.setQueryData(CHAVE_DOS_AVISOS, { avisos: [] });

    await cliente
      .getMutationCache()
      .build(cliente, { mutationFn: () => Promise.reject(new Error('recusado')) })
      .execute(undefined)
      .catch(() => undefined);

    expect(cliente.getQueryState(CHAVE_DOS_AVISOS)?.isInvalidated).toBe(false);
  });
});
