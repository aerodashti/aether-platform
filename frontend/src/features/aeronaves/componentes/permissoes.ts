import type { PapelDoUsuario } from '@/compartilhado/sessao/sessao';

/**
 * Cadastrar e editar a frota é do administrador e do gestor — a mesma regra da cadeia de
 * autorização do servidor. Aqui ela só poupa a pessoa de preencher o que vai ser recusado.
 */
export function podeGerirFrota(papel: PapelDoUsuario | undefined): boolean {
  return papel === 'ADMINISTRADOR' || papel === 'GESTOR';
}
