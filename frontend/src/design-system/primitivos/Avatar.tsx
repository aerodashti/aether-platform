import { juntarClasses } from '@/design-system/classes';

import estilos from './Avatar.module.css';

interface AvatarProps {
  /** O nome de quem o avatar representa; as iniciais saem dele. */
  nome: string | undefined;
  /** `medio` é o da barra do topo (36px); `grande` é o do cartão (42px). */
  tamanho?: 'medio' | 'grande';
  /** `escuro` é o fundo petróleo da barra do topo; `suave` é o cinza dos cartões. */
  tom?: 'escuro' | 'suave';
}

/** Duas letras para o avatar: "Leonardo Andrade" vira "LA"; "Vetor" vira "V". */
export function iniciaisDe(nome: string | undefined): string {
  const partes = (nome ?? '').trim().split(/\s+/).filter(Boolean);
  const primeira = partes[0]?.[0] ?? '';
  const ultima = partes.length > 1 ? (partes[partes.length - 1]?.[0] ?? '') : '';
  return (primeira + ultima).toUpperCase();
}

/**
 * Círculo de iniciais. É um dos poucos círculos completos do produto — o protótipo o usa na barra
 * do topo e no cartão de proprietário. Decorativo: o nome ao lado é quem informa, então o avatar
 * fica escondido do leitor de tela.
 */
export function Avatar({ nome, tamanho = 'medio', tom = 'suave' }: AvatarProps) {
  return (
    <span
      className={juntarClasses(estilos.avatar, estilos[tamanho], estilos[tom])}
      aria-hidden="true"
    >
      {iniciaisDe(nome)}
    </span>
  );
}
