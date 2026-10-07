import type { Erros } from '@/compartilhado/formulario/useValidacao';

/**
 * Os limites do servidor: `DocumentoService.ARQUIVOS_POR_ENVIO`, `Documento.TAMANHO_MAXIMO` e o
 * `max-request-size` do multipart.
 */
export const ARQUIVOS_POR_ENVIO = 10;
export const MEGABYTES_POR_ARQUIVO = 20;
export const MEGABYTES_POR_ENVIO = 100;

const MEGABYTE = 1024 * 1024;
/**
 * O `max-request-size` conta o corpo multipart inteiro, com cabeçalhos e separadores de cada
 * parte; a soma dos arquivos fica 1 MB abaixo para a escolha que passa aqui passar lá.
 */
const BYTES_POR_ENVIO = (MEGABYTES_POR_ENVIO - 1) * MEGABYTE;

function primeiroProblema(arquivos: File[]): string | undefined {
  if (arquivos.length > ARQUIVOS_POR_ENVIO) {
    return `Envie até ${ARQUIVOS_POR_ENVIO} arquivos por vez; foram escolhidos ${arquivos.length}.`;
  }
  const vazio = arquivos.find((arquivo) => arquivo.size === 0);
  if (vazio) {
    return `O arquivo "${vazio.name}" está vazio.`;
  }
  const grande = arquivos.find((arquivo) => arquivo.size > MEGABYTES_POR_ARQUIVO * MEGABYTE);
  if (grande) {
    return `O arquivo "${grande.name}" passa de ${MEGABYTES_POR_ARQUIVO} MB.`;
  }
  const total = arquivos.reduce((soma, arquivo) => soma + arquivo.size, 0);
  if (total > BYTES_POR_ENVIO) {
    return `Juntos, os arquivos não cabem num envio de até ${MEGABYTES_POR_ENVIO} MB: envie em partes.`;
  }
  return undefined;
}

/**
 * A escolha de arquivos, conferida antes de subir. O servidor confere de novo; aqui é para não
 * descobrir só depois de mandar 100 MB que o 11.º arquivo não cabia.
 */
export function validarEnvio(arquivos: File[]): Erros<'arquivos'> {
  return { arquivos: primeiroProblema(arquivos) };
}
