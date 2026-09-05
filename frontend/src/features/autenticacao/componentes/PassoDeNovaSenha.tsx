import { Botao } from '@/design-system/primitivos/Botao';
import { BotaoDeLink } from '@/design-system/primitivos/BotaoDeLink';
import { CampoDeTexto } from '@/design-system/primitivos/CampoDeTexto';
import { Texto } from '@/design-system/primitivos/Texto';
import type { usePassosDeAcesso } from '@/features/autenticacao/hooks/usePassosDeAcesso';

import { SetaAtras } from './Icones';
import estilos from './Passos.module.css';

type Acesso = ReturnType<typeof usePassosDeAcesso>;

export function PassoDeNovaSenha({ acesso }: { acesso: Acesso }) {
  return (
    <form
      className={estilos.passo}
      onSubmit={(evento) => {
        evento.preventDefault();
        void acesso.submeterNovaSenha();
      }}
      noValidate
    >
      <header className={estilos.cabecalho}>
        <Texto variante="titulo" como="h1">
          <span className={estilos.destaque}>Nova senha</span>
        </Texto>
        <Texto tom="suave">Código confirmado — defina a nova senha.</Texto>
      </header>

      <CampoDeTexto
        rotulo="Nova senha"
        tipo="senha"
        valor={acesso.campos.novaSenha}
        aoMudar={(valor) => acesso.preencher('novaSenha', valor)}
        erro={acesso.erros.novaSenha}
        apoio="Mínimo de 8 caracteres."
        autoComplete="new-password"
      />

      <CampoDeTexto
        rotulo="Confirmar nova senha"
        tipo="senha"
        valor={acesso.campos.confirmacao}
        aoMudar={(valor) => acesso.preencher('confirmacao', valor)}
        erro={acesso.erros.confirmacao}
        autoComplete="new-password"
      />

      <Botao tipo="submit" tamanho="grande" largura="total" carregando={acesso.enviando}>
        Redefinir senha
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
