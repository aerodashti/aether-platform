/** "14.800,00", "-2,5", "1.234.567": vírgula decimal, ponto de milhar em grupos de três. */
const FORMATO_BRASILEIRO = /^-?\d{1,3}(?:\.\d{3})*(?:,\d+)?$|^-?\d+(?:,\d+)?$/;

/** "4.9223", "1.5": ponto decimal, como vem do teclado americano ou de uma cópia de planilha. */
const FORMATO_COM_PONTO_DECIMAL = /^-?\d+\.\d+$/;

/**
 * O número como se digita no Brasil, ou `null` se o texto não é um número.
 *
 * <p>A vírgula é sempre decimal. O ponto é milhar quando separa grupos de exatamente três dígitos
 * ("25.000" é vinte e cinco mil, "1.234.567,8" também é lido) e decimal nos demais casos ("4.9223",
 * "1.5") — é a leitura de quem escreve em português, e os limites de cada campo pegam o caso raro
 * de quem quis dizer "1,500" escrevendo "1.500". "R$" e espaços são ignorados; notação científica,
 * hexadecimal e texto são recusados, em vez de virarem 1000, 26 ou `NaN` silenciosamente.
 *
 * <p>Vazio também é `null`: quem decide se o campo é obrigatório é a regra do formulário.
 */
export function lerNumero(texto: string): number | null {
  const limpo = texto.replace(/\s|R\$/g, '');
  if (FORMATO_BRASILEIRO.test(limpo)) {
    return Number(limpo.replace(/\./g, '').replace(',', '.'));
  }
  if (FORMATO_COM_PONTO_DECIMAL.test(limpo)) {
    return Number(limpo);
  }
  return null;
}

/** Quantas casas decimais o texto traz, na mesma leitura de {@link lerNumero}. */
export function casasDecimais(texto: string): number {
  const valor = lerNumero(texto);
  if (valor === null || Number.isInteger(valor)) {
    return 0;
  }
  return String(valor).split('.')[1]?.length ?? 0;
}

/** O número de volta para o campo, com vírgula e sem separador de milhar: "14800,5". */
export function numeroParaCampo(valor: number | null | undefined): string {
  return valor == null ? '' : String(valor).replace('.', ',');
}
