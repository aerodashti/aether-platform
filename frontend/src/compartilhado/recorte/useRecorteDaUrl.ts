import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * O recorte de uma tela de registros — aeronave e competência — morando na URL.
 *
 * <p>Features não se importam: o detalhe da aeronave chega aos lançamentos dela por
 * `/custos?aeronave=3`, e o "+ Registrar" da casca abre o formulário por `?registrar=1`. A URL é
 * a fonte, e um recarregamento ou um link colado reproduzem a mesma tela.
 *
 * <p>Competência ausente é a padrão da tela; presente e vazia é "todo o histórico" — por isso a
 * padrão não vai para a URL e o vazio vai.
 */
export interface PedidoDeRegistro {
  /** Se quem está na tela pode registrar; sem permissão, o pedido é ignorado. */
  podeRegistrar: boolean;
  /** Abre o formulário de novo registro da tela. */
  aoPedir: () => void;
}

export function useRecorteDaUrl(competenciaPadrao: string, pedido?: PedidoDeRegistro) {
  const [parametros, setParametros] = useSearchParams();

  const aeronaveId = parametros.get('aeronave') ?? '';
  const competencia = parametros.has('competencia')
    ? (parametros.get('competencia') ?? '')
    : competenciaPadrao;
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

  return {
    aeronaveId,
    competencia,
    setAeronaveId: (valor: string) =>
      alterar((proximos) =>
        valor ? proximos.set('aeronave', valor) : proximos.delete('aeronave'),
      ),
    setCompetencia: (valor: string) =>
      alterar((proximos) =>
        valor === competenciaPadrao
          ? proximos.delete('competencia')
          : proximos.set('competencia', valor),
      ),
    /**
     * Frota inteira e todo o histórico, numa mudança só: duas chamadas seguidas aos setters
     * partiriam da mesma URL, e a segunda desfaria a primeira.
     */
    limpar: () =>
      alterar((proximos) => {
        proximos.delete('aeronave');
        proximos.set('competencia', '');
      }),
  };
}
