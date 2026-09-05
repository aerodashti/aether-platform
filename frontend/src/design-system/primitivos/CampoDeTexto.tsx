import { useId } from 'react';

import { juntarClasses } from '@/design-system/classes';

import estilos from './CampoDeTexto.module.css';

export type TipoDeCampo = 'texto' | 'email' | 'senha';
export type AlinhamentoDeCampo = 'esquerda' | 'centro';

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
  inputMode?: 'text' | 'email' | 'numeric';
  alinhamento?: AlinhamentoDeCampo;
  /** Espaçamento largo entre caracteres, para o código de seis dígitos. */
  espacado?: boolean;
  desabilitado?: boolean;
}

const tipoNativo: Record<TipoDeCampo, string> = {
  texto: 'text',
  email: 'email',
  senha: 'password',
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
  alinhamento = 'esquerda',
  espacado = false,
  desabilitado = false,
}: CampoDeTextoProps) {
  const id = useId();
  const idDoErro = `${id}-erro`;
  const idDoApoio = `${id}-apoio`;

  // Um campo pode ter apoio e erro ao mesmo tempo; o leitor de tela deve ouvir os dois.
  const descritores = [erro ? idDoErro : null, apoio ? idDoApoio : null].filter(Boolean).join(' ');

  return (
    <div className={estilos.campo}>
      <label className={estilos.rotulo} htmlFor={id}>
        {rotulo}
      </label>
      <input
        id={id}
        className={juntarClasses(
          estilos.entrada,
          estilos[alinhamento],
          espacado && estilos.espacado,
          erro && estilos.invalida,
        )}
        type={tipoNativo[tipo]}
        value={valor}
        onChange={(evento) => aoMudar(evento.target.value)}
        placeholder={exemplo}
        autoComplete={autoComplete}
        maxLength={maxLength}
        inputMode={inputMode}
        disabled={desabilitado}
        aria-invalid={erro ? true : undefined}
        aria-describedby={descritores || undefined}
      />
      {apoio ? (
        <span className={estilos.apoio} id={idDoApoio}>
          {apoio}
        </span>
      ) : null}
      {erro ? (
        <span className={estilos.erro} id={idDoErro}>
          {erro}
        </span>
      ) : null}
    </div>
  );
}
