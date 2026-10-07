/**
 * Quanto o endereço do conteúdo vive depois do clique. Safari e Firefox começam a ler o blob só
 * depois que o clique volta; revogar na mesma volta pode salvar um arquivo vazio ou falhar. É a
 * espera do FileSaver.
 */
export const ESPERA_PARA_REVOGAR_MS = 40_000;

/**
 * Salva o conteúdo com o nome dado, pela janela de download do navegador. A âncora entra no
 * documento só pelo clique: fora dele, o Firefox ignora o `download`.
 */
export function salvarArquivo(conteudo: Blob, nome: string): void {
  const endereco = URL.createObjectURL(conteudo);
  const ancora = document.createElement('a');
  ancora.href = endereco;
  ancora.download = nome;
  ancora.hidden = true;
  document.body.append(ancora);
  ancora.click();
  ancora.remove();
  setTimeout(() => URL.revokeObjectURL(endereco), ESPERA_PARA_REVOGAR_MS);
}
