import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useAeronaves } from '@/compartilhado/aeronaves/useAeronaves';
import { competenciaLocal, somarMesesNaCompetencia } from '@/compartilhado/formatacao/datas';

/**
 * O recorte de uma tela de registros — aeronave, proprietário, competência ou período — morando
 * na URL.
 *
 * <p>Features não se importam: o detalhe da aeronave chega aos lançamentos dela por
 * `/custos?aeronave=3`, e o "+ Registrar" da casca abre o formulário por `?registrar=1`. A URL é
 * a fonte, e um recarregamento ou um link colado reproduzem a mesma tela.
 *
 * <p>Parâmetro ausente é o padrão da tela; presente e vazio é "sem limite" — por isso o padrão não
 * vai para a URL e o vazio vai. Vale para a competência e para as duas pontas do período.
 */
export interface PedidoDeRegistro {
  /** Se quem está na tela pode registrar; sem permissão, o pedido é ignorado. */
  podeRegistrar: boolean;
  /** Abre o formulário de novo registro da tela. */
  aoPedir: () => void;
}

/** Um mês só, ou um período de competências. */
export type ModoDoRecorte = 'MENSAL' | 'PERIODO';

/** Os parâmetros que "Limpar filtros" tira; a competência volta ao "todo o histórico". */
const FILTROS = ['aeronave', 'proprietario', 'modo', 'de', 'ate'];

function lerComPadrao(parametros: URLSearchParams, nome: string, padrao: string): string {
  return parametros.has(nome) ? (parametros.get(nome) ?? '') : padrao;
}

function gravarComPadrao(parametros: URLSearchParams, nome: string, valor: string, padrao: string) {
  if (valor === padrao) {
    parametros.delete(nome);
  } else {
    parametros.set(nome, valor);
  }
}

export function useRecorteDaUrl(competenciaPadrao: string, pedido?: PedidoDeRegistro) {
  const [parametros, setParametros] = useSearchParams();
  const frota = useAeronaves();
  // O período que as telas abrem: os últimos doze meses.
  const corrente = competenciaLocal();
  const periodoPadrao = { de: somarMesesNaCompetencia(corrente, -11), ate: corrente };

  const aeronaveDaUrl = parametros.get('aeronave') ?? '';
  // Um aviso antigo ou um favorito podem apontar para uma aeronave que não está mais na frota.
  // Sem esta conferência, o select mostraria outra aeronave enquanto a consulta filtra por esta.
  const aeronaveForaDaFrota =
    aeronaveDaUrl !== '' &&
    frota.data !== undefined &&
    !frota.data.some((aeronave) => String(aeronave.id) === aeronaveDaUrl);
  const pediuRegistro = parametros.get('registrar') === '1';
  const podeRegistrar = pedido?.podeRegistrar ?? false;

  // O callback da tela muda a cada render; guardá-lo numa ref tira ele das dependências do efeito.
  // Com ele nas dependências, cada render da tela reexecutava o efeito enquanto o roteador ainda
  // não tinha confirmado a URL sem o ?registrar — e o abrir-render-abrir virava laço infinito.
  const aoPedir = useRef(pedido?.aoPedir);
  useEffect(() => {
    aoPedir.current = pedido?.aoPedir;
  });

  // O pedido vale uma vez: atendido, sai da URL para não reabrir no recarregar.
  useEffect(() => {
    if (!pediuRegistro || !podeRegistrar) {
      return;
    }
    aoPedir.current?.();
    setParametros(
      (atuais) => {
        const proximos = new URLSearchParams(atuais);
        proximos.delete('registrar');
        return proximos;
      },
      { replace: true },
    );
  }, [pediuRegistro, podeRegistrar, setParametros]);

  /**
   * Toda mudança do recorte passa por aqui, numa navegação só: duas chamadas seguidas partiriam da
   * mesma URL, e a segunda desfaria a primeira.
   */
  function alterar(mudanca: (proximos: URLSearchParams) => void) {
    setParametros(
      (atuais) => {
        const proximos = new URLSearchParams(atuais);
        mudanca(proximos);
        return proximos;
      },
      // Trocar o filtro não é navegar: o "voltar" do navegador leva para a tela anterior.
      { replace: true },
    );
  }

  function gravarOuApagar(nome: string) {
    return (valor: string) =>
      alterar((proximos) => (valor ? proximos.set(nome, valor) : proximos.delete(nome)));
  }

  return {
    aeronaveId: aeronaveForaDaFrota ? '' : aeronaveDaUrl,
    /** Para o apoio do filtro de aeronave, quando a do link foi ignorada. */
    avisoDaAeronave: aeronaveForaDaFrota ? 'A aeronave do link não foi encontrada.' : undefined,
    proprietarioId: parametros.get('proprietario') ?? '',
    competencia: lerComPadrao(parametros, 'competencia', competenciaPadrao),
    modo: (parametros.get('modo') === 'periodo' ? 'PERIODO' : 'MENSAL') as ModoDoRecorte,
    de: lerComPadrao(parametros, 'de', periodoPadrao.de),
    ate: lerComPadrao(parametros, 'ate', periodoPadrao.ate),
    setAeronaveId: gravarOuApagar('aeronave'),
    setProprietarioId: gravarOuApagar('proprietario'),
    setCompetencia: (valor: string) =>
      alterar((proximos) => gravarComPadrao(proximos, 'competencia', valor, competenciaPadrao)),
    setModo: (modo: ModoDoRecorte) =>
      alterar((proximos) => gravarComPadrao(proximos, 'modo', modo.toLowerCase(), 'mensal')),
    setDe: (valor: string) =>
      alterar((proximos) => gravarComPadrao(proximos, 'de', valor, periodoPadrao.de)),
    setAte: (valor: string) =>
      alterar((proximos) => gravarComPadrao(proximos, 'ate', valor, periodoPadrao.ate)),
    /** Do período para o mês escolhido, numa mudança só. */
    abrirCompetencia: (competencia: string) =>
      alterar((proximos) => {
        gravarComPadrao(proximos, 'competencia', competencia, competenciaPadrao);
        proximos.delete('modo');
      }),
    /** Frota inteira e todo o histórico, numa mudança só. */
    limpar: () =>
      alterar((proximos) => {
        FILTROS.forEach((nome) => proximos.delete(nome));
        gravarComPadrao(proximos, 'competencia', '', competenciaPadrao);
      }),
  };
}
