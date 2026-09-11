import { useState } from 'react';

import { ErroDeApi } from '@/api/cliente';
import { useAeronaves } from '@/compartilhado/aeronaves/useAeronaves';
import { useProprietarios } from '@/compartilhado/proprietarios/useProprietarios';
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

import estilos from './PainelDeCusto.module.css';
import { ATRIBUICAO_RATEADA, CATEGORIAS, categoriasDoTipo, moedaEmTexto } from './rotulos';

interface PainelDeCustoProps {
  custo?: CustoResponse;
  aeronaveInicial?: string;
  aoFechar: () => void;
}

function numero(texto: string): number {
  return Number(texto.trim().replace(',', '.'));
}

/**
 * Registrar e corrigir lançamento, nas seções do protótipo: classificação, atribuição, valor e
 * documento. A categoria é filha do tipo — trocar o tipo zera a categoria — e em USD a conversão
 * aparece ao vivo, mas quem grava o BRL é o servidor, uma vez.
 */
export function PainelDeCusto({ custo, aeronaveInicial, aoFechar }: PainelDeCustoProps) {
  const editando = custo?.id != null;
  const [aeronaveId, setAeronaveId] = useState(
    custo?.aeronaveId != null ? String(custo.aeronaveId) : (aeronaveInicial ?? ''),
  );
  const [tipo, setTipo] = useState<TipoDeCusto>(custo?.tipo ?? 'VARIAVEL');
  const [categoria, setCategoria] = useState<CategoriaDeCusto | ''>(custo?.categoria ?? '');
  const [data, setData] = useState(custo?.data ?? '');
  const [descricao, setDescricao] = useState(custo?.descricao ?? '');
  const [relatorioDeVoo, setRelatorioDeVoo] = useState(custo?.relatorioDeVoo ?? '');
  const [atribuicao, setAtribuicao] = useState(
    custo?.proprietarioId != null ? String(custo.proprietarioId) : '',
  );
  const [notaFiscal, setNotaFiscal] = useState(custo?.notaFiscal ?? '');
  const [moeda, setMoeda] = useState<MoedaDoCusto>(custo?.moeda ?? 'BRL');
  const [valor, setValor] = useState(
    custo?.moeda === 'USD'
      ? String(custo?.valorOriginal ?? '')
      : custo?.valor === undefined
        ? ''
        : String(custo.valor),
  );
  const [cambio, setCambio] = useState(custo?.cambio === undefined ? '' : String(custo.cambio));

  const aeronaves = useAeronaves();
  const proprietarios = useProprietarios();
  const registrar = useRegistrarCusto();
  const corrigir = useCorrigirCusto();
  const mutacao = editando ? corrigir : registrar;

  function salvar() {
    if (categoria === '') {
      return;
    }
    const corpo = {
      aeronaveId: Number(aeronaveId),
      categoria,
      data,
      descricao,
      relatorioDeVoo: relatorioDeVoo || undefined,
      proprietarioId: atribuicao === '' ? undefined : Number(atribuicao),
      notaFiscal: notaFiscal || undefined,
      moeda,
      valor: numero(valor),
      cambio: moeda === 'BRL' || cambio === '' ? undefined : numero(cambio),
    };
    if (custo?.id != null) {
      corrigir.mutate({ id: custo.id, custo: corpo }, { onSuccess: aoFechar });
    } else {
      registrar.mutate(corpo, { onSuccess: aoFechar });
    }
  }

  const erro = mutacao.error instanceof ErroDeApi ? mutacao.error.message : undefined;
  const conversao =
    moeda === 'USD' && valor.trim() !== '' && cambio.trim() !== ''
      ? moedaEmTexto(Math.round(numero(valor) * numero(cambio) * 100) / 100)
      : null;
  const podeSalvar =
    aeronaveId !== '' &&
    categoria !== '' &&
    data !== '' &&
    descricao.trim() !== '' &&
    valor.trim() !== '' &&
    (moeda === 'BRL' || cambio.trim() !== '');

  return (
    <PainelModal
      aberto
      aoFechar={aoFechar}
      rotulo={editando ? 'Corrigir custo' : 'Registrar custo'}
    >
      <Texto variante="titulo" como="h2">
        {editando ? 'Corrigir custo' : 'Registrar custo'}
      </Texto>

      <Texto variante="legenda" tom="suave" como="h3">
        Classificação
      </Texto>
      <Selecao
        rotulo="Aeronave"
        valor={aeronaveId}
        desabilitado={editando}
        opcoes={[
          { valor: '', rotulo: 'Selecione…' },
          ...(aeronaves.data ?? []).map((aeronave) => ({
            valor: String(aeronave.id),
            rotulo: `${aeronave.matricula} — ${aeronave.modelo}`,
          })),
        ]}
        aoMudar={setAeronaveId}
      />
      <GrupoDeOpcoes
        rotulo="Tipo"
        valor={tipo}
        opcoes={[
          { valor: 'FIXO', rotulo: 'Custo Fixo' },
          { valor: 'VARIAVEL', rotulo: 'Custo Variável' },
        ]}
        aoEscolher={(escolhido) => {
          setTipo(escolhido as TipoDeCusto);
          // A categoria é filha do tipo: trocar o pai zera a filha.
          setCategoria('');
        }}
        marcador
        larguraIgual
      />
      <div className={estilos.grade}>
        <Selecao
          rotulo="Categoria"
          valor={categoria}
          opcoes={[
            { valor: '', rotulo: 'Selecione…' },
            ...categoriasDoTipo(tipo).map((cada) => ({
              valor: cada,
              rotulo: CATEGORIAS[cada].rotulo,
            })),
          ]}
          aoMudar={(escolhida) => setCategoria(escolhida as CategoriaDeCusto | '')}
        />
        <CampoDeTexto rotulo="Data do custo" tipo="data" valor={data} aoMudar={setData} />
      </div>

      <Texto variante="legenda" tom="suave" como="h3">
        Atribuição
      </Texto>
      <div className={estilos.grade}>
        <Selecao
          rotulo="Atribuição"
          valor={atribuicao}
          opcoes={[
            { valor: '', rotulo: ATRIBUICAO_RATEADA },
            ...(proprietarios.data ?? [])
              .filter((dono) => dono.situacao === 'ATIVO')
              .map((dono) => ({ valor: String(dono.id), rotulo: dono.nome ?? '' })),
          ]}
          aoMudar={setAtribuicao}
        />
        <CampoDeTexto
          rotulo="Rel-voo (opcional)"
          valor={relatorioDeVoo}
          aoMudar={setRelatorioDeVoo}
          exemplo="RV-2026-041"
          maxLength={20}
        />
      </div>

      <Texto variante="legenda" tom="suave" como="h3">
        Valor
      </Texto>
      <GrupoDeOpcoes
        rotulo="Moeda"
        valor={moeda}
        opcoes={[
          { valor: 'BRL', rotulo: 'BRL' },
          { valor: 'USD', rotulo: 'USD' },
        ]}
        aoEscolher={(escolhida) => setMoeda(escolhida as MoedaDoCusto)}
        marcador
        larguraIgual
      />
      <div className={estilos.grade}>
        <CampoDeTexto
          rotulo={moeda === 'BRL' ? 'Valor (R$)' : 'Valor (US$)'}
          valor={valor}
          aoMudar={setValor}
          inputMode="numeric"
          erro={erro}
        />
        {moeda === 'USD' ? (
          <CampoDeTexto
            rotulo="Câmbio do dia"
            valor={cambio}
            aoMudar={setCambio}
            inputMode="numeric"
            exemplo="4,9223"
          />
        ) : null}
      </div>
      {conversao ? (
        <Texto variante="apoio" tom="suave" como="p">
          = {conversao} — o servidor grava a conversão uma única vez, no ato.
        </Texto>
      ) : null}

      <Texto variante="legenda" tom="suave" como="h3">
        Documento
      </Texto>
      <CampoDeTexto
        rotulo="Descrição"
        valor={descricao}
        aoMudar={setDescricao}
        maxLength={200}
        exemplo="Jet A-1 — 1.850 L — SBRJ"
      />
      <CampoDeTexto
        rotulo="N. Fiscal / Invoice"
        valor={notaFiscal}
        aoMudar={setNotaFiscal}
        maxLength={40}
      />

      <div className={estilos.acoes}>
        <Botao variante="secundario" aoClicar={aoFechar}>
          Cancelar
        </Botao>
        <Botao aoClicar={salvar} desabilitado={!podeSalvar} carregando={mutacao.isPending}>
          {editando ? 'Salvar correção' : 'Registrar custo'}
        </Botao>
      </div>
    </PainelModal>
  );
}
