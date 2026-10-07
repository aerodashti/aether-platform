import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ESPERA_PARA_REVOGAR_MS, salvarArquivo } from './salvarArquivo';

describe('salvarArquivo', () => {
  const revogar = vi.fn();
  let clicada: { href: string; download: string; noDocumento: boolean } | undefined;

  beforeEach(() => {
    vi.useFakeTimers();
    Object.assign(URL, { createObjectURL: () => 'blob:laudo', revokeObjectURL: revogar });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicada = { href: this.href, download: this.download, noDocumento: this.isConnected };
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    revogar.mockReset();
    clicada = undefined;
  });

  it('clica numa âncora presa ao documento, com o nome dado, e não a deixa para trás', () => {
    salvarArquivo(new Blob(['%PDF-1.7']), 'Laudo.pdf');

    expect(clicada).toEqual({ href: 'blob:laudo', download: 'Laudo.pdf', noDocumento: true });
    expect(document.querySelector('a')).toBeNull();
  });

  it('só revoga o endereço depois que o navegador teve tempo de ler o conteúdo', () => {
    salvarArquivo(new Blob(['%PDF-1.7']), 'Laudo.pdf');

    expect(revogar).not.toHaveBeenCalled();
    vi.advanceTimersByTime(ESPERA_PARA_REVOGAR_MS);
    expect(revogar).toHaveBeenCalledWith('blob:laudo');
  });
});
