import { Botao } from '@/design-system/primitivos/Botao';
import { BotaoDeLink } from '@/design-system/primitivos/BotaoDeLink';
import { CampoDeTexto } from '@/design-system/primitivos/CampoDeTexto';
import { Texto } from '@/design-system/primitivos/Texto';
import type { usePassosDeAcesso } from '@/features/autenticacao/hooks/usePassosDeAcesso';

import { SetaAtras } from './Icones';
import estilos from './Passos.module.css';

type Acesso = ReturnType<typeof usePassosDeAcesso>;

export function PassoDeEmail({ acesso }: { acesso: Acesso }) {
  return (
    <form
      className={estilos.passo}
      onSubmit={(evento) => {
        evento.preventDefault();
        void acesso.submeterEmail();
      }}
      noValidate
    >
      <header className={estilos.cabecalho}>
        <Texto variante="titulo" como="h1">
          <span className={estilos.destaque}>Recuperar acesso</span>
        </Texto>
        <Texto tom="suave">
          Informe o e-mail cadastrado — enviaremos um código de 6 dígitos para redefinir a senha.
        </Texto>
      </header>

      <CampoDeTexto
        rotulo="E-mail"
        tipo="email"
        valor={acesso.campos.emailDeRecuperacao}
        aoMudar={(valor) => acesso.preencher('emailDeRecuperacao', valor)}
        exemplo="nome@empresa.com.br"
        erro={acesso.erros.emailDeRecuperacao}
        autoComplete="username"
        inputMode="email"
      />

      <Botao tipo="submit" tamanho="grande" largura="total" carregando={acesso.enviando}>
        Enviar código
      </Botao>

      <BotaoDeLink
        aoClicar={acesso.voltarParaEntrada}
        alinhamento="centro"
        largura="total"
        iconeAoInicio={<SetaAtras />}
        desabilitado={acesso.enviando}
      >
        Voltar ao login
      </BotaoDeLink>
    </form>
  );
}
