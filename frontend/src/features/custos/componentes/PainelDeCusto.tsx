import { useId, useState } from 'react';

import { hojeLocal } from '@/compartilhado/formatacao/datas';
import { ResumoDoFormulario } from '@/compartilhado/formulario/ResumoDoFormulario';
import { useValidacao } from '@/compartilhado/formulario/useValidacao';
import { Botao } from '@/design-system/primitivos/Botao';
import { CampoDeTexto } from '@/design-system/primitivos/CampoDeTexto';
import { GrupoDeOpcoes } from '@/design-system/primitivos/GrupoDeOpcoes';
import { PainelModal } from '@/design-system/primitivos/PainelModal';
import { Selecao } from '@/design-system/primitivos/Selecao';
import { Texto } from '@/design-system/primitivos/Texto';

import {
  useCorrigirCusto,
  useRegistrarCusto,
  type CategoriaDeCusto,
  type CustoResponse,
  type MoedaDoCusto,
  type TipoDeCusto,
} from '../api/useCustos';
import { useListasDoCusto } from '../hooks/useListasDoCusto';

import { apoioDoRelatorioDeVoo } from './apoiosDoCusto';
import { emReais } from './conversaoEmReais';
import estilos from './PainelDeCusto.module.css';
import { corpoDoCusto, rascunhoInicial, type RascunhoDoCusto } from './rascunhoDoCusto';
import { CATEGORIAS, categoriasDoTipo, moedaEmTexto } from './rotulos';
import {
  PRIMEIRA_DATA_DO_CUSTO,
  ROTULOS_DO_CUSTO,
  ultimaDataDoCusto,
  validarCusto,
} from './validacaoDoCusto';

interface PainelDeCustoProps {
  custo?: CustoResponse;
  aeronaveInicial?: string;
  aoFechar: () => void;
}

/**
 * Registrar e corrigir lançamento, nas seções do protótipo: classificação, atribuição, valor e
 * documento. A categoria é filha do tipo, e em USD a conversão aparece ao vivo, mas quem grava o
 * BRL é o servidor, uma vez. As regras estão em `validarCusto`; aqui só se ligam as peças.
 */
export function PainelDeCusto({ custo, aeronaveInicial, aoFechar }: PainelDeCustoProps) {
  const editando = custo?.id != null;
  const titulo = editando ? 'Corrigir custo' : 'Registrar custo';
  const idDoResumo = useId();
  const [rascunho, setRascunho] = useState(() => rascunhoInicial(custo, aeronaveInicial));
  const [tipo, setTipo] = useState<TipoDeCusto>(custo?.tipo ?? 'VARIAVEL');

  const registrar = useRegistrarCusto();
  const corrigir = useCorrigirCusto();
  const mutacao = editando ? corrigir : registrar;
  const listas = useListasDoCusto(custo, rascunho);
  const { efetivo } = listas;
  const hoje = hojeLocal();
  const erros = validarCusto(efetivo, { hoje, donos: listas.donos });
  const validacao = useValidacao({
    erros,
    valores: efetivo,
    rotulos: ROTULOS_DO_CUSTO,
    falha: mutacao.error,
  });
  const conversao = erros.valor || erros.cambio ? null : emReais(efetivo.valor, efetivo.cambio);

  function alterar<C extends keyof RascunhoDoCusto>(campo: C) {
    return (valor: RascunhoDoCusto[C]) => setRascunho((atual) => ({ ...atual, [campo]: valor }));
  }

  function escolherAeronave(escolhida: string) {
    // O dono de uma aeronave não é dono da outra.
    setRascunho((atual) => ({ ...atual, aeronaveId: escolhida, proprietarioId: '' }));
  }

  function escolherTipo(escolhido: TipoDeCusto) {
    setTipo(escolhido);
    // A categoria é filha do tipo: só sai se não for do tipo novo.
    setRascunho((atual) =>
      atual.categoria !== '' && CATEGORIAS[atual.categoria].tipo !== escolhido
        ? { ...atual, categoria: '' }
        : atual,
    );
  }

  function salvar() {
    const corpo = corpoDoCusto(efetivo);
    if (corpo === undefined) {
      return;
    }
    if (custo?.id != null) {
      corrigir.mutate({ id: custo.id, custo: corpo }, { onSuccess: aoFechar });
    } else {
      registrar.mutate(corpo, { onSuccess: aoFechar });
    }
  }

  return (
    <PainelModal aberto aoFechar={aoFechar} rotulo={titulo} podeFechar={!mutacao.isPending}>
      <Texto variante="titulo" como="h2">
        {titulo}
      </Texto>

      {listas.falharam ? (
        <div className={estilos.recado} role="alert">
          <Texto variante="apoio" tom="critico" como="p">
            Não foi possível carregar as aeronaves ou os proprietários do painel.
          </Texto>
          <Botao variante="secundario" tamanho="pequeno" aoClicar={listas.recarregar}>
            Tentar de novo
          </Botao>
        </div>
      ) : null}

      <div ref={validacao.refDoFormulario} className={estilos.campos}>
        <Texto variante="legenda" tom="suave" como="h3">
          Classificação
        </Texto>
        <Selecao
          rotulo="Aeronave"
          obrigatorio
          valor={efetivo.aeronaveId}
          desabilitado={editando}
          opcoes={listas.opcoesDeAeronaves}
          aoMudar={escolherAeronave}
          erro={validacao.erroDe('aeronaveId')}
        />
        <GrupoDeOpcoes
          rotulo="Tipo"
          valor={tipo}
          opcoes={[
            { valor: 'FIXO', rotulo: 'Custo Fixo' },
            { valor: 'VARIAVEL', rotulo: 'Custo Variável' },
          ]}
          aoEscolher={(escolhido) => escolherTipo(escolhido as TipoDeCusto)}
          marcador
          larguraIgual
        />
        <div className={estilos.grade}>
          <Selecao
            rotulo="Categoria"
            obrigatorio
            valor={efetivo.categoria}
            opcoes={[
              { valor: '', rotulo: 'Selecione…' },
              ...categoriasDoTipo(tipo).map((cada) => ({
                valor: cada,
                rotulo: CATEGORIAS[cada].rotulo,
              })),
            ]}
            aoMudar={(escolhida) => alterar('categoria')(escolhida as CategoriaDeCusto | '')}
            erro={validacao.erroDe('categoria')}
          />
          <CampoDeTexto
            rotulo="Data do custo"
            tipo="data"
            obrigatorio
            valor={efetivo.data}
            aoMudar={alterar('data')}
            minimo={PRIMEIRA_DATA_DO_CUSTO}
            maximo={ultimaDataDoCusto(hoje)}
            erro={validacao.erroDe('data')}
          />
        </div>

        <Texto variante="legenda" tom="suave" como="h3">
          Atribuição
        </Texto>
        <div className={estilos.grade}>
          <Selecao
            rotulo="Atribuição"
            valor={efetivo.proprietarioId}
            opcoes={listas.opcoesDeDonos}
            aoMudar={alterar('proprietarioId')}
            apoio={listas.apoioDaAtribuicao}
            erro={validacao.erroDe('proprietarioId')}
          />
          <CampoDeTexto
            rotulo="Rel-voo (opcional)"
            valor={efetivo.relatorioDeVoo}
            aoMudar={alterar('relatorioDeVoo')}
            exemplo="RV-2026-041"
            apoio={apoioDoRelatorioDeVoo(tipo)}
            erro={validacao.erroDe('relatorioDeVoo')}
          />
        </div>

        <Texto variante="legenda" tom="suave" como="h3">
          Valor
        </Texto>
        <GrupoDeOpcoes
          rotulo="Moeda"
          obrigatorio
          valor={efetivo.moeda}
          opcoes={[
            { valor: 'BRL', rotulo: 'BRL' },
            { valor: 'USD', rotulo: 'USD' },
          ]}
          aoEscolher={(escolhida) => alterar('moeda')(escolhida as MoedaDoCusto)}
          marcador
          larguraIgual
          erro={validacao.erroDe('moeda')}
        />
        <div className={estilos.grade}>
          <CampoDeTexto
            rotulo={efetivo.moeda === 'BRL' ? 'Valor (R$)' : 'Valor (US$)'}
            obrigatorio
            valor={efetivo.valor}
            aoMudar={alterar('valor')}
            inputMode="decimal"
            exemplo="15.725,00"
            erro={validacao.erroDe('valor')}
          />
          {efetivo.moeda === 'USD' ? (
            <CampoDeTexto
              rotulo="Câmbio do dia (R$ por US$ 1)"
              obrigatorio
              valor={efetivo.cambio}
              aoMudar={alterar('cambio')}
              inputMode="decimal"
              exemplo="4,9223"
              apoio="Até 4 casas decimais."
              erro={validacao.erroDe('cambio')}
            />
          ) : null}
        </div>
        {efetivo.moeda === 'USD' ? (
          <div aria-live="polite">
            {conversao === null ? null : (
              <Texto variante="apoio" tom="suave" como="p">
                = {moedaEmTexto(conversao)} — o servidor grava a conversão uma única vez, no ato.
              </Texto>
            )}
          </div>
        ) : null}

        <Texto variante="legenda" tom="suave" como="h3">
          Documento
        </Texto>
        <CampoDeTexto
          rotulo="Descrição"
          obrigatorio
          valor={efetivo.descricao}
          aoMudar={alterar('descricao')}
          exemplo="Jet A-1 — 1.850 L — SBRJ"
          erro={validacao.erroDe('descricao')}
        />
        <CampoDeTexto
          rotulo="N. Fiscal / Invoice (opcional)"
          valor={efetivo.notaFiscal}
          aoMudar={alterar('notaFiscal')}
          erro={validacao.erroDe('notaFiscal')}
        />
      </div>

      <ResumoDoFormulario resumo={validacao.resumo} id={idDoResumo} />
      <div className={estilos.acoes}>
        <Botao variante="secundario" aoClicar={aoFechar} desabilitado={mutacao.isPending}>
          Cancelar
        </Botao>
        <Botao
          aoClicar={() => validacao.enviar(salvar)}
          carregando={mutacao.isPending}
          descritoPor={idDoResumo}
        >
          {editando ? 'Salvar correção' : 'Registrar custo'}
        </Botao>
      </div>
    </PainelModal>
  );
}
