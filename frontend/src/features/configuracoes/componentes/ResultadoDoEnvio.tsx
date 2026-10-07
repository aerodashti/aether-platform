import { Texto, type TomDeTexto } from '@/design-system/primitivos/Texto';

export interface Resultado {
  mensagem: string;
  tom: Extract<TomDeTexto, 'positivo' | 'suave'>;
}

/**
 * "Dados salvos." numa região viva sempre montada. O leitor de tela só anuncia o que muda dentro
 * de uma região que já existia: montá-la junto com o texto deixaria o resultado em silêncio.
 */
export function ResultadoDoEnvio({ resultado }: { resultado: Resultado | undefined }) {
  return (
    <div role="status">
      {resultado ? (
        <Texto variante="apoio" tom={resultado.tom} como="p">
          {resultado.mensagem}
        </Texto>
      ) : null}
    </div>
  );
}
