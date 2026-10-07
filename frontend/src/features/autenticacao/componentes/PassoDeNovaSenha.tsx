import { Formulario } from '@/compartilhado/formulario/Formulario';
import { ResumoDoFormulario } from '@/compartilhado/formulario/ResumoDoFormulario';
import { Botao } from '@/design-system/primitivos/Botao';
import { BotaoDeLink } from '@/design-system/primitivos/BotaoDeLink';
import { CampoDeTexto } from '@/design-system/primitivos/CampoDeTexto';
import { Texto } from '@/design-system/primitivos/Texto';
import type { Acesso } from '@/features/autenticacao/hooks/usePassosDeAcesso';

import { CamposDaSenhaNova, useValidacaoDaSenhaNova } from './CamposDaSenhaNova';
import { SetaAtras } from './Icones';
import estilos from './Passos.module.css';

/**
 * O `CampoDeTexto` não tem modo somente leitura, e `desabilitado` tiraria o campo do Tab e do
 * gerenciador de senhas. O atributo nativo resolve os dois.
 */
function somenteLeitura(campo: HTMLInputElement | null) {
  if (campo) {
    campo.readOnly = true;
  }
}

const nadaMuda = () => undefined;

export function PassoDeNovaSenha({ acesso }: { acesso: Acesso }) {
  const validacao = useValidacaoDaSenhaNova(acesso, acesso.falhaDaRedefinicao);

  return (
    <Formulario
      referencia={validacao.refDoFormulario}
      aoEnviar={() => validacao.enviar(acesso.redefinirSenha)}
    >
      <header className={estilos.cabecalho}>
        <Texto variante="titulo" como="h1">
          <span className={estilos.destaque}>Nova senha</span>
        </Texto>
        <Texto tom="suave">Código confirmado — defina a nova senha.</Texto>
      </header>

      <div className={estilos.campos}>
        {/* A conta da senha nova, à vista e para o gerenciador de senhas guardar no lugar certo. */}
        <CampoDeTexto
          ref={somenteLeitura}
          rotulo="E-mail"
          tipo="email"
          valor={acesso.campos.emailDeRecuperacao}
          aoMudar={nadaMuda}
          autoComplete="username"
        />
        <CamposDaSenhaNova acesso={acesso} validacao={validacao} />
      </div>

      <div className={estilos.envio}>
        <ResumoDoFormulario resumo={validacao.resumo} />
        <Botao tipo="submit" tamanho="grande" largura="total" carregando={acesso.enviando}>
          Redefinir senha
        </Botao>
      </div>

      <BotaoDeLink
        aoClicar={acesso.voltarParaEntrada}
        alinhamento="centro"
        largura="total"
        iconeAoInicio={<SetaAtras />}
        desabilitado={acesso.enviando}
      >
        Voltar ao login
      </BotaoDeLink>
    </Formulario>
  );
}
