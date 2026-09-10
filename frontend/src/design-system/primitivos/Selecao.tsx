import { useId } from 'react';

import { juntarClasses } from '@/design-system/classes';

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
}: SelecaoProps) {
  const id = useId();

  return (
    <div className={estilos.campo}>
      <label
        className={juntarClasses(estilos.rotulo, rotuloOculto && estilos.apenasLeitor)}
        htmlFor={id}
      >
        {rotulo}
      </label>
      <select
        id={id}
        className={estilos.entrada}
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
    </div>
  );
}
