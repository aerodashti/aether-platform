/** Junta nomes de classe ignorando os ausentes, sem depender de biblioteca. */
export function juntarClasses(...valores: Array<string | false | undefined>): string {
  return valores.filter(Boolean).join(' ');
}
