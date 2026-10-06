import { useState } from 'react';

import { ErroDeApi } from '@/api/cliente';
import { useAeronaves } from '@/compartilhado/aeronaves/useAeronaves';
import { Botao } from '@/design-system/primitivos/Botao';
import { CampoDeTexto } from '@/design-system/primitivos/CampoDeTexto';
import { Selecao } from '@/design-system/primitivos/Selecao';
import { Texto } from '@/design-system/primitivos/Texto';

import {
  useCorrigirRendimento,
  useRegistrarRendimento,
  type RendimentoResponse,
} from '../api/useAportes';

import estilos from './FormularioDeRendimento.module.css';
import { hoje, lerValor, valorParaCampo } from './rotulos';

interface FormularioDeRendimentoProps {
  rendimento?: RendimentoResponse;
  aeronaveInicial?: string;
  aoFechar: () => void;
}

function opcional(texto: string): number | undefined {
  return texto.trim() === '' ? undefined : lerValor(texto);
}

/**
 * O formulário de rendimento embutido abaixo da grade, como no protótipo: são cinco campos que se
 * copiam do extrato, e um modal tiraria o extrato da vista.
 */
export function FormularioDeRendimento({
  rendimento,
  aeronaveInicial,
  aoFechar,
}: FormularioDeRendimentoProps) {
  const editando = rendimento?.id != null;
  const [aeronaveId, setAeronaveId] = useState(
    rendimento?.aeronaveId != null ? String(rendimento.aeronaveId) : (aeronaveInicial ?? ''),
  );
  const [data, setData] = useState(rendimento?.data ?? hoje());
  const [aplicacao, setAplicacao] = useState(rendimento?.aplicacao ?? '');
  const [saldoAplicado, setSaldoAplicado] = useState(valorParaCampo(rendimento?.saldoAplicado));
  const [taxa, setTaxa] = useState(valorParaCampo(rendimento?.taxa));
  const [valor, setValor] = useState(valorParaCampo(rendimento?.valor));

  const aeronaves = useAeronaves();
  const registrar = useRegistrarRendimento();
  const corrigir = useCorrigirRendimento();
  const mutacao = editando ? corrigir : registrar;

  function salvar() {
    const corpo = {
      aeronaveId: Number(aeronaveId),
      data,
      aplicacao,
      saldoAplicado: opcional(saldoAplicado),
      taxa: opcional(taxa),
      valor: lerValor(valor),
    };
    if (rendimento?.id != null) {
      corrigir.mutate({ id: rendimento.id, rendimento: corpo }, { onSuccess: aoFechar });
    } else {
      registrar.mutate(corpo, { onSuccess: aoFechar });
    }
  }

  const erro = mutacao.error instanceof ErroDeApi ? mutacao.error.message : undefined;
  const valorLido = lerValor(valor);
  const podeSalvar =
    aeronaveId !== '' &&
    data !== '' &&
    aplicacao.trim() !== '' &&
    Number.isFinite(valorLido) &&
    valorLido > 0;

  return (
    <section
      className={estilos.formulario}
      aria-label={editando ? 'Corrigir rendimento' : 'Novo rendimento'}
    >
      <Texto variante="subtitulo" como="h3">
        {editando ? 'Corrigir rendimento' : 'Novo rendimento'}
      </Texto>
      <div className={estilos.campos}>
        {aeronaveInicial && !editando ? null : (
          <Selecao
            rotulo="Aeronave"
            valor={aeronaveId}
            desabilitado={editando}
            opcoes={[
              { valor: '', rotulo: 'Selecione…' },
              ...(aeronaves.data ?? []).map((aeronave) => ({
                valor: String(aeronave.id),
                rotulo: aeronave.matricula ?? '',
              })),
            ]}
            aoMudar={setAeronaveId}
          />
        )}
        <CampoDeTexto rotulo="Data do crédito" tipo="data" valor={data} aoMudar={setData} />
        <CampoDeTexto
          rotulo="Aplicação"
          valor={aplicacao}
          aoMudar={setAplicacao}
          maxLength={60}
          exemplo="CDB, Tesouro Selic…"
        />
        <CampoDeTexto
          rotulo="Saldo aplicado (R$)"
          valor={saldoAplicado}
          aoMudar={setSaldoAplicado}
          inputMode="decimal"
          alinhamento="direita"
        />
        <CampoDeTexto
          rotulo="Taxa do mês (%)"
          valor={taxa}
          aoMudar={setTaxa}
          inputMode="decimal"
          alinhamento="direita"
        />
        <CampoDeTexto
          rotulo="Rendimento (R$)"
          valor={valor}
          aoMudar={setValor}
          inputMode="decimal"
          alinhamento="direita"
          erro={erro}
        />
      </div>
      <div className={estilos.acoes}>
        <Botao aoClicar={salvar} desabilitado={!podeSalvar} carregando={mutacao.isPending}>
          {editando ? 'Salvar correção' : 'Registrar rendimento'}
        </Botao>
        <Botao variante="secundario" aoClicar={aoFechar}>
          Cancelar
        </Botao>
      </div>
    </section>
  );
}
