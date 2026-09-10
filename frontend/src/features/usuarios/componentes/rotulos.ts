import type { PapelDoUsuario } from '@/compartilhado/sessao/sessao';

import type { SituacaoDoUsuario } from '../api/useUsuarios';

/**
 * A tradução de enum para texto de interface mora aqui, e não no servidor: "Convite pendente" é
 * redação de tela, e amarrar a API a ela obrigaria a uma versão de endpoint para trocar uma
 * palavra. Ver `docs/glossario.md` para a forma canônica de cada termo.
 */
export const ROTULO_DO_PAPEL: Record<PapelDoUsuario, string> = {
  ADMINISTRADOR: 'Administrador',
  GESTOR: 'Gestor',
  PROPRIETARIO: 'Proprietário',
  PILOTO: 'Piloto',
};

export const PAPEIS = Object.keys(ROTULO_DO_PAPEL) as PapelDoUsuario[];

export const OPCOES_DE_PAPEL = [
  { valor: '', rotulo: 'Todos os papéis' },
  ...PAPEIS.map((papel) => ({ valor: papel, rotulo: ROTULO_DO_PAPEL[papel] })),
];

export const OPCOES_DE_SITUACAO: Array<{ valor: SituacaoDoUsuario | ''; rotulo: string }> = [
  { valor: '', rotulo: 'Todas as situações' },
  { valor: 'ATIVO', rotulo: 'Ativos' },
  { valor: 'PENDENTE', rotulo: 'Pendentes' },
  { valor: 'INATIVO', rotulo: 'Inativos' },
];

/** ATIVO não vira etiqueta: o normal não precisa de rótulo, só a exceção precisa. */
export const ROTULO_DA_SITUACAO: Partial<Record<SituacaoDoUsuario, string>> = {
  PENDENTE: 'Convite pendente',
  INATIVO: 'Inativo',
};

const DATA_CURTA = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: '2-digit',
});

const DATA_COMPLETA = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'long',
  timeStyle: 'short',
});

/** Quem nunca entrou não tem último acesso — travessão, não "há 0 dias". */
export function ultimoAcessoCurto(instante: string | undefined): string {
  return instante ? DATA_CURTA.format(new Date(instante)) : '—';
}

export function ultimoAcessoCompleto(instante: string | undefined): string {
  return instante ? DATA_COMPLETA.format(new Date(instante)) : 'Nunca entrou';
}

/**
 * Iniciais do avatar: primeiro e último nome. "Maria da Silva" vira MS, não MD — a partícula não
 * identifica ninguém.
 */
export function iniciais(nome: string | undefined): string {
  const partes = (nome ?? '').trim().split(/\s+/).filter(Boolean);
  const primeira = partes.at(0)?.charAt(0) ?? '';
  const ultima = partes.length > 1 ? (partes.at(-1)?.charAt(0) ?? '') : '';
  return (primeira + ultima).toUpperCase();
}
