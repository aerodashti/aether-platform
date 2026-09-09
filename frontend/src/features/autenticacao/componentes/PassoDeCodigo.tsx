import { Botao } from '@/design-system/primitivos/Botao';
import { BotaoDeLink } from '@/design-system/primitivos/BotaoDeLink';
import { CampoDeTexto } from '@/design-system/primitivos/CampoDeTexto';
import { Texto } from '@/design-system/primitivos/Texto';
import type { usePassosDeAcesso } from '@/features/autenticacao/hooks/usePassosDeAcesso';

import { SetaAtras } from './Icones';
import estilos from './Passos.module.css';

type Acesso = ReturnType<typeof usePassosDeAcesso>;

export function PassoDeCodigo({ acesso }: { acesso: Acesso }) {
  return (
    <form
      className={estilos.passo}
      onSubmit={(evento) => {
        evento.preventDefault();
        void acesso.submeterCodigo();
      }}
      noValidate
    >
      <header className={estilos.cabecalho}>
        <Texto variante="titulo" como="h1">
          <span className={estilos.destaque}>Confirme o código</span>
        </Texto>
        <Texto tom="suave">
          Enviamos um código de 6 dígitos para{' '}
          <strong className={estilos.enfase}>{acesso.campos.emailDeRecuperacao}</strong>. Ele expira
          em 10 minutos.
        </Texto>
      </header>

      <CampoDeTexto
        rotulo="Código de verificação"
        valor={acesso.campos.codigo}
        // Só dígitos: colar "519 274" ou "519-274" do e-mail não deve reprovar a conferência.
        aoMudar={(valor) => acesso.preencher('codigo', valor.replace(/\D/g, ''))}
        erro={acesso.erros.codigo}
        maxLength={6}
        inputMode="numeric"
        autoComplete="one-time-code"
        alinhamento="centro"
        espacado
      />

      <Botao tipo="submit" tamanho="grande" largura="total" carregando={acesso.enviando}>
        Validar código
      </Botao>

      <div className={estilos.linhaDeAcoes}>
        <BotaoDeLink
          aoClicar={acesso.voltarParaEntrada}
          iconeAoInicio={<SetaAtras />}
          desabilitado={acesso.enviando}
        >
          Voltar
        </BotaoDeLink>
        <BotaoDeLink aoClicar={() => void acesso.reenviarCodigo()} desabilitado={acesso.enviando}>
          Reenviar código
        </BotaoDeLink>
      </div>
    </form>
  );
}
