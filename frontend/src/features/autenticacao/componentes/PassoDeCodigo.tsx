import { useRef } from 'react';

import { Formulario } from '@/compartilhado/formulario/Formulario';
import { ResumoDoFormulario } from '@/compartilhado/formulario/ResumoDoFormulario';
import { useValidacao } from '@/compartilhado/formulario/useValidacao';
import { Botao } from '@/design-system/primitivos/Botao';
import { BotaoDeLink } from '@/design-system/primitivos/BotaoDeLink';
import { CampoDeTexto } from '@/design-system/primitivos/CampoDeTexto';
import { Texto } from '@/design-system/primitivos/Texto';
import type { Acesso } from '@/features/autenticacao/hooks/usePassosDeAcesso';

import { SetaAtras } from './Icones';
import estilos from './Passos.module.css';
import { digitosDoCodigo } from './regrasDeAcesso';
import { validarCodigo, type CampoDoCodigo } from './validacaoDoCodigo';

const ROTULOS: Record<CampoDoCodigo, string> = { codigo: 'Código de verificação' };

/** "0:42": a espera cabe num minuto, mas a forma é a de um relógio. */
function emMinutosESegundos(segundos: number): string {
  return `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, '0')}`;
}

export function PassoDeCodigo({ acesso }: { acesso: Acesso }) {
  const refDoCodigo = useRef<HTMLInputElement>(null);
  const rascunho = { codigo: acesso.campos.codigo };
  const validacao = useValidacao({
    erros: validarCodigo(rascunho),
    valores: rascunho,
    rotulos: ROTULOS,
    falha: acesso.falhaDoCodigo,
  });

  function reenviar() {
    // O foco sai do link antes que ele fique inerte: é no campo que o código novo vai ser digitado.
    refDoCodigo.current?.focus();
    acesso.reenviarCodigo();
  }

  return (
    <Formulario
      referencia={validacao.refDoFormulario}
      aoEnviar={() => validacao.enviar(acesso.conferirCodigo)}
    >
      <header className={estilos.cabecalho}>
        <Texto variante="titulo" como="h1">
          <span className={estilos.destaque}>Confirme o código</span>
        </Texto>
        {/* "Se … estiver cadastrado": a tela não confirma quem tem conta, e o servidor responde
            igual nos dois casos. */}
        <Texto tom="suave">
          Se <strong className={estilos.enfase}>{acesso.campos.emailDeRecuperacao}</strong> estiver
          cadastrado, enviamos para lá um código de 6 dígitos. Ele vale por 10 minutos.
        </Texto>
      </header>

      <div className={estilos.campos}>
        <CampoDeTexto
          ref={refDoCodigo}
          rotulo={ROTULOS.codigo}
          obrigatorio
          valor={acesso.campos.codigo}
          aoMudar={(valor) => acesso.preencher('codigo', digitosDoCodigo(valor))}
          erro={validacao.erroDe('codigo')}
          inputMode="numeric"
          autoComplete="one-time-code"
          alinhamento="centro"
          espacado
        />
      </div>

      <div className={estilos.envio}>
        <ResumoDoFormulario resumo={validacao.resumo} />
        <Botao tipo="submit" tamanho="grande" largura="total" carregando={acesso.enviando}>
          Validar código
        </Botao>
      </div>

      <div className={estilos.linhaDeAcoes}>
        <BotaoDeLink
          aoClicar={acesso.voltarParaEmail}
          iconeAoInicio={<SetaAtras />}
          desabilitado={acesso.enviando}
        >
          Voltar
        </BotaoDeLink>
        {acesso.esperaParaReenviar > 0 ? (
          <Texto variante="apoio" tom="suave" como="span">
            Reenviar em {emMinutosESegundos(acesso.esperaParaReenviar)}
          </Texto>
        ) : (
          <BotaoDeLink aoClicar={reenviar} desabilitado={acesso.enviando}>
            Reenviar código
          </BotaoDeLink>
        )}
      </div>
    </Formulario>
  );
}
