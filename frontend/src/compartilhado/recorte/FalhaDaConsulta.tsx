import { Botao } from '@/design-system/primitivos/Botao';
import { Texto } from '@/design-system/primitivos/Texto';

import { lerFalhaDaConsulta } from './leituraDaFalha';

interface FalhaDaConsultaProps {
  falha: unknown;
  /** A frase para a falha do servidor ou da rede: "Não foi possível carregar os aportes." */
  generica: string;
  aoTentarDeNovo: () => void;
  /** Para a recusa do recorte: repetir dá no mesmo, voltar ao recorte padrão resolve. */
  aoLimpar?: () => void;
}

/**
 * O miolo do recado de erro de uma grade: a mensagem e a ação que pode resolver. Quem o usa põe em
 * volta o próprio `role="alert"`, com o espaçamento da grade.
 */
export function FalhaDaConsulta({
  falha,
  generica,
  aoTentarDeNovo,
  aoLimpar,
}: FalhaDaConsultaProps) {
  const { mensagem, repetivel } = lerFalhaDaConsulta(falha, generica);
  const acao = repetivel
    ? { rotulo: 'Tentar de novo', aoClicar: aoTentarDeNovo }
    : aoLimpar && { rotulo: 'Limpar filtros', aoClicar: aoLimpar };

  return (
    <>
      <Texto variante="corpo" como="p">
        {mensagem}
      </Texto>
      {acao ? (
        <Botao variante="secundario" tamanho="pequeno" aoClicar={acao.aoClicar}>
          {acao.rotulo}
        </Botao>
      ) : null}
    </>
  );
}
