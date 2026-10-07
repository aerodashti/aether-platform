import { juntarClasses } from '@/design-system/classes';

import estilos from './GrupoDeOpcoes.module.css';

export interface OpcaoDoGrupo {
  valor: string;
  rotulo: string;
}

interface GrupoDeOpcoesProps {
  rotulo: string;
  valor: string;
  opcoes: OpcaoDoGrupo[];
  aoEscolher: (valor: string) => void;
  /** Mostra o círculo de rádio à esquerda do rótulo, para escolhas de identidade visível. */
  marcador?: boolean;
  /** Cada opção ocupa a mesma fração da linha, em vez do tamanho do próprio texto. */
  larguraIgual?: boolean;
  /**
   * `cartoes` (padrão): cada opção é um botão com borda própria. `segmentado`: as opções coladas
   * numa caixa de 40px, o "Mensal | Período" do protótipo. `trilho`: as opções sobre um trilho
   * cinza, a escolhida em branco — o "Todos · Fixos · Variáveis" de Lançamentos.
   */
  variante?: 'cartoes' | 'segmentado' | 'trilho';
}

/**
 * Escolha única entre poucas opções, todas visíveis ao mesmo tempo.
 *
 * <p>É `radiogroup` de verdade — cada opção declara `role="radio"` e `aria-checked` —, e não uma
 * fileira de botões que parecem escolhidos. A diferença aparece no leitor de tela: ele anuncia
 * "2 de 3, marcado", que é a informação que a pessoa precisa para saber onde está.
 *
 * <p>Use quando as opções cabem na linha e vale mostrar todas. Passando de cinco, ou quando a
 * lista cresce com o tempo, o certo é {@code Selecao}.
 */
export function GrupoDeOpcoes({
  rotulo,
  valor,
  opcoes,
  aoEscolher,
  marcador = false,
  larguraIgual = false,
  variante = 'cartoes',
}: GrupoDeOpcoesProps) {
  return (
    <div
      className={juntarClasses(estilos.grupo, variante !== 'cartoes' && estilos[variante])}
      role="radiogroup"
      aria-label={rotulo}
    >
      {opcoes.map((opcao) => {
        const escolhida = opcao.valor === valor;
        return (
          <button
            key={opcao.valor}
            type="button"
            role="radio"
            aria-checked={escolhida}
            className={juntarClasses(
              estilos.opcao,
              escolhida && estilos.escolhida,
              larguraIgual && estilos.igual,
            )}
            onClick={() => aoEscolher(opcao.valor)}
          >
            {marcador ? <span className={estilos.marcador} aria-hidden="true" /> : null}
            {opcao.rotulo}
          </button>
        );
      })}
    </div>
  );
}
