import { useState } from 'react';

import { ResumoDoFormulario } from '@/compartilhado/formulario/ResumoDoFormulario';
import { useValidacao } from '@/compartilhado/formulario/useValidacao';
import { Botao } from '@/design-system/primitivos/Botao';
import { CampoDeTexto } from '@/design-system/primitivos/CampoDeTexto';
import { PainelModal } from '@/design-system/primitivos/PainelModal';
import { Selecao } from '@/design-system/primitivos/Selecao';
import { Texto } from '@/design-system/primitivos/Texto';

import {
  useAtualizarConfiguracaoFinanceira,
  type BaseDoRateio,
  type DetalheDaAeronaveResponse,
  type ModeloDeAporte,
} from '../api/useDetalheDaAeronave';

import estilos from './PainelFinanceiro.module.css';
import {
  configuracaoParaEnvio,
  rascunhoDaConfiguracao,
  ROTULOS_DA_CONFIGURACAO,
  type CampoDaConfiguracao,
  type RascunhoDaConfiguracao,
} from './rascunhoDaConfiguracaoFinanceira';
import { PERIODICIDADES, ROTULO_DA_BASE_DO_RATEIO, ROTULO_DO_MODELO_DE_APORTE } from './rotulos';
import { validarConfiguracaoFinanceira } from './validacaoDaConfiguracaoFinanceira';

interface PainelFinanceiroProps {
  detalhe: DetalheDaAeronaveResponse;
  aoFechar: () => void;
}

const OPCOES_DA_BASE = (Object.keys(ROTULO_DA_BASE_DO_RATEIO) as BaseDoRateio[]).map((valor) => ({
  valor,
  rotulo: ROTULO_DA_BASE_DO_RATEIO[valor],
}));

const OPCOES_DO_MODELO = (Object.keys(ROTULO_DO_MODELO_DE_APORTE) as ModeloDeAporte[]).map(
  (valor) => ({ valor, rotulo: ROTULO_DO_MODELO_DE_APORTE[valor] }),
);

const OPCOES_DE_PERIODICIDADE = PERIODICIDADES.map((opcao) => ({
  valor: String(opcao.valor),
  rotulo: opcao.rotulo,
}));

/**
 * Rateio e fundo. O fechamento é recalculado a cada leitura com a configuração de agora (ADR-0019):
 * a base do rateio e o saldo de abertura valem para todos os meses, inclusive os já fechados, e o
 * painel diz isso antes de salvar.
 */
export function PainelFinanceiro({ detalhe, aoFechar }: PainelFinanceiroProps) {
  const [rascunho, setRascunho] = useState(() => rascunhoDaConfiguracao(detalhe));
  const atualizar = useAtualizarConfiguracaoFinanceira(detalhe.id ?? 0);

  const validacao = useValidacao<CampoDaConfiguracao>({
    erros: validarConfiguracaoFinanceira(rascunho),
    valores: rascunho,
    rotulos: ROTULOS_DA_CONFIGURACAO,
    falha: atualizar.error,
  });

  function alterar<C extends CampoDaConfiguracao>(campo: C) {
    return (valor: string) =>
      setRascunho((atual) => ({ ...atual, [campo]: valor as RascunhoDaConfiguracao[C] }));
  }

  function enviar() {
    validacao.enviar(() =>
      atualizar.mutate(configuracaoParaEnvio(rascunho), { onSuccess: aoFechar }),
    );
  }

  return (
    <PainelModal
      aberto
      aoFechar={aoFechar}
      rotulo="Alterar configuração financeira"
      podeFechar={!atualizar.isPending}
    >
      <form
        noValidate
        onSubmit={(evento) => {
          evento.preventDefault();
          enviar();
        }}
      >
        <div ref={validacao.refDoFormulario} className={estilos.formulario}>
          <Texto variante="titulo" como="h2">
            Configuração financeira
          </Texto>
          <Texto variante="apoio" tom="suave" como="p">
            Como os custos são divididos e como o fundo é abastecido.
          </Texto>

          <Selecao
            rotulo={ROTULOS_DA_CONFIGURACAO.baseDoRateio}
            valor={rascunho.baseDoRateio}
            opcoes={OPCOES_DA_BASE}
            aoMudar={alterar('baseDoRateio')}
            erro={validacao.erroDe('baseDoRateio')}
            obrigatorio
            apoio="Vale para todos os meses, inclusive os já fechados: o fechamento é recalculado com a base atual."
          />
          <Selecao
            rotulo={ROTULOS_DA_CONFIGURACAO.modeloDeAporte}
            valor={rascunho.modeloDeAporte}
            opcoes={OPCOES_DO_MODELO}
            aoMudar={alterar('modeloDeAporte')}
            erro={validacao.erroDe('modeloDeAporte')}
            obrigatorio
          />
          <Selecao
            rotulo={ROTULOS_DA_CONFIGURACAO.periodicidadeDoAporteMeses}
            valor={rascunho.periodicidadeDoAporteMeses}
            opcoes={OPCOES_DE_PERIODICIDADE}
            aoMudar={alterar('periodicidadeDoAporteMeses')}
            erro={validacao.erroDe('periodicidadeDoAporteMeses')}
            obrigatorio
          />
          {rascunho.modeloDeAporte === 'FIXO' ? (
            <CampoDeTexto
              rotulo={ROTULOS_DA_CONFIGURACAO.valorDoAporte}
              valor={rascunho.valorDoAporte}
              aoMudar={alterar('valorDoAporte')}
              erro={validacao.erroDe('valorDoAporte')}
              obrigatorio
              inputMode="decimal"
              alinhamento="direita"
              exemplo="85.000,00"
              apoio="Cobrado a cada período da periodicidade acima."
            />
          ) : null}
          <CampoDeTexto
            rotulo={ROTULOS_DA_CONFIGURACAO.diaDeFechamento}
            valor={rascunho.diaDeFechamento}
            aoMudar={alterar('diaDeFechamento')}
            erro={validacao.erroDe('diaDeFechamento')}
            obrigatorio
            inputMode="numeric"
            apoio="De 1 a 28, para o dia existir em todo mês."
          />
          <CampoDeTexto
            rotulo={ROTULOS_DA_CONFIGURACAO.saldoDeAbertura}
            valor={rascunho.saldoDeAbertura}
            aoMudar={alterar('saldoDeAbertura')}
            erro={validacao.erroDe('saldoDeAbertura')}
            obrigatorio
            // Texto, e não `decimal`: o teclado decimal do iPhone não tem o sinal de menos, e o
            // saldo é negativo quando os proprietários devem.
            inputMode="text"
            alinhamento="direita"
            exemplo="-12.500,00"
            apoio="O que o fundo tinha quando a aeronave chegou ao Aether; negativo quando os proprietários devem. É o ponto de partida do fechamento: corrigi-lo muda o saldo de todos os meses."
          />

          <ResumoDoFormulario resumo={validacao.resumo} />
          <div className={estilos.acoes}>
            <Botao variante="secundario" aoClicar={aoFechar} desabilitado={atualizar.isPending}>
              Cancelar
            </Botao>
            <Botao tipo="submit" carregando={atualizar.isPending}>
              Salvar
            </Botao>
          </div>
        </div>
      </form>
    </PainelModal>
  );
}
