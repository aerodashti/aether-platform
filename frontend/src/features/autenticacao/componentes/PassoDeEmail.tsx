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
import { validarPedidoDeCodigo, type CampoDoPedidoDeCodigo } from './validacaoDoPedidoDeCodigo';

const ROTULOS: Record<CampoDoPedidoDeCodigo, string> = { email: 'E-mail' };

export function PassoDeEmail({ acesso }: { acesso: Acesso }) {
  const rascunho = { email: acesso.campos.emailDeRecuperacao };
  const validacao = useValidacao({
    erros: validarPedidoDeCodigo(rascunho),
    valores: rascunho,
    rotulos: ROTULOS,
    falha: acesso.falhaDoPedido,
  });

  return (
    <Formulario
      referencia={validacao.refDoFormulario}
      aoEnviar={() => validacao.enviar(acesso.pedirCodigo)}
    >
      <header className={estilos.cabecalho}>
        <Texto variante="titulo" como="h1">
          <span className={estilos.destaque}>Recuperar acesso</span>
        </Texto>
        <Texto tom="suave">
          Informe o e-mail cadastrado — enviaremos um código de 6 dígitos para redefinir a senha.
        </Texto>
      </header>

      <div className={estilos.campos}>
        <CampoDeTexto
          rotulo={ROTULOS.email}
          tipo="email"
          obrigatorio
          valor={acesso.campos.emailDeRecuperacao}
          aoMudar={(valor) => acesso.preencher('emailDeRecuperacao', valor)}
          exemplo="nome@empresa.com.br"
          erro={validacao.erroDe('email')}
          autoComplete="username"
          inputMode="email"
        />
      </div>

      <div className={estilos.envio}>
        <ResumoDoFormulario resumo={validacao.resumo} />
        <Botao tipo="submit" tamanho="grande" largura="total" carregando={acesso.enviando}>
          Enviar código
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
