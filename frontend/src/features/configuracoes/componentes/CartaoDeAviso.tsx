import { useState } from 'react';

import { lerNumero } from '@/compartilhado/formatacao/numero';
import { ResumoDoFormulario } from '@/compartilhado/formulario/ResumoDoFormulario';
import { useValidacao } from '@/compartilhado/formulario/useValidacao';
import { Botao } from '@/design-system/primitivos/Botao';
import { CampoDeTexto } from '@/design-system/primitivos/CampoDeTexto';
import { GrupoDeOpcoes } from '@/design-system/primitivos/GrupoDeOpcoes';

import { useAlterarAviso, type EmpresaResponse } from '../api/useConfiguracoes';
import { useResultadoDoCartao } from '../hooks/useResultadoDoCartao';

import { Cartao } from './Cartao';
import estilos from './CartaoDeAviso.module.css';
import { FormularioDoCartao } from './FormularioDoCartao';
import { ResultadoDoEnvio } from './ResultadoDoEnvio';
import { AVISOS_SUGERIDOS } from './rotulos';
import { MAXIMO_DE_DIAS, MINIMO_DE_DIAS, ROTULOS_DO_AVISO, validarAviso } from './validacaoDoAviso';

const OPCOES = AVISOS_SUGERIDOS.map((dias) => ({ valor: String(dias), rotulo: `${dias} dias` }));

const PADRAO_DE_DIAS = 30;

/**
 * Com quantos dias de antecedência avisar antes de um documento vencer.
 *
 * <p>Este número não é decoração: ele governa a coluna Situação da tela de Aeronaves. Encolher a
 * janela tira aeronaves de "Atenção"; alargá-la coloca outras. É a razão de a tela dizer o que o
 * número faz, e não só pedi-lo.
 *
 * <p>Como no cartão da empresa, o rascunho só volta ao valor do servidor quando este cartão salva.
 */
export function CartaoDeAviso({ empresa }: { empresa: EmpresaResponse }) {
  const vigente = empresa.diasDeAviso ?? PADRAO_DE_DIAS;
  const [rascunho, setRascunho] = useState({ diasDeAviso: String(vigente) });
  const alterar = useAlterarAviso();
  const validacao = useValidacao({
    erros: validarAviso(rascunho),
    valores: rascunho,
    rotulos: ROTULOS_DO_AVISO,
    falha: alterar.error,
  });
  const { resultado, aoEditar, salvarSeMudou } = useResultadoDoCartao(
    alterar,
    'Antecedência salva.',
  );

  const sugerido = OPCOES.some((opcao) => opcao.valor === rascunho.diasDeAviso)
    ? rascunho.diasDeAviso
    : '';

  function mudar(diasDeAviso: string) {
    aoEditar();
    setRascunho({ diasDeAviso });
  }

  function salvar() {
    const dias = lerNumero(rascunho.diasDeAviso);
    if (dias === null) {
      return;
    }
    salvarSeMudou(dias !== vigente, () =>
      alterar.mutate(dias, {
        onSuccess: (salva) => setRascunho({ diasDeAviso: String(salva.diasDeAviso ?? dias) }),
      }),
    );
  }

  return (
    <Cartao
      titulo="Alertas de vencimento"
      descricao="Com quantos dias de antecedência o sistema deve avisar antes de um documento vencer. Vale para o CVA e para a apólice RETA de toda a frota."
    >
      <FormularioDoCartao
        aoEnviar={() => validacao.enviar(salvar)}
        refDoFormulario={validacao.refDoFormulario}
      >
        <GrupoDeOpcoes
          rotulo="Antecedência do aviso"
          valor={sugerido}
          opcoes={OPCOES}
          aoEscolher={mudar}
        />

        <div className={estilos.campo}>
          <CampoDeTexto
            rotulo={ROTULOS_DO_AVISO.diasDeAviso}
            obrigatorio
            valor={rascunho.diasDeAviso}
            aoMudar={mudar}
            inputMode="numeric"
            alinhamento="direita"
            maxLength={3}
            apoio={`Dias antes do vencimento, de ${MINIMO_DE_DIAS} a ${MAXIMO_DE_DIAS}.`}
            erro={validacao.erroDe('diasDeAviso')}
          />
        </div>

        <div className={estilos.acao}>
          <Botao tipo="submit" carregando={alterar.isPending}>
            Salvar antecedência
          </Botao>
          <ResumoDoFormulario resumo={validacao.resumo} />
          <ResultadoDoEnvio resultado={resultado} />
        </div>
      </FormularioDoCartao>
    </Cartao>
  );
}
