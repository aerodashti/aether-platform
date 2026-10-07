import { type Ref } from 'react';

import { juntarClasses } from '@/design-system/classes';

import { MolduraDeCampo } from './MolduraDeCampo';
import estilos from './Selecao.module.css';

export interface OpcaoDeSelecao {
  valor: string;
  rotulo: string;
}

interface SelecaoProps {
  rotulo: string;
  valor: string;
  opcoes: OpcaoDeSelecao[];
  aoMudar: (valor: string) => void;
  /**
   * Esconde o rótulo visualmente sem tirá-lo do leitor de tela. É o caso do filtro sobre uma
   * grade: a primeira opção já diz o que o controle filtra ("Todos os papéis"), e repetir isso
   * num rótulo acima gastaria uma linha de altura em cima da tabela.
   */
  rotuloOculto?: boolean;
  desabilitado?: boolean;
  /** Asterisco e `aria-required`, como no `CampoDeTexto`. */
  obrigatorio?: boolean;
  apoio?: string;
  /** Mensagem de erro: pinta a borda e chega ao leitor de tela pelo `aria-describedby`. */
  erro?: string;
  /** Para quem precisa levar o foco à seleção — o primeiro controle de uma edição que abriu. */
  ref?: Ref<HTMLSelectElement>;
}

/**
 * Select nativo, com o cromo do produto.
 *
 * <p>É nativo de propósito: teclado, busca por digitação e a roda de seleção do celular vêm de
 * graça, e nenhuma reimplementação chega perto disso. O que o CSS faz é tirar o visual do sistema
 * operacional da caixa — a lista aberta continua sendo desenhada pelo navegador.
 */
export function Selecao({
  rotulo,
  valor,
  opcoes,
  aoMudar,
  rotuloOculto = false,
  desabilitado = false,
  obrigatorio = false,
  apoio,
  erro,
  ref,
}: SelecaoProps) {
  return (
    <MolduraDeCampo
      rotulo={rotulo}
      rotuloOculto={rotuloOculto}
      obrigatorio={obrigatorio}
      apoio={apoio}
      erro={erro}
    >
      {(atributos) => (
        <select
          {...atributos}
          ref={ref}
          className={juntarClasses(estilos.entrada, erro && estilos.invalida)}
          value={valor}
          onChange={(evento) => aoMudar(evento.target.value)}
          disabled={desabilitado}
        >
          {opcoes.map((opcao) => (
            <option key={opcao.valor} value={opcao.valor}>
              {opcao.rotulo}
            </option>
          ))}
        </select>
      )}
    </MolduraDeCampo>
  );
}
