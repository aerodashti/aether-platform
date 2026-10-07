import { useEffect, useId, useRef, useState } from 'react';

import { useAeronaves } from '@/compartilhado/aeronaves/useAeronaves';
import { hojeLocal } from '@/compartilhado/formatacao/datas';
import { Formulario } from '@/compartilhado/formulario/Formulario';
import { ResumoDoFormulario } from '@/compartilhado/formulario/ResumoDoFormulario';
import { useValidacao } from '@/compartilhado/formulario/useValidacao';
import { useVinculosVigentes } from '@/compartilhado/participacoes/useVinculosVigentes';
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
import {
  corpoDoRendimento,
  rascunhoInicial,
  rendimentoPeloExtrato,
  type RascunhoDoRendimento,
} from './rascunhoDoRendimento';
import { PRIMEIRA_DATA } from './regrasDoFundo';
import { moedaEmTexto } from './rotulos';
import { ROTULOS_DO_RENDIMENTO, validarRendimento } from './validacaoDoRendimento';

interface FormularioDeRendimentoProps {
  rendimento?: RendimentoResponse;
  aeronaveInicial?: string;
  aoFechar: () => void;
  /** O rendimento como o servidor o gravou, para a página confirmar o que foi salvo. */
  aoSalvar: (rendimento: RendimentoResponse) => void;
}

function apoioDoRendimento(extrato: number | null): string {
  return extrato === null
    ? 'O que o banco creditou. Saldo e taxa são só o extrato e não recalculam o valor.'
    : `Pelo extrato, saldo × taxa dá ${moedaEmTexto(extrato)}; vale o que o banco creditou.`;
}

/**
 * O formulário de rendimento embutido abaixo da grade, como no protótipo: são campos que se copiam
 * do extrato, e um modal tiraria o extrato da vista. As regras estão em `validarRendimento`.
 */
export function FormularioDeRendimento({
  rendimento,
  aeronaveInicial,
  aoFechar,
  aoSalvar,
}: FormularioDeRendimentoProps) {
  const editando = rendimento?.id != null;
  const titulo = editando ? 'Corrigir rendimento' : 'Novo rendimento';
  const idDoResumo = useId();
  const hoje = hojeLocal();
  const secao = useRef<HTMLElement>(null);
  const [rascunho, setRascunho] = useState(() =>
    rascunhoInicial(rendimento, aeronaveInicial, hoje),
  );

  const aeronaves = useAeronaves();
  const vinculos = useVinculosVigentes();
  const registrar = useRegistrarRendimento();
  const corrigir = useCorrigirRendimento();
  const mutacao = editando ? corrigir : registrar;
  const validacao = useValidacao({
    erros: validarRendimento(rascunho, { hoje }),
    valores: rascunho,
    rotulos: ROTULOS_DO_RENDIMENTO,
    falha: mutacao.error,
  });
  const semContrato =
    rascunho.aeronaveId !== '' &&
    vinculos.data !== undefined &&
    !vinculos.data.some((vinculo) => String(vinculo.aeronaveId) === rascunho.aeronaveId);

  // Aberto por um botão que sai de cena, o foco cairia no <body>: ele vem para o formulário.
  useEffect(() => {
    secao.current?.focus();
  }, []);

  function alterar(campo: keyof RascunhoDoRendimento) {
    return (valor: string) => setRascunho((atual) => ({ ...atual, [campo]: valor }));
  }

  function salvar() {
    const corpo = corpoDoRendimento(rascunho);
    if (corpo === undefined) {
      return;
    }
    if (rendimento?.id != null) {
      corrigir.mutate(
        { id: rendimento.id, rendimento: corpo },
        { onSuccess: (gravado) => aoSalvar(gravado) },
      );
    } else {
      registrar.mutate(corpo, { onSuccess: (gravado) => aoSalvar(gravado) });
    }
  }

  const apoiosDaAeronave = [
    editando ? 'A aeronave não muda na correção: para trocar, exclua e registre de novo.' : '',
    semContrato
      ? 'Sem contrato vigente: o rendimento entra no fundo, mas não é rateado entre proprietários.'
      : '',
  ].filter(Boolean);

  return (
    <Formulario referencia={validacao.refDoFormulario} aoEnviar={() => validacao.enviar(salvar)}>
      <section ref={secao} tabIndex={-1} className={estilos.formulario} aria-label={titulo}>
        <Texto variante="subtitulo" como="h3">
          {titulo}
        </Texto>
        <div className={estilos.campos}>
          <Selecao
            rotulo="Aeronave"
            obrigatorio
            valor={rascunho.aeronaveId}
            desabilitado={editando}
            opcoes={[
              { valor: '', rotulo: 'Selecione…' },
              ...(aeronaves.data ?? []).map((aeronave) => ({
                valor: String(aeronave.id),
                rotulo: aeronave.matricula ?? '',
              })),
            ]}
            aoMudar={alterar('aeronaveId')}
            apoio={apoiosDaAeronave.join(' ') || undefined}
            erro={validacao.erroDe('aeronaveId')}
          />
          <CampoDeTexto
            rotulo="Data do crédito"
            tipo="data"
            obrigatorio
            valor={rascunho.data}
            aoMudar={alterar('data')}
            minimo={PRIMEIRA_DATA}
            maximo={hoje}
            apoio="Só depois que o crédito cair. A competência é o mês desta data."
            erro={validacao.erroDe('data')}
          />
          <CampoDeTexto
            rotulo="Aplicação"
            obrigatorio
            valor={rascunho.aplicacao}
            aoMudar={alterar('aplicacao')}
            maxLength={60}
            exemplo="CDB, Tesouro Selic…"
            erro={validacao.erroDe('aplicacao')}
          />
          <CampoDeTexto
            rotulo="Saldo aplicado (R$, opcional)"
            valor={rascunho.saldoAplicado}
            aoMudar={alterar('saldoAplicado')}
            inputMode="decimal"
            alinhamento="direita"
            exemplo="104.200,00"
            apoio="Do extrato, para conferência."
            erro={validacao.erroDe('saldoAplicado')}
          />
          <CampoDeTexto
            rotulo="Taxa do mês (%, opcional)"
            valor={rascunho.taxa}
            aoMudar={alterar('taxa')}
            inputMode="decimal"
            alinhamento="direita"
            exemplo="0,91"
            apoio="Até 10% ao mês, com até 4 casas."
            erro={validacao.erroDe('taxa')}
          />
          <CampoDeTexto
            rotulo="Rendimento (R$)"
            obrigatorio
            valor={rascunho.valor}
            aoMudar={alterar('valor')}
            inputMode="decimal"
            alinhamento="direita"
            exemplo="948,22"
            apoio={apoioDoRendimento(rendimentoPeloExtrato(rascunho))}
            erro={validacao.erroDe('valor')}
          />
        </div>
        <ResumoDoFormulario resumo={validacao.resumo} id={idDoResumo} />
        <div className={estilos.acoes}>
          <Botao tipo="submit" carregando={mutacao.isPending} descritoPor={idDoResumo}>
            {editando ? 'Salvar correção' : 'Registrar rendimento'}
          </Botao>
          <Botao variante="secundario" aoClicar={aoFechar} desabilitado={mutacao.isPending}>
            Cancelar
          </Botao>
        </div>
      </section>
    </Formulario>
  );
}
