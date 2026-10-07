import { describe, expect, it } from 'vitest';

import { validarEnvio } from './validarEnvio';

function arquivo(nome: string, megabytes: number) {
  const falso = new File(['x'], nome);
  Object.defineProperty(falso, 'size', { value: Math.round(megabytes * 1024 * 1024) });
  return falso;
}

describe('validarEnvio', () => {
  it('aceita até dez arquivos dentro dos limites', () => {
    const dez = Array.from({ length: 10 }, (_, n) => arquivo(`${n}.pdf`, 1));

    expect(validarEnvio(dez).arquivos).toBeUndefined();
  });

  it('recusa o 11.º arquivo dizendo o limite', () => {
    const onze = Array.from({ length: 11 }, (_, n) => arquivo(`${n}.pdf`, 1));

    expect(validarEnvio(onze).arquivos).toBe('Envie até 10 arquivos por vez; foram escolhidos 11.');
  });

  it('recusa o vazio, o de mais de 20 MB e a soma acima de 100 MB', () => {
    expect(validarEnvio([arquivo('vazio.pdf', 0)]).arquivos).toBe(
      'O arquivo "vazio.pdf" está vazio.',
    );
    expect(validarEnvio([arquivo('scan.pdf', 21)]).arquivos).toBe(
      'O arquivo "scan.pdf" passa de 20 MB.',
    );
    const seis = Array.from({ length: 6 }, (_, n) => arquivo(`${n}.pdf`, 19));
    expect(validarEnvio(seis).arquivos).toBe(
      'Juntos, os arquivos não cabem num envio de até 100 MB: envie em partes.',
    );
  });

  it('deixa 1 MB da soma para os cabeçalhos do envio', () => {
    const quase = (megabytes: number) =>
      validarEnvio([
        ...Array.from({ length: 4 }, (_, n) => arquivo(`${n}.pdf`, 20)),
        arquivo('x.pdf', megabytes),
      ]);

    expect(quase(19).arquivos).toBeUndefined();
    expect(quase(19.5).arquivos).toBe(
      'Juntos, os arquivos não cabem num envio de até 100 MB: envie em partes.',
    );
  });
});
