import { useState } from 'react';

import { ErroDeApi } from '@/api/cliente';
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
import { PERIODICIDADES, ROTULO_DA_BASE_DO_RATEIO, ROTULO_DO_MODELO_DE_APORTE } from './rotulos';

interface PainelFinanceiroProps {
  detalhe: DetalheDaAeronaveResponse;
  aoFechar: () => void;
}

/**
 * Rateio e fundo. A trava de "fechamento pendente" do protótipo pertence ao rateio, que ainda não
 * existe — quando existir, é o servidor que recusa, e este painel só traduz a recusa.
 */
export function PainelFinanceiro({ detalhe, aoFechar }: PainelFinanceiroProps) {
  const financeiro = detalhe.configuracaoFinanceira;
  const [baseDoRateio, setBaseDoRateio] = useState<BaseDoRateio>(
    financeiro?.baseDoRateio ?? 'POR_USO',
  );
  const [modeloDeAporte, setModeloDeAporte] = useState<ModeloDeAporte>(
    financeiro?.modeloDeAporte ?? 'FIXO',
  );
  const [periodicidade, setPeriodicidade] = useState(
    String(financeiro?.periodicidadeDoAporteMeses ?? 1),
  );
  const [valorDoAporte, setValorDoAporte] = useState(
    financeiro?.valorDoAporte === undefined ? '' : String(financeiro.valorDoAporte),
  );
  const [diaDeFechamento, setDiaDeFechamento] = useState(String(financeiro?.diaDeFechamento ?? 1));

  const atualizar = useAtualizarConfiguracaoFinanceira(detalhe.id ?? 0);

  function salvar() {
    const valor = valorDoAporte.trim().replace(',', '.');
    atualizar.mutate(
      {
        baseDoRateio,
        modeloDeAporte,
        periodicidadeDoAporteMeses: Number(periodicidade),
        valorDoAporte: valor === '' ? undefined : Number(valor),
        diaDeFechamento: Number(diaDeFechamento),
      },
      { onSuccess: aoFechar },
    );
  }

  const erro = atualizar.error instanceof ErroDeApi ? atualizar.error.message : undefined;
  const dia = Number(diaDeFechamento);
  const diaValido = Number.isInteger(dia) && dia >= 1 && dia <= 28;

  return (
    <PainelModal aberto aoFechar={aoFechar} rotulo="Alterar configuração financeira">
      <Texto variante="titulo" como="h2">
        Configuração financeira
      </Texto>
      <Texto variante="apoio" tom="suave" como="p">
        Como os custos são divididos e como o fundo é abastecido. As mudanças valem para o próximo
        fechamento.
      </Texto>

      <Selecao
        rotulo="Base do rateio"
        valor={baseDoRateio}
        opcoes={(Object.keys(ROTULO_DA_BASE_DO_RATEIO) as BaseDoRateio[]).map((valor) => ({
          valor,
          rotulo: ROTULO_DA_BASE_DO_RATEIO[valor],
        }))}
        aoMudar={(valor) => setBaseDoRateio(valor as BaseDoRateio)}
      />
      <Selecao
        rotulo="Modelo de aporte"
        valor={modeloDeAporte}
        opcoes={(Object.keys(ROTULO_DO_MODELO_DE_APORTE) as ModeloDeAporte[]).map((valor) => ({
          valor,
          rotulo: ROTULO_DO_MODELO_DE_APORTE[valor],
        }))}
        aoMudar={(valor) => setModeloDeAporte(valor as ModeloDeAporte)}
      />
      <Selecao
        rotulo="Periodicidade do aporte"
        valor={periodicidade}
        opcoes={PERIODICIDADES.map((opcao) => ({
          valor: String(opcao.valor),
          rotulo: opcao.rotulo,
        }))}
        aoMudar={setPeriodicidade}
      />
      <CampoDeTexto
        rotulo="Valor do aporte (R$)"
        valor={valorDoAporte}
        aoMudar={setValorDoAporte}
        inputMode="numeric"
        exemplo="85000,00"
        erro={erro}
      />
      <CampoDeTexto
        rotulo="Dia de fechamento da fatura"
        valor={diaDeFechamento}
        aoMudar={setDiaDeFechamento}
        inputMode="numeric"
        apoio="De 1 a 28, para o dia existir em todo mês."
      />

      <div className={estilos.acoes}>
        <Botao variante="secundario" aoClicar={aoFechar}>
          Cancelar
        </Botao>
        <Botao aoClicar={salvar} desabilitado={!diaValido} carregando={atualizar.isPending}>
          Salvar
        </Botao>
      </div>
    </PainelModal>
  );
}
