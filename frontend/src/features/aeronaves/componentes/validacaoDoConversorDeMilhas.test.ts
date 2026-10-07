import { describe, expect, it } from 'vitest';

import { kmDasMilhas, validarConversorDeMilhas } from './validacaoDoConversorDeMilhas';

describe('validarConversorDeMilhas', () => {
  it('pede as milhas e recusa negativo, texto e o que não cabe no campo de km', () => {
    expect(validarConversorDeMilhas('').milhas).toBe('Informe as milhas náuticas.');
    expect(validarConversorDeMilhas('-5').milhas).toBe('O mínimo é 0.');
    expect(validarConversorDeMilhas('abc').milhas).toBe(
      'Use só números, com vírgula para as casas decimais.',
    );
    expect(validarConversorDeMilhas('60.000.000.000').milhas).toMatch(/^O máximo é /);
    expect(validarConversorDeMilhas('432.000').milhas).toBeUndefined();
  });
});

describe('kmDasMilhas', () => {
  it('converte no formato brasileiro, com a casa decimal do campo de km', () => {
    expect(kmDasMilhas('1.000')).toBe(1852);
    expect(kmDasMilhas('1')).toBe(1.9);
    expect(kmDasMilhas('0,5')).toBe(0.9);
    expect(kmDasMilhas('-5')).toBeNull();
    expect(kmDasMilhas('')).toBeNull();
  });
});
