/**
 * CNPJ com máscara.
 *
 * <p>O servidor guarda só dígitos — máscara é apresentação, e gravá-la faria a mesma empresa ter
 * duas grafias no banco. Valor fora do formato esperado volta como veio, em vez de virar uma
 * máscara errada que parece certa.
 */
export function formatarCnpj(cnpj: string | undefined): string {
  if (!cnpj || !/^\d{14}$/.test(cnpj)) {
    return cnpj ?? '';
  }
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

/** Os degraus que o desenho oferece; qualquer outro valor cai no campo personalizado. */
export const AVISOS_SUGERIDOS = [15, 30, 60, 90];
