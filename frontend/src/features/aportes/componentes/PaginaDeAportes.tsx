import { useState } from 'react';

import { useAeronaves } from '@/compartilhado/aeronaves/useAeronaves';
import { competenciaLocal, somarMesesNaCompetencia } from '@/compartilhado/formatacao/datas';
import { useRecorteDaUrl } from '@/compartilhado/recorte/useRecorteDaUrl';
import { useSessao } from '@/compartilhado/sessao/sessao';
import { Abas } from '@/design-system/primitivos/Abas';
import { Botao } from '@/design-system/primitivos/Botao';
import { CampoDeTexto } from '@/design-system/primitivos/CampoDeTexto';
import { GrupoDeOpcoes } from '@/design-system/primitivos/GrupoDeOpcoes';
import { Selecao } from '@/design-system/primitivos/Selecao';
import { Texto } from '@/design-system/primitivos/Texto';

import {
  useAportes,
  useRendimentos,
  type AporteResponse,
  type FiltroDoFundo,
  type RendimentoResponse,
} from '../api/useAportes';
import {
  useFormularioDeRendimento,
  type FormularioDeRendimentoAberto,
} from '../hooks/useFormularioDeRendimento';

import { confirmacaoDoAporte, confirmacaoDoRendimento } from './confirmacoes';
import { FormularioDeRendimento } from './FormularioDeRendimento';
import estilos from './PaginaDeAportes.module.css';
import { PainelDeAporte } from './PainelDeAporte';
import { moedaEmTexto } from './rotulos';
import { TabelaDeAportes } from './TabelaDeAportes';
import { TabelaDeRendimentos } from './TabelaDeRendimentos';

type Modo = 'MENSAL' | 'PERIODO';
type Aba = 'APORTES' | 'RENDIMENTOS';
type PainelDoAporte = { modo: 'novo' } | { modo: 'corrigir'; aporte: AporteResponse } | null;

/**
 * As entradas do fundo, na composição do protótipo: recorte por aeronave e por competência (um mês
 * ou um período), os indicadores do recorte, e as abas Aportes · Rendimentos com a contagem.
 *
 * <p>O saldo do fundo não está aqui: ele desconta os custos rateados, e quem rateia é o
 * fechamento. Sem paginação, como em Lançamentos: o recorte natural cabe numa grade.
 */
export function PaginaDeAportes() {
  const [modo, setModo] = useState<Modo>('MENSAL');
  const [de, setDe] = useState(somarMesesNaCompetencia(competenciaLocal(), -11));
  const [ate, setAte] = useState(competenciaLocal());
  const [aba, setAba] = useState<Aba>('APORTES');
  const [painel, setPainel] = useState<PainelDoAporte>(null);
  const formulario = useFormularioDeRendimento();
  // O que acabou de ser salvo: sem isto, o registro fora do recorte parecia não ter sido salvo.
  const [confirmacao, setConfirmacao] = useState<string | null>(null);
  const { usuario } = useSessao();
  const aeronaves = useAeronaves();

  const podeGerir = usuario?.papel === 'ADMINISTRADOR' || usuario?.papel === 'GESTOR';

  function abrirPainel(pedido: NonNullable<PainelDoAporte>) {
    setConfirmacao(null);
    setPainel(pedido);
  }

  // O "+ Registrar" da casca chega aqui por ?registrar=1.
  const recorte = useRecorteDaUrl(competenciaLocal(), {
    podeRegistrar: podeGerir,
    aoPedir: () => abrirPainel({ modo: 'novo' }),
  });
  const { aeronaveId, competencia } = recorte;
  const filtro: FiltroDoFundo =
    modo === 'MENSAL' ? { aeronaveId, de: competencia, ate: competencia } : { aeronaveId, de, ate };
  const aportes = useAportes(filtro);
  const rendimentos = useRendimentos(filtro);

  function abrirFormulario(pedido: FormularioDeRendimentoAberto) {
    setConfirmacao(null);
    formulario.abrir(pedido);
  }

  function aoSalvarAporte(aporte: AporteResponse) {
    setConfirmacao(confirmacaoDoAporte(aporte, filtro, painel?.modo === 'corrigir'));
    setPainel(null);
  }

  function aoSalvarRendimento(rendimento: RendimentoResponse) {
    setConfirmacao(
      confirmacaoDoRendimento(rendimento, filtro, formulario.aberto?.modo === 'corrigir'),
    );
    formulario.fechar();
  }

  const totalAportado = aportes.data?.total;
  const totalRendido = rendimentos.data?.total;
  const indicadores = [
    { rotulo: 'Total aportado', valor: moedaEmTexto(totalAportado) },
    {
      rotulo: 'Aportes registrados',
      valor: aportes.data ? String(aportes.data.aportes?.length ?? 0) : '—',
    },
    { rotulo: 'Rendimentos', valor: moedaEmTexto(totalRendido) },
    {
      rotulo: 'Entrou no fundo',
      valor:
        totalAportado == null || totalRendido == null
          ? '—'
          : moedaEmTexto(totalAportado + totalRendido),
    },
  ];

  return (
    <div className={estilos.tela}>
      <div className={estilos.cabecalho}>
        <Texto variante="corpo" tom="suave" como="p">
          O dinheiro que entra no fundo de cada aeronave: aportes dos proprietários e o que a
          aplicação do saldo rendeu.
        </Texto>
        {podeGerir ? (
          <Botao variante="contorno" aoClicar={() => abrirPainel({ modo: 'novo' })}>
            Registrar aporte
          </Botao>
        ) : null}
      </div>

      <div className={estilos.filtros}>
        <Selecao
          rotulo="Filtrar por aeronave"
          rotuloOculto
          valor={aeronaveId}
          opcoes={[
            { valor: '', rotulo: 'Todas as aeronaves' },
            ...(aeronaves.data ?? []).map((aeronave) => ({
              valor: String(aeronave.id),
              rotulo: `${aeronave.matricula} — ${aeronave.modelo}`,
            })),
          ]}
          aoMudar={recorte.setAeronaveId}
        />
        <GrupoDeOpcoes
          rotulo="Recorte de competência"
          rotuloOculto
          variante="segmentado"
          valor={modo}
          opcoes={[
            { valor: 'MENSAL', rotulo: 'Mensal' },
            { valor: 'PERIODO', rotulo: 'Período' },
          ]}
          aoEscolher={(valor) => setModo(valor as Modo)}
        />
        {modo === 'MENSAL' ? (
          <div className={estilos.competencia}>
            <CampoDeTexto
              rotulo="Competência"
              rotuloOculto
              tipo="mes"
              valor={competencia}
              aoMudar={recorte.setCompetencia}
              apoio="Vazio mostra todo o histórico."
            />
          </div>
        ) : (
          <>
            <div className={estilos.competencia}>
              <CampoDeTexto rotulo="De" tipo="mes" valor={de} aoMudar={setDe} />
            </div>
            <div className={estilos.competencia}>
              <CampoDeTexto rotulo="Até" tipo="mes" valor={ate} aoMudar={setAte} />
            </div>
          </>
        )}
      </div>

      <dl className={estilos.indicadores} role="group" aria-label="Indicadores do recorte">
        {indicadores.map((indicador) => (
          <div className={estilos.indicador} key={indicador.rotulo}>
            <dt className={estilos.indicadorRotulo}>{indicador.rotulo}</dt>
            <dd className={estilos.indicadorValor}>{indicador.valor}</dd>
          </div>
        ))}
      </dl>

      <div className={estilos.faixaDasAbas}>
        <Abas<Aba>
          rotulo="Entradas do fundo"
          variante="contorno"
          valor={aba}
          aoEscolher={setAba}
          abas={[
            { valor: 'APORTES', rotulo: 'Aportes', contagem: aportes.data?.aportes?.length },
            {
              valor: 'RENDIMENTOS',
              rotulo: 'Rendimentos',
              contagem: rendimentos.data?.rendimentos?.length,
            },
          ]}
        />
        {aba === 'RENDIMENTOS' && podeGerir && formulario.aberto === null ? (
          <Botao
            ref={formulario.botaoDeRegistrar}
            variante="contorno"
            aoClicar={() => abrirFormulario({ modo: 'novo' })}
          >
            Registrar rendimento
          </Botao>
        ) : null}
      </div>

      <div role="status">
        {confirmacao ? (
          <Texto variante="apoio" tom="positivo" como="p">
            {confirmacao}
          </Texto>
        ) : null}
      </div>

      <div className={estilos.painel}>
        {aba === 'APORTES' ? (
          <TabelaDeAportes
            resposta={aportes.data}
            carregando={aportes.isPending}
            erro={aportes.isError}
            mostraAeronave={aeronaveId === ''}
            podeGerir={podeGerir}
            aoCorrigir={(aporte) => abrirPainel({ modo: 'corrigir', aporte })}
            aoTentarDeNovo={() => void aportes.refetch()}
          />
        ) : (
          <TabelaDeRendimentos
            resposta={rendimentos.data}
            carregando={rendimentos.isPending}
            erro={rendimentos.isError}
            mostraAeronave={aeronaveId === ''}
            podeGerir={podeGerir}
            aoCorrigir={(rendimento) => abrirFormulario({ modo: 'corrigir', rendimento })}
            aoExcluir={formulario.aoExcluir}
            aoTentarDeNovo={() => void rendimentos.refetch()}
          />
        )}
        {/* Fora da aba, o formulário fica montado e escondido: o que foi digitado não se perde. */}
        {formulario.aberto ? (
          <div hidden={aba !== 'RENDIMENTOS'}>
            <FormularioDeRendimento
              key={formulario.aberto.modo === 'corrigir' ? formulario.aberto.rendimento.id : 'novo'}
              rendimento={
                formulario.aberto.modo === 'corrigir' ? formulario.aberto.rendimento : undefined
              }
              aeronaveInicial={aeronaveId || undefined}
              aoFechar={formulario.fechar}
              aoSalvar={aoSalvarRendimento}
            />
          </div>
        ) : null}
        {aba === 'RENDIMENTOS' ? (
          <Texto variante="apoio" tom="suave" como="p">
            <span className={estilos.nota}>
              Os rendimentos entram no fundo e são rateados pela participação de cada proprietário
              na data do crédito. Sem contrato vigente nessa data, ficam no fundo sem rateio.
            </span>
          </Texto>
        ) : null}
      </div>

      {painel ? (
        <PainelDeAporte
          key={painel.modo === 'corrigir' ? painel.aporte.id : 'novo'}
          aporte={painel.modo === 'corrigir' ? painel.aporte : undefined}
          aeronaveInicial={aeronaveId || undefined}
          aoFechar={() => setPainel(null)}
          aoSalvar={aoSalvarAporte}
        />
      ) : null}
    </div>
  );
}
