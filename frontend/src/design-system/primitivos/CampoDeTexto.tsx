import { useState, type Ref } from 'react';

import { juntarClasses } from '@/design-system/classes';

import estilos from './CampoDeTexto.module.css';
import { MolduraDeCampo } from './MolduraDeCampo';

export type TipoDeCampo = 'texto' | 'email' | 'senha' | 'data' | 'hora' | 'mes' | 'telefone';
export type AlinhamentoDeCampo = 'esquerda' | 'centro' | 'direita';

interface CampoDeTextoProps {
  rotulo: string;
  valor: string;
  aoMudar: (valor: string) => void;
  tipo?: TipoDeCampo;
  exemplo?: string;
  /** Mensagem de erro do campo. Presente, pinta a borda e é anunciada por leitor de tela. */
  erro?: string;
  /** Texto de apoio permanente, abaixo do campo. */
  apoio?: string;
  autoComplete?: string;
  maxLength?: number;
  /**
   * `decimal` abre o teclado com vírgula no celular — é o de todo valor com casas (R$, câmbio,
   * horas). `numeric` é só para inteiros: no iOS ele não tem vírgula.
   */
  inputMode?: 'text' | 'email' | 'numeric' | 'decimal' | 'tel';
  /** Limites dos tipos nativos de data, hora e mês, no formato do próprio tipo (`2026-10-07`). */
  minimo?: string;
  maximo?: string;
  alinhamento?: AlinhamentoDeCampo;
  /** Espaçamento largo entre caracteres, para o código de seis dígitos. */
  espacado?: boolean;
  /**
   * Esconde o rótulo visualmente sem tirá-lo do leitor de tela. É o caso da busca sobre uma
   * grade, onde o exemplo dentro do campo já diz o que se procura e um rótulo acima gastaria
   * altura em cima da tabela.
   */
  rotuloOculto?: boolean;
  desabilitado?: boolean;
  /**
   * Marca o campo com o asterisco do protótipo e o anuncia como obrigatório. Não bloqueia o envio:
   * quem decide se dá para salvar é a tela.
   */
  obrigatorio?: boolean;
  /** Para quem precisa devolver o foco ao campo — a edição que acabou de abrir, por exemplo. */
  ref?: Ref<HTMLInputElement>;
}

const tipoNativo: Record<TipoDeCampo, string> = {
  texto: 'text',
  email: 'email',
  senha: 'password',
  // Nativos de propósito, como a Selecao: calendário, teclado e validação vêm do navegador.
  data: 'date',
  hora: 'time',
  mes: 'month',
  telefone: 'tel',
};

/**
 * Safari no macOS e Firefox não implementam `type="month"`: o campo vira texto livre sem dizer o
 * formato. Nesses navegadores o mês é um texto com o formato no exemplo, e a regra `competencia()`
 * do formulário confere.
 */
const SUPORTA_MES = ((): boolean => {
  if (typeof document === 'undefined') {
    return true;
  }
  const entrada = document.createElement('input');
  entrada.setAttribute('type', 'month');
  return entrada.type === 'month';
})();

/**
 * Um campo de data, hora ou mês digitado pela metade tem `value` vazio: a tela não tem como saber
 * que há algo escrito. O próprio campo sabe (`validity.badInput`) e diz.
 */
const MENSAGEM_DE_INCOMPLETO: Partial<Record<TipoDeCampo, string>> = {
  data: 'Data incompleta ou inexistente.',
  hora: 'Hora incompleta.',
  mes: 'Mês incompleto.',
};

export function CampoDeTexto({
  rotulo,
  valor,
  aoMudar,
  tipo = 'texto',
  exemplo,
  erro,
  apoio,
  autoComplete,
  maxLength,
  inputMode,
  minimo,
  maximo,
  alinhamento = 'esquerda',
  espacado = false,
  rotuloOculto = false,
  desabilitado = false,
  obrigatorio = false,
  ref,
}: CampoDeTextoProps) {
  const [incompleto, setIncompleto] = useState(false);
  const mesComoTexto = tipo === 'mes' && !SUPORTA_MES;
  const mensagem = (incompleto ? MENSAGEM_DE_INCOMPLETO[tipo] : undefined) ?? erro;

  function conferirCompletude(entrada: HTMLInputElement) {
    setIncompleto(entrada.validity.badInput);
  }

  return (
    <MolduraDeCampo
      rotulo={rotulo}
      rotuloOculto={rotuloOculto}
      obrigatorio={obrigatorio}
      apoio={apoio}
      erro={mensagem}
    >
      {(atributos) => (
        <input
          {...atributos}
          ref={ref}
          className={juntarClasses(
            estilos.entrada,
            estilos[alinhamento],
            espacado && estilos.espacado,
            mensagem && estilos.invalida,
          )}
          type={mesComoTexto ? 'text' : tipoNativo[tipo]}
          value={valor}
          onChange={(evento) => {
            conferirCompletude(evento.currentTarget);
            aoMudar(evento.currentTarget.value);
          }}
          onBlur={(evento) => conferirCompletude(evento.currentTarget)}
          placeholder={exemplo ?? (mesComoTexto ? 'AAAA-MM' : undefined)}
          autoComplete={autoComplete}
          maxLength={maxLength ?? (mesComoTexto ? 7 : undefined)}
          inputMode={inputMode ?? (tipo === 'telefone' ? 'tel' : undefined)}
          min={minimo}
          max={maximo}
          disabled={desabilitado}
        />
      )}
    </MolduraDeCampo>
  );
}
