import { Botao } from '@/design-system/primitivos/Botao';
import { BotaoDeLink } from '@/design-system/primitivos/BotaoDeLink';
import { CampoDeTexto } from '@/design-system/primitivos/CampoDeTexto';
import { Texto } from '@/design-system/primitivos/Texto';
import type { usePassosDeAcesso } from '@/features/autenticacao/hooks/usePassosDeAcesso';

import { Informacao, SetaAdiante } from './Icones';
import estilos from './Passos.module.css';

type Acesso = ReturnType<typeof usePassosDeAcesso>;

export function PassoDeEntrada({ acesso }: { acesso: Acesso }) {
  return (
    <form
      className={estilos.passo}
      onSubmit={(evento) => {
        evento.preventDefault();
        void acesso.submeterEntrada();
      }}
      noValidate
    >
      <header className={estilos.cabecalho}>
        <Texto variante="titulo" como="h1">
          <span className={estilos.destaque}>Bem-vindo de volta</span>
        </Texto>
        <Texto tom="suave">Acesse o painel de gestão da sua frota.</Texto>
      </header>

      <CampoDeTexto
        rotulo="E-mail"
        tipo="email"
        valor={acesso.campos.email}
        aoMudar={(valor) => acesso.preencher('email', valor)}
        exemplo="nome@empresa.com.br"
        erro={acesso.erros.email}
        autoComplete="username"
        inputMode="email"
      />

      <CampoDeTexto
        rotulo="Senha"
        tipo="senha"
        valor={acesso.campos.senha}
        aoMudar={(valor) => acesso.preencher('senha', valor)}
        exemplo="Digite sua senha"
        erro={acesso.erros.senha}
        autoComplete="current-password"
      />

      <p className={estilos.recado}>
        <span className={estilos.recadoIcone}>
          <Informacao />
        </span>
        Primeiro acesso? O convite chega por e-mail com um link para criar sua senha.
      </p>

      <Botao
        tipo="submit"
        variante="contorno"
        tamanho="grande"
        largura="total"
        carregando={acesso.enviando}
        iconeAoFim={<SetaAdiante />}
      >
        Entrar
      </Botao>

      <BotaoDeLink
        aoClicar={acesso.irParaRecuperacao}
        alinhamento="centro"
        largura="total"
        desabilitado={acesso.enviando}
      >
        Esqueci minha senha
      </BotaoDeLink>
    </form>
  );
}
