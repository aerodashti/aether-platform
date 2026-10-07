import { useEffect, useRef, useState, type RefObject } from 'react';

import { ErroDeApi } from '@/api/cliente';

/** A mensagem de cada campo com problema, pelo nome do campo no formulário. */
export type Erros<C extends string> = Partial<Record<C, string>>;

interface OpcoesDeValidacao<C extends string> {
  /**
   * Os problemas de agora, calculados por uma função pura do formulário (`validarCusto(rascunho)`)
   * — a regra fica testável sem renderizar nada, e este hook cuida só de quando e onde mostrar.
   */
  erros: Erros<C>;
  /** Os valores de agora: o erro que o servidor deu a um campo some quando o campo muda. */
  valores: Record<C, unknown>;
  /** O nome de cada campo como a pessoa o lê, para o resumo dizer o que falta. */
  rotulos: Record<C, string>;
  /** O erro da mutação. Um 400 com `campos` vira o erro do campo de mesmo nome. */
  falha?: unknown;
  /** Quando o nome no JSON não é o do formulário (`participacoes[0].percentual`, por exemplo). */
  campoDoServidor?: (nome: string) => C | undefined;
}

export interface Validacao<C extends string> {
  /** A mensagem a mostrar no campo agora, ou `undefined`. */
  erroDe: (campo: C) => string | undefined;
  /** Tenta enviar: com problema, mostra todos e leva o foco ao primeiro; sem, executa a ação. */
  enviar: (acao: () => void) => void;
  /** Vai no elemento que envolve os campos — é onde se procura o primeiro inválido. */
  refDoFormulario: RefObject<HTMLDivElement | null>;
  /** A frase para junto dos botões: o que falta, ou por que o servidor recusou. */
  resumo: string | undefined;
}

interface RegistroDaFalha<C extends string> {
  falha: unknown;
  valores: Record<C, unknown>;
}

/** O controle a focar dentro do elemento marcado: num `radiogroup`, a opção que está no Tab. */
function alvoDoFoco(marcado: Element): HTMLElement | null {
  if (marcado.getAttribute('role') === 'radiogroup') {
    return marcado.querySelector<HTMLElement>('[tabindex="0"]');
  }
  return marcado instanceof HTMLElement ? marcado : null;
}

function mensagemDaFalha(falha: unknown): string | undefined {
  if (falha instanceof Error) {
    return falha.message;
  }
  return falha === undefined || falha === null
    ? undefined
    : 'Não foi possível concluir a operação.';
}

/**
 * Quando e onde mostrar os erros de um formulário — a política, separada das regras.
 *
 * <p>Nada aparece enquanto a pessoa preenche pela primeira vez: gritar "obrigatório" num campo que
 * ela ainda nem alcançou é ruído. Ao tentar salvar, todos os problemas aparecem de uma vez, o foco
 * vai ao primeiro (o leitor de tela lê o erro pelo `aria-describedby`) e o resumo diz quantos e
 * quais. Daí em diante os erros acompanham a digitação. O botão de salvar nunca fica desabilitado
 * por validação: desabilitado, ele não diz o que falta.
 *
 * <p>O servidor tem a última palavra: o `campos` do 400 cai no campo de mesmo nome, e some quando
 * a pessoa altera aquele campo.
 */
export function useValidacao<C extends string>({
  erros,
  valores,
  rotulos,
  falha,
  campoDoServidor = (nome) => (nome in rotulos ? (nome as C) : undefined),
}: OpcoesDeValidacao<C>): Validacao<C> {
  const refDoFormulario = useRef<HTMLDivElement>(null);
  const [tentouEnviar, setTentouEnviar] = useState(false);
  const [pedidosDeFoco, setPedidosDeFoco] = useState(0);
  // Começa sem falha, para que uma falha já presente na montagem também peça o foco.
  const [registro, setRegistro] = useState<RegistroDaFalha<C>>({ falha: undefined, valores });

  // Ajuste de estado durante a renderização (o padrão do React para estado derivado de prop): a
  // foto dos valores é a do momento em que a falha chegou.
  if (registro.falha !== falha) {
    setRegistro({ falha, valores });
    if (falha instanceof ErroDeApi && Object.keys(falha.campos).length > 0) {
      setPedidosDeFoco((pedidos) => pedidos + 1);
    }
  }

  useEffect(() => {
    if (pedidosDeFoco === 0) {
      return;
    }
    const marcado = refDoFormulario.current?.querySelector('[aria-invalid="true"]');
    if (marcado) {
      alvoDoFoco(marcado)?.focus();
    }
  }, [pedidosDeFoco]);

  const errosDoServidor: Erros<C> = {};
  if (registro.falha instanceof ErroDeApi) {
    for (const [nome, mensagem] of Object.entries(registro.falha.campos)) {
      const campo = campoDoServidor(nome);
      if (campo !== undefined && Object.is(valores[campo], registro.valores[campo])) {
        errosDoServidor[campo] = mensagem;
      }
    }
  }

  function erroDe(campo: C): string | undefined {
    return (tentouEnviar ? erros[campo] : undefined) ?? errosDoServidor[campo];
  }

  function enviar(acao: () => void) {
    setTentouEnviar(true);
    if (Object.values(erros).some(Boolean)) {
      setPedidosDeFoco((pedidos) => pedidos + 1);
      return;
    }
    acao();
  }

  function resumir(): string | undefined {
    const pendentes = (Object.keys(rotulos) as C[]).filter((campo) => erroDe(campo));
    if (pendentes.length > 0) {
      const nomes = pendentes.map((campo) => rotulos[campo]).join(', ');
      return pendentes.length === 1
        ? `Revise o campo ${nomes}.`
        : `Revise ${pendentes.length} campos: ${nomes}.`;
    }
    // Uma falha cujos campos já estão todos marcados não precisa ser repetida aqui.
    const camposDaFalha = falha instanceof ErroDeApi ? Object.keys(falha.campos) : [];
    if (camposDaFalha.length > 0 && camposDaFalha.every((nome) => campoDoServidor(nome))) {
      return undefined;
    }
    return mensagemDaFalha(falha);
  }

  return { erroDe, enviar, refDoFormulario, resumo: resumir() };
}
