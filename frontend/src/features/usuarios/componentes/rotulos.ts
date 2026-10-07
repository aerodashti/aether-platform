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

/** O alcance de cada papel, para quem convida saber o que está concedendo (glossário, Acesso). */
export const DESCRICAO_DO_PAPEL: Record<PapelDoUsuario, string> = {
  ADMINISTRADOR: 'Administra usuários e os dados da empresa: convida, desativa e reativa acessos.',
  GESTOR: 'Opera o dia a dia: registra voos, lançamentos e fechamentos.',
  PROPRIETARIO: 'Titular de aeronave: vê o que é seu, sem registrar nem administrar.',
  PILOTO: 'Tripulação: registra voos e consulta a própria escala.',
};

export const PAPEIS = Object.keys(ROTULO_DO_PAPEL) as PapelDoUsuario[];

/** Glossário, Convite; `validade-do-convite` no servidor. */
export const HORAS_DE_VALIDADE_DO_CONVITE = 48;

export function conviteEnviado(email: string | undefined): string {
  return `Convite enviado para ${email ?? 'o e-mail informado'}. O link vale ${HORAS_DE_VALIDADE_DO_CONVITE} horas.`;
}

export function conviteReenviado(email: string | undefined): string {
  return `Convite reenviado para ${email ?? 'o e-mail cadastrado'}. O link anterior deixou de valer; o novo vale ${HORAS_DE_VALIDADE_DO_CONVITE} horas.`;
}

export function acessoDesativado(nome: string | undefined): string {
  return `Acesso de ${nome ?? 'usuário'} desativado. Dá para reativar quando quiser.`;
}

/**
 * Quem nunca concluiu o convite volta a PENDENTE, e o convite dele foi cancelado na desativação:
 * a mensagem diz o próximo passo.
 */
export function acessoReativado(
  nome: string | undefined,
  situacao: SituacaoDoUsuario | undefined,
): string {
  const reativado = `Acesso de ${nome ?? 'usuário'} reativado.`;
  return situacao === 'PENDENTE'
    ? `${reativado} O convite anterior foi cancelado na desativação: use Reenviar para mandar outro.`
    : reativado;
}

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
