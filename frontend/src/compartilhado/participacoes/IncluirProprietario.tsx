import { useRef, useState, type RefObject } from 'react';

import { Botao } from '@/design-system/primitivos/Botao';
import { Selecao } from '@/design-system/primitivos/Selecao';

import estilos from './IncluirProprietario.module.css';

export interface CandidatoAoContrato {
  id: number;
  nome: string;
}

interface IncluirProprietarioProps {
  /** O nome da escolha: "Adicionar proprietário ao contrato", "Incluir proprietário na PS-MEP". */
  rotulo: string;
  /** O nome do botão, quando há mais de um na tela: "Incluir na PS-MEP". */
  rotuloDoBotao: string;
  candidatos: CandidatoAoContrato[];
  aoIncluir: (proprietarioId: number) => void;
  rotuloOculto?: boolean;
  /** Para quem precisa levar o foco à escolha — depois de remover uma linha, por exemplo. */
  ref?: RefObject<HTMLSelectElement | null>;
}

/**
 * Escolher quem entra num contrato e confirmar no botão ao lado.
 *
 * <p>Escolher e incluir são dois passos de propósito (WCAG 3.2.2): no Windows e no Firefox a seta
 * troca a opção de um select fechado, e incluir na troca poria no contrato o primeiro da lista de
 * quem só queria percorrê-la.
 */
export function IncluirProprietario({
  rotulo,
  rotuloDoBotao,
  candidatos,
  aoIncluir,
  rotuloOculto = true,
  ref,
}: IncluirProprietarioProps) {
  const [escolhido, setEscolhido] = useState('');
  const [erro, setErro] = useState<string>();
  const propria = useRef<HTMLSelectElement>(null);
  const selecao = ref ?? propria;

  function incluir() {
    if (escolhido === '') {
      setErro('Escolha quem incluir.');
      selecao.current?.focus();
      return;
    }
    setEscolhido('');
    setErro(undefined);
    aoIncluir(Number(escolhido));
  }

  return (
    <div className={estilos.inclusao}>
      <div className={estilos.escolha}>
        <Selecao
          rotulo={rotulo}
          rotuloOculto={rotuloOculto}
          ref={selecao}
          valor={escolhido}
          erro={erro}
          opcoes={[
            { valor: '', rotulo: 'Selecione…' },
            ...candidatos.map((candidato) => ({
              valor: String(candidato.id),
              rotulo: candidato.nome,
            })),
          ]}
          aoMudar={(valor) => {
            setEscolhido(valor);
            setErro(undefined);
          }}
        />
      </div>
      <Botao
        variante="secundario"
        tamanho="medio"
        rotuloAcessivel={rotuloDoBotao}
        aoClicar={incluir}
      >
        Incluir
      </Botao>
    </div>
  );
}
