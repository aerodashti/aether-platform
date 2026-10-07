import { Texto } from '@/design-system/primitivos/Texto';

import estilos from './Grade.module.css';

/**
 * Por que a exclusão de uma linha não aconteceu, sobre a grade. É um `alert` sempre montado: a
 * região viva precisa existir antes do texto para o leitor de tela anunciar a mudança.
 */
export function FalhaDaExclusao({ falha }: { falha: string | null }) {
  return (
    <div className={estilos.falha} role="alert">
      {falha ? (
        <Texto variante="apoio" tom="critico" como="p">
          {falha}
        </Texto>
      ) : null}
    </div>
  );
}
