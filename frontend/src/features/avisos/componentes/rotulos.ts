import type { CategoriaDoAviso } from '@/compartilhado/avisos/useAvisos';

export const CATEGORIAS: Record<CategoriaDoAviso, string> = {
  DOCUMENTOS: 'Seguros e certificados',
  MANUTENCAO: 'Manutenção',
  TRIPULACAO: 'Tripulação',
  FUNDOS: 'Fundos e aportes',
};

const DATA = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

export function dataEmTexto(iso: string | undefined): string {
  return iso ? DATA.format(new Date(`${iso}T00:00:00`)) : '';
}
