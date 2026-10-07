import { useId, useState } from 'react';

import { useAeronaves } from '@/compartilhado/aeronaves/useAeronaves';
import { hojeLocal } from '@/compartilhado/formatacao/datas';
import { Formulario } from '@/compartilhado/formulario/Formulario';
import { ResumoDoFormulario } from '@/compartilhado/formulario/ResumoDoFormulario';
import { useValidacao } from '@/compartilhado/formulario/useValidacao';
import { Botao } from '@/design-system/primitivos/Botao';
import { CampoDeTexto } from '@/design-system/primitivos/CampoDeTexto';
import { LinkDeTexto } from '@/design-system/primitivos/LinkDeTexto';
import { PainelModal } from '@/design-system/primitivos/PainelModal';
import { Selecao } from '@/design-system/primitivos/Selecao';
import { Texto } from '@/design-system/primitivos/Texto';

import { useCorrigirAporte, useRegistrarAporte, type AporteResponse } from '../api/useAportes';
import { useDonosDoAporte } from '../hooks/useDonosDoAporte';

import { opcoesDoProprietario } from './donosDoAporte';
import estilos from './PainelDeAporte.module.css';
import {
  competenciaPadrao,
  corpoDoAporte,
  rascunhoInicial,
  type RascunhoDoAporte,
} from './rascunhoDoAporte';
import { PRIMEIRA_DATA } from './regrasDoFundo';
import { ROTULOS_DO_APORTE, janelaDoAporte, validarAporte } from './validacaoDoAporte';

interface PainelDeAporteProps {
  aporte?: AporteResponse;
  aeronaveInicial?: string;
  aoFechar: () => void;
  /** O aporte como o servidor o gravou, para a página confirmar o que foi salvo. */
  aoSalvar: (aporte: AporteResponse) => void;
}

/**
 * Registrar e corrigir aporte. A lista de proprietários é a do contrato vigente da aeronave
 * escolhida; as regras estão em `validarAporte`, e aqui só se ligam as peças.
 */
export function PainelDeAporte({
  aporte,
  aeronaveInicial,
  aoFechar,
  aoSalvar,
}: PainelDeAporteProps) {
  const editando = aporte?.id != null;
  const titulo = editando ? 'Corrigir aporte' : 'Registrar aporte';
  const idDoResumo = useId();
  const hoje = hojeLocal();
  const [rascunho, setRascunho] = useState(() => rascunhoInicial(aporte, aeronaveInicial, hoje));
  // Enquanto a pessoa não escolhe a competência, ela acompanha a data: o mês anterior ao crédito.
  const [competenciaEscolhida, setCompetenciaEscolhida] = useState(editando);

  const aeronaves = useAeronaves();
  const donos = useDonosDoAporte(rascunho.aeronaveId, aporte);
  const registrar = useRegistrarAporte();
  const corrigir = useCorrigirAporte();
  const mutacao = editando ? corrigir : registrar;
  const validacao = useValidacao({
    erros: validarAporte(rascunho, { hoje, donos: donos.situacao }),
    valores: rascunho,
    rotulos: ROTULOS_DO_APORTE,
    falha: mutacao.error,
  });
  const aeronave = aeronaves.data?.find((cada) => String(cada.id) === rascunho.aeronaveId);
  const semContrato = rascunho.aeronaveId !== '' && donos.situacao === 'semContrato';

  function alterar<C extends keyof RascunhoDoAporte>(campo: C) {
    return (valor: RascunhoDoAporte[C]) => setRascunho((atual) => ({ ...atual, [campo]: valor }));
  }

  function escolherAeronave(escolhida: string) {
    // O dono de uma aeronave não é dono da outra.
    setRascunho((atual) => ({ ...atual, aeronaveId: escolhida, proprietarioId: '' }));
  }

  function mudarData(data: string) {
    setRascunho((atual) => ({
      ...atual,
      data,
      competencia: competenciaEscolhida ? atual.competencia : competenciaPadrao(data),
    }));
  }

  function mudarCompetencia(competencia: string) {
    setCompetenciaEscolhida(true);
    alterar('competencia')(competencia);
  }

  function salvar() {
    const corpo = corpoDoAporte(rascunho);
    if (corpo === undefined) {
      return;
    }
    if (aporte?.id != null) {
      corrigir.mutate(
        { id: aporte.id, aporte: corpo },
        { onSuccess: (gravado) => aoSalvar(gravado) },
      );
    } else {
      registrar.mutate(corpo, { onSuccess: (gravado) => aoSalvar(gravado) });
    }
  }

  return (
    <PainelModal aberto aoFechar={aoFechar} rotulo={titulo} podeFechar={!mutacao.isPending}>
      <Formulario referencia={validacao.refDoFormulario} aoEnviar={() => validacao.enviar(salvar)}>
        <Texto variante="titulo" como="h2">
          {titulo}
        </Texto>
        <Texto variante="apoio" tom="suave" como="p">
          Um aporte de proprietário no fundo da aeronave. Ele entra no total aportado da
          competência.
        </Texto>

        <div className={estilos.grade}>
          <Selecao
            rotulo="Aeronave"
            obrigatorio
            valor={rascunho.aeronaveId}
            desabilitado={editando}
            opcoes={[
              { valor: '', rotulo: 'Selecione…' },
              ...(aeronaves.data ?? []).map((cada) => ({
                valor: String(cada.id),
                rotulo: `${cada.matricula} — ${cada.modelo}`,
              })),
            ]}
            aoMudar={escolherAeronave}
            apoio={
              editando
                ? 'A aeronave não muda na correção: para trocar, exclua e registre de novo.'
                : undefined
            }
            erro={validacao.erroDe('aeronaveId')}
          />
          <Selecao
            rotulo="Proprietário"
            obrigatorio
            valor={rascunho.proprietarioId}
            desabilitado={rascunho.aeronaveId === ''}
            opcoes={opcoesDoProprietario(rascunho.aeronaveId, donos.situacao, donos.donos)}
            aoMudar={alterar('proprietarioId')}
            erro={validacao.erroDe('proprietarioId')}
          />
          {donos.situacao === 'falhou' ? (
            <div className={estilos.recado} role="alert">
              <Texto variante="apoio" tom="critico" como="p">
                Não foi possível carregar os proprietários do contrato.
              </Texto>
              <Botao variante="secundario" tamanho="pequeno" aoClicar={donos.recarregar}>
                Tentar de novo
              </Botao>
            </div>
          ) : null}
          {semContrato ? (
            <div className={estilos.recado}>
              <Texto variante="apoio" tom="suave" como="p">
                {aeronave?.matricula ?? 'Esta aeronave'} não tem contrato vigente, e o aporte é de
                quem participa dela.
              </Texto>
              <LinkDeTexto para={`/aeronaves/${rascunho.aeronaveId}`}>
                Cadastrar o contrato da aeronave
              </LinkDeTexto>
            </div>
          ) : null}
          <CampoDeTexto
            rotulo="Data do crédito"
            tipo="data"
            obrigatorio
            valor={rascunho.data}
            aoMudar={mudarData}
            minimo={PRIMEIRA_DATA}
            maximo={hoje}
            apoio="O aporte é registrado como recebido: só depois que a transferência cair na conta."
            erro={validacao.erroDe('data')}
          />
          <CampoDeTexto
            rotulo="Competência"
            tipo="mes"
            obrigatorio
            valor={rascunho.competencia}
            aoMudar={mudarCompetencia}
            minimo={janelaDoAporte(hoje).primeira}
            maximo={janelaDoAporte(hoje).ultima}
            exemplo="AAAA-MM"
            apoio="O mês a que o aporte se refere — em geral o anterior ao do crédito: o aporte de setembro cai em outubro."
            erro={validacao.erroDe('competencia')}
          />
          <CampoDeTexto
            rotulo="Valor (R$)"
            obrigatorio
            valor={rascunho.valor}
            aoMudar={alterar('valor')}
            inputMode="decimal"
            alinhamento="direita"
            exemplo="25.000,00"
            erro={validacao.erroDe('valor')}
          />
        </div>

        <ResumoDoFormulario resumo={validacao.resumo} id={idDoResumo} />
        <div className={estilos.acoes}>
          <Botao variante="secundario" aoClicar={aoFechar} desabilitado={mutacao.isPending}>
            Cancelar
          </Botao>
          <Botao tipo="submit" carregando={mutacao.isPending} descritoPor={idDoResumo}>
            {editando ? 'Salvar correção' : 'Registrar aporte'}
          </Botao>
        </div>
      </Formulario>
    </PainelModal>
  );
}
