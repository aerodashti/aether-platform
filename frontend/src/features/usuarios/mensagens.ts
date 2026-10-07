import type { SituacaoDoUsuario } from './api/useUsuarios';

/**
 * Como terminou uma ação sobre um usuário. Mora fora de `componentes/` e de `hooks/` porque os
 * dois a usam: o hook das ações anuncia, a faixa mostra.
 */
export interface Retorno {
  tom: 'positivo' | 'critico';
  mensagem: string;
}

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
