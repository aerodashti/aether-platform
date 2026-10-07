import { percentualEmTexto } from '@/compartilhado/formatacao/percentual';
import { Botao } from '@/design-system/primitivos/Botao';
import { Texto } from '@/design-system/primitivos/Texto';

import estilos from './SecaoDeContrato.module.css';

interface FaixaDaSomaProps {
  soma: number;
  /** O erro da soma depois da tentativa, ou o que salvar vai fazer. */
  frase: string;
  tom: 'critico' | 'positivo' | 'atencao';
  aoDividir: () => void;
}

/** A soma da edição, a frase que a explica e o atalho de dividir igualmente. */
export function FaixaDaSoma({ soma, frase, tom, aoDividir }: FaixaDaSomaProps) {
  return (
    <div className={estilos.faixaDaSoma}>
      <span className={estilos.somaRotulo}>Soma</span>
      <Texto variante="corpo" tom={tom} como="span">
        <strong>Σ {percentualEmTexto(soma)}</strong>
      </Texto>
      <span className={estilos.somaTexto} role="status">
        <Texto variante="apoio" tom={tom} como="span">
          {frase}
        </Texto>
      </span>
      <Botao variante="contorno" tamanho="medio" aoClicar={aoDividir}>
        Dividir igualmente
      </Botao>
    </div>
  );
}
