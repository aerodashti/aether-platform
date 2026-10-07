import { normalizarCpfCnpj } from '@/compartilhado/proprietarios/cpfCnpj';

import type { ProprietarioResponse } from '../api/useProprietarios';

/** Sem acento e em minúsculas: "otavio" encontra "Otávio". */
function semAcento(texto: string): string {
  return texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/**
 * Se o proprietário aparece para o que foi digitado na busca: por nome ou e-mail, sem diferença de
 * acento nem de caixa, ou pelo documento com ou sem pontuação — o cartão o mostra pontuado, e quem
 * copia de lá precisa achar a mesma pessoa.
 */
export function correspondeABusca(proprietario: ProprietarioResponse, busca: string): boolean {
  const termo = semAcento(busca.trim());
  if (termo === '') {
    return true;
  }
  const porTexto = [proprietario.nome, proprietario.email].some((campo) =>
    semAcento(campo ?? '').includes(termo),
  );
  const documento = normalizarCpfCnpj(busca);
  const porDocumento = documento !== '' && (proprietario.cpfCnpj ?? '').includes(documento);
  return porTexto || porDocumento;
}
