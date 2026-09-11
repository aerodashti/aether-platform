import { useNavigate } from 'react-router-dom';

import { useSessao } from '@/compartilhado/sessao/sessao';
import { Botao } from '@/design-system/primitivos/Botao';
import { Texto } from '@/design-system/primitivos/Texto';

import { useAeronaves } from '../api/useAeronaves';

import estilos from './PaginaDeAeronaves.module.css';
import { resumoDaFrota } from './rotulos';
import { TabelaDaFrota } from './TabelaDaFrota';

/**
 * A frota.
 *
 * <p>O protótipo tem seis colunas; esta tela mostra quatro. Saldo do fundo, custo da competência e
 * contagem de proprietários dependem de features que ainda não existem, e coluna vazia não existe
 * — cada uma entra com a feature dona do seu número. Ver `docs/design-system.md`.
 */
function Resumo({ total, impedidas }: { total: number; impedidas: number }) {
  const { frota, impedimento } = resumoDaFrota(total, impedidas);
  return (
    <p className={estilos.resumo}>
      <Texto variante="apoio" tom="suave" como="span">
        {frota}
      </Texto>
      {impedimento ? (
        <>
          {/* O separador é item próprio do flex: um nó de texto só com espaços colapsaria. */}
          <Texto variante="apoio" tom="suave" como="span">
            ·
          </Texto>
          <Texto variante="apoio" tom="critico" como="span">
            {impedimento}
          </Texto>
        </>
      ) : null}
    </p>
  );
}

export function PaginaDeAeronaves() {
  const consulta = useAeronaves();
  const navegar = useNavigate();
  const { usuario } = useSessao();
  const frota = consulta.data ?? [];
  const impedidas = frota.filter((aeronave) => aeronave.podeVoar === false).length;
  const podeGerir = usuario?.papel === 'ADMINISTRADOR' || usuario?.papel === 'GESTOR';

  return (
    <div className={estilos.tela}>
      <div className={estilos.cabecalho}>
        {consulta.isPending ? null : <Resumo total={frota.length} impedidas={impedidas} />}
        {podeGerir ? (
          <Botao aoClicar={() => void navegar('/aeronaves/nova')}>Nova aeronave</Botao>
        ) : null}
      </div>

      <div className={estilos.painel}>
        <TabelaDaFrota
          itens={frota}
          carregando={consulta.isPending}
          erro={consulta.isError}
          aoTentarDeNovo={() => void consulta.refetch()}
        />
      </div>
    </div>
  );
}
