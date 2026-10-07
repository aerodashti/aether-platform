import type { SituacaoDoProprietario } from '../api/useProprietarios';

export { percentualEmTexto } from '@/compartilhado/formatacao/percentual';

export const OPCOES_DE_SITUACAO: Array<{ valor: SituacaoDoProprietario | ''; rotulo: string }> = [
  { valor: '', rotulo: 'Todas as situações' },
  { valor: 'ATIVO', rotulo: 'Ativos' },
  { valor: 'INATIVO', rotulo: 'Inativos' },
];

/** E-mail e telefone na mesma linha de apoio, como no protótipo: "a@b.com · +55 11 9…". */
export function linhaDeContato(email: string | undefined, telefone: string | undefined): string {
  return [email, telefone].filter(Boolean).join(' · ');
}
