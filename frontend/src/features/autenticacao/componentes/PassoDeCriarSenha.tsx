import { Formulario } from '@/compartilhado/formulario/Formulario';
import { ResumoDoFormulario } from '@/compartilhado/formulario/ResumoDoFormulario';
import { Botao } from '@/design-system/primitivos/Botao';
import { BotaoDeLink } from '@/design-system/primitivos/BotaoDeLink';
import { Texto } from '@/design-system/primitivos/Texto';
import type { Acesso } from '@/features/autenticacao/hooks/usePassosDeAcesso';

import { CamposDaSenhaNova, useValidacaoDaSenhaNova } from './CamposDaSenhaNova';
import { SetaAtras } from './Icones';
import estilos from './Passos.module.css';

/**
 * O fim do convite: a pessoa chega pelo link do e-mail e cria a própria senha. O convite vencido ou
 * já usado volta como recusa no resumo, e o link de saída leva ao login.
 */
export function PassoDeCriarSenha({ acesso }: { acesso: Acesso }) {
  const validacao = useValidacaoDaSenhaNova(acesso, acesso.falhaDoConvite);

  return (
    <Formulario
      referencia={validacao.refDoFormulario}
      aoEnviar={() => validacao.enviar(acesso.criarSenha)}
    >
      <header className={estilos.cabecalho}>
        <Texto variante="titulo" como="h1">
          <span className={estilos.destaque}>Crie sua senha</span>
        </Texto>
        <Texto tom="suave">
          Você foi convidado para o Æther. Escolha a senha que vai usar para entrar.
        </Texto>
      </header>

      <div className={estilos.campos}>
        <CamposDaSenhaNova acesso={acesso} validacao={validacao} />
      </div>

      <div className={estilos.envio}>
        <ResumoDoFormulario resumo={validacao.resumo} />
        <Botao tipo="submit" tamanho="grande" largura="total" carregando={acesso.enviando}>
          Criar senha
        </Botao>
      </div>

      <BotaoDeLink
        aoClicar={acesso.sairDoConvite}
        alinhamento="centro"
        largura="total"
        iconeAoInicio={<SetaAtras />}
        desabilitado={acesso.enviando}
      >
        Ir para o login
      </BotaoDeLink>
    </Formulario>
  );
}
