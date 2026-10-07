import { juntarClasses } from '@/design-system/classes';

import { MolduraDeCampo } from './MolduraDeCampo';
import estilos from './SeletorDeCor.module.css';
import { useGrupoDeRadio } from './useGrupoDeRadio';

/**
 * A paleta fechada de cores de identificação, na ordem em que a tela as oferece.
 *
 * <p>Os valores casam com o enum `CorDeIdentificacao` do backend de propósito: o servidor guarda o
 * nome, e só este arquivo sabe que cor cada nome tem — inclusive a variante de tema escuro, que
 * vem dos tokens.
 */
export const CORES_DE_IDENTIFICACAO = [
  { valor: 'PETROLEO', rotulo: 'Petróleo' },
  { valor: 'AZUL', rotulo: 'Azul' },
  { valor: 'CELESTE', rotulo: 'Celeste' },
  { valor: 'VERDE', rotulo: 'Verde' },
  { valor: 'AMBAR', rotulo: 'Âmbar' },
  { valor: 'CINZA', rotulo: 'Cinza' },
] as const;

export type CorDeIdentificacao = (typeof CORES_DE_IDENTIFICACAO)[number]['valor'];

/** A classe CSS de cada cor, usada pelo seletor e por quem pinta o ponto nas grades. */
export const CLASSE_DA_COR: Record<CorDeIdentificacao, string | undefined> = {
  PETROLEO: estilos.petroleo,
  AZUL: estilos.azul,
  CELESTE: estilos.celeste,
  VERDE: estilos.verde,
  AMBAR: estilos.ambar,
  CINZA: estilos.cinza,
};

interface SeletorDeCorProps {
  rotulo: string;
  valor: CorDeIdentificacao;
  aoEscolher: (valor: CorDeIdentificacao) => void;
  /** Para que serve a cor — ligado ao grupo, e não um parágrafo solto ao lado. */
  apoio?: string;
  erro?: string;
}

const VALORES_DAS_CORES = CORES_DE_IDENTIFICACAO.map((cor) => cor.valor);

/**
 * Escolha única de cor de identificação, todas as amostras à vista.
 *
 * <p>Como o `GrupoDeOpcoes`, é `radiogroup` de verdade: cada amostra declara `role="radio"` e
 * `aria-checked`, e o nome acessível é o nome da cor — a amostra sozinha não diz nada a quem não
 * a vê.
 */
export function SeletorDeCor({ rotulo, valor, aoEscolher, apoio, erro }: SeletorDeCorProps) {
  const atributosDaOpcao = useGrupoDeRadio(VALORES_DAS_CORES, valor, aoEscolher);

  return (
    <MolduraDeCampo como="grupo" rotulo={rotulo} apoio={apoio} erro={erro}>
      {(atributos) => (
        <div {...atributos} className={estilos.grupo} role="radiogroup">
          {CORES_DE_IDENTIFICACAO.map((cor, indice) => (
            <button
              key={cor.valor}
              {...atributosDaOpcao(indice)}
              type="button"
              role="radio"
              aria-checked={cor.valor === valor}
              aria-label={cor.rotulo}
              title={cor.rotulo}
              className={juntarClasses(
                estilos.amostra,
                CLASSE_DA_COR[cor.valor],
                cor.valor === valor && estilos.escolhida,
              )}
              onClick={() => aoEscolher(cor.valor)}
            />
          ))}
        </div>
      )}
    </MolduraDeCampo>
  );
}

/**
 * O ponto de identificação que acompanha o nome do proprietário nas grades. Decorativo por
 * definição — o nome está sempre ao lado —, por isso `aria-hidden`.
 */
export function PontoDeCor({ cor }: { cor: CorDeIdentificacao }) {
  return <span className={juntarClasses(estilos.ponto, CLASSE_DA_COR[cor])} aria-hidden="true" />;
}
