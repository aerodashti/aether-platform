import type { SituacaoDoProprietario } from '../api/useProprietarios';

export const OPCOES_DE_SITUACAO: Array<{ valor: SituacaoDoProprietario | ''; rotulo: string }> = [
  { valor: '', rotulo: 'Todas as situações' },
  { valor: 'ATIVO', rotulo: 'Ativos' },
  { valor: 'INATIVO', rotulo: 'Inativos' },
];

/**
 * O documento chega do servidor só com dígitos; a pontuação é redação de tela. Comprimento
 * inesperado sai como veio — mascarar errado é pior que não mascarar.
 */
export function formatarCpfCnpj(cpfCnpj: string | undefined): string {
  if (!cpfCnpj) {
    return '—';
  }
  if (cpfCnpj.length === 11) {
    return cpfCnpj.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  if (cpfCnpj.length === 14) {
    return cpfCnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return cpfCnpj;
}

/** E-mail e telefone na mesma linha de apoio, como no protótipo: "a@b.com · +55 11 9…". */
export function linhaDeContato(email: string | undefined, telefone: string | undefined): string {
  return [email, telefone].filter(Boolean).join(' · ');
}
