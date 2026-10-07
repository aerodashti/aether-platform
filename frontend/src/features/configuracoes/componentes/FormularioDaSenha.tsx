import { useId, useState } from 'react';

import { Formulario } from '@/compartilhado/formulario/Formulario';
import { ResumoDoFormulario } from '@/compartilhado/formulario/ResumoDoFormulario';
import { useValidacao } from '@/compartilhado/formulario/useValidacao';
import { Botao } from '@/design-system/primitivos/Botao';
import { CampoDeTexto } from '@/design-system/primitivos/CampoDeTexto';
import { Texto } from '@/design-system/primitivos/Texto';

import { useSolicitarTokenDeSenha, type MutacaoDaTrocaDeSenha } from '../api/useConfiguracoes';
import type { EsperaParaReenviar } from '../hooks/useEsperaParaReenviar';

import estilos from './CartaoDeSeguranca.module.css';
import { ResultadoDoEnvio, type Resultado } from './ResultadoDoEnvio';
import {
  ROTULOS_DA_TROCA,
  validarTrocaDeSenha,
  type CampoDaTroca,
  type RascunhoDaTroca,
} from './validacaoDaTrocaDeSenha';

/** A validade do código no servidor (`validade-do-codigo` no application.yml). */
const VALIDADE_DO_CODIGO_EM_MINUTOS = 10;

const RASCUNHO_VAZIO: RascunhoDaTroca = {
  senhaAtual: '',
  novaSenha: '',
  confirmacao: '',
  codigo: '',
};

const CODIGO_ENVIADO: Resultado = {
  mensagem: `Código enviado para o e-mail cadastrado. Ele vale ${VALIDADE_DO_CODIGO_EM_MINUTOS} minutos.`,
  tom: 'positivo',
};

interface FormularioDaSenhaProps {
  /** A mutação mora no cartão: o "Senha alterada." sobrevive a este formulário ser refeito. */
  trocar: MutacaoDaTrocaDeSenha;
  aoTrocar: () => void;
  /** Também mora no cartão: refazer o formulário não libera um pedido que o servidor ignoraria. */
  espera: EsperaParaReenviar;
}

function mensagemDe(falha: unknown): string | undefined {
  return falha instanceof Error ? `Não foi possível enviar o código. ${falha.message}` : undefined;
}

/**
 * Os campos da troca de senha. Começa vazio e é refeito a cada troca concluída — é o que limpa
 * os campos, o código já gasto e os erros de uma vez.
 */
export function FormularioDaSenha({ trocar, aoTrocar, espera }: FormularioDaSenhaProps) {
  const [rascunho, setRascunho] = useState(RASCUNHO_VAZIO);
  const pedirToken = useSolicitarTokenDeSenha();
  const idDaEspera = useId();
  const validacao = useValidacao({
    erros: validarTrocaDeSenha(rascunho),
    valores: rascunho,
    rotulos: ROTULOS_DA_TROCA,
    falha: trocar.error,
  });

  function mudar(campo: CampoDaTroca) {
    return (valor: string) => {
      if (trocar.isSuccess) {
        trocar.reset();
      }
      setRascunho((atual) => ({ ...atual, [campo]: valor }));
    };
  }

  function pedirCodigo() {
    pedirToken.mutate(undefined, { onSuccess: espera.iniciar });
  }

  function trocarSenha() {
    const { senhaAtual, novaSenha, codigo } = rascunho;
    trocar.mutate({ senhaAtual, novaSenha, codigo: codigo.trim() }, { onSuccess: aoTrocar });
  }

  const esperando = espera.restante > 0;

  return (
    <Formulario
      aoEnviar={() => validacao.enviar(trocarSenha)}
      referencia={validacao.refDoFormulario}
    >
      <CampoDeTexto
        rotulo="Senha atual"
        obrigatorio
        valor={rascunho.senhaAtual}
        aoMudar={mudar('senhaAtual')}
        tipo="senha"
        autoComplete="current-password"
        erro={validacao.erroDe('senhaAtual')}
      />
      <CampoDeTexto
        rotulo="Nova senha"
        obrigatorio
        valor={rascunho.novaSenha}
        aoMudar={mudar('novaSenha')}
        tipo="senha"
        autoComplete="new-password"
        apoio="Entre 8 e 72 caracteres. Letras com acento contam como dois."
        erro={validacao.erroDe('novaSenha')}
      />
      <CampoDeTexto
        rotulo="Confirmar nova senha"
        obrigatorio
        valor={rascunho.confirmacao}
        aoMudar={mudar('confirmacao')}
        tipo="senha"
        autoComplete="new-password"
        erro={validacao.erroDe('confirmacao')}
      />

      <div className={estilos.token}>
        <CampoDeTexto
          rotulo="Código de confirmação"
          obrigatorio
          valor={rascunho.codigo}
          aoMudar={mudar('codigo')}
          inputMode="numeric"
          alinhamento="centro"
          espacado
          autoComplete="one-time-code"
          apoio={`Peça o código pelo botão abaixo: ele chega ao e-mail cadastrado e vale ${VALIDADE_DO_CODIGO_EM_MINUTOS} minutos.`}
          erro={validacao.erroDe('codigo')}
        />
        <div className={estilos.linha}>
          <Botao
            variante="secundario"
            aoClicar={pedirCodigo}
            carregando={pedirToken.isPending}
            desabilitado={esperando}
            descritoPor={esperando ? idDaEspera : undefined}
          >
            {pedirToken.isSuccess ? 'Reenviar código' : 'Enviar código por e-mail'}
          </Botao>
          {esperando ? (
            <Texto variante="apoio" tom="suave" como="span" id={idDaEspera}>
              Outro código em {espera.restante} s.
            </Texto>
          ) : null}
        </div>
        <ResultadoDoEnvio resultado={pedirToken.isSuccess ? CODIGO_ENVIADO : undefined} />
        <ResumoDoFormulario resumo={mensagemDe(pedirToken.error)} />
      </div>

      <div className={estilos.acao}>
        <Botao tamanho="grande" tipo="submit" carregando={trocar.isPending}>
          Alterar senha
        </Botao>
        <ResumoDoFormulario resumo={validacao.resumo} />
      </div>
    </Formulario>
  );
}
