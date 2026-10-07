import { ResumoDoFormulario } from '@/compartilhado/formulario/ResumoDoFormulario';
import { useValidacao } from '@/compartilhado/formulario/useValidacao';
import { Botao } from '@/design-system/primitivos/Botao';
import { BotaoDeLink } from '@/design-system/primitivos/BotaoDeLink';
import { CampoDeTexto } from '@/design-system/primitivos/CampoDeTexto';
import { Texto } from '@/design-system/primitivos/Texto';
import type { Acesso } from '@/features/autenticacao/hooks/usePassosDeAcesso';

import { Informacao, SetaAdiante } from './Icones';
import estilos from './Passos.module.css';
import { validarEntrada, type CampoDaEntrada } from './validacaoDaEntrada';

const ROTULOS: Record<CampoDaEntrada, string> = { email: 'E-mail', senha: 'Senha' };

export function PassoDeEntrada({ acesso }: { acesso: Acesso }) {
  const rascunho = { email: acesso.campos.email, senha: acesso.campos.senha };
  const validacao = useValidacao({
    erros: validarEntrada(rascunho),
    valores: rascunho,
    rotulos: ROTULOS,
    falha: acesso.falhaDaEntrada,
  });

  return (
    <form
      className={estilos.passo}
      onSubmit={(evento) => {
        evento.preventDefault();
        validacao.enviar(acesso.entrar);
      }}
      noValidate
    >
      <header className={estilos.cabecalho}>
        <Texto variante="titulo" como="h1">
          <span className={estilos.destaque}>Bem-vindo de volta</span>
        </Texto>
        <Texto tom="suave">Acesse o painel de gestão da sua frota.</Texto>
      </header>

      <div className={estilos.campos} ref={validacao.refDoFormulario}>
        <CampoDeTexto
          rotulo={ROTULOS.email}
          tipo="email"
          obrigatorio
          valor={acesso.campos.email}
          aoMudar={(valor) => acesso.preencher('email', valor)}
          exemplo="nome@empresa.com.br"
          erro={validacao.erroDe('email')}
          autoComplete="username"
          inputMode="email"
        />

        <CampoDeTexto
          rotulo={ROTULOS.senha}
          tipo="senha"
          obrigatorio
          valor={acesso.campos.senha}
          aoMudar={(valor) => acesso.preencher('senha', valor)}
          exemplo="Digite sua senha"
          erro={validacao.erroDe('senha')}
          autoComplete="current-password"
        />
      </div>

      <p className={estilos.recado}>
        <span className={estilos.recadoIcone}>
          <Informacao />
        </span>
        Primeiro acesso? O convite chega por e-mail com um link para criar sua senha.
      </p>

      <div className={estilos.envio}>
        <ResumoDoFormulario resumo={validacao.resumo} />
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
      </div>

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
