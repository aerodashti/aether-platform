import { useNavigate } from 'react-router-dom';

import {
  contarProprietariosPorAeronave,
  useVinculosVigentes,
} from '@/compartilhado/participacoes/useVinculosVigentes';
import { useSessao } from '@/compartilhado/sessao/sessao';
import { Botao } from '@/design-system/primitivos/Botao';
import { Esqueleto } from '@/design-system/primitivos/Esqueleto';
import { Texto } from '@/design-system/primitivos/Texto';

import { useAeronaves } from '../api/useAeronaves';

import { CartaoDaAeronave } from './CartaoDaAeronave';
import estilos from './PaginaDeAeronaves.module.css';
import { resumoDaFrota } from './rotulos';

const CARTOES_DO_ESQUELETO = 3;

/**
 * A frota, na lista de cartões do protótipo. Dos números do cartão só a contagem de proprietários
 * está aqui — saldo do fundo e custo da competência entram com aportes e lançamentos, porque
 * coluna vazia não existe. Ver `docs/design-system.md`.
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
  // A contagem de proprietários chega à parte e não segura a lista: sem ela o cartão só omite o
  // número, e com ela o número aparece — nunca um "0" inventado.
  const vinculos = useVinculosVigentes();
  const proprietariosPorAeronave = contarProprietariosPorAeronave(vinculos.data);
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
          <Botao variante="contorno" aoClicar={() => void navegar('/aeronaves/nova')}>
            + Nova aeronave
          </Botao>
        ) : null}
      </div>

      {consulta.isError ? (
        <div className={estilos.recado} role="alert">
          <Texto variante="corpo" como="p">
            Não foi possível carregar a frota
          </Texto>
          <Texto variante="apoio" tom="suave" como="p">
            A consulta ao servidor falhou. Nada foi alterado.
          </Texto>
          <Botao variante="secundario" tamanho="pequeno" aoClicar={() => void consulta.refetch()}>
            Tentar de novo
          </Botao>
        </div>
      ) : consulta.isPending ? (
        <>
          <div role="status" className={estilos.apenasLeitor}>
            Carregando a frota…
          </div>
          <ul className={estilos.lista} aria-hidden="true">
            {Array.from({ length: CARTOES_DO_ESQUELETO }, (_, indice) => (
              <li key={indice} className={estilos.cartaoDoEsqueleto}>
                <Esqueleto />
              </li>
            ))}
          </ul>
        </>
      ) : frota.length === 0 ? (
        <div className={estilos.recado}>
          <Texto variante="corpo" como="p">
            Nenhuma aeronave cadastrada
          </Texto>
          <Texto variante="apoio" tom="suave" como="p">
            Cadastre a primeira aeronave para começar a lançar custos, voos e rateio.
          </Texto>
        </div>
      ) : (
        <ul className={estilos.lista} aria-label="Frota">
          {frota.map((aeronave) => (
            <CartaoDaAeronave
              key={aeronave.id}
              aeronave={aeronave}
              proprietarios={
                vinculos.data ? (proprietariosPorAeronave.get(aeronave.id ?? 0) ?? 0) : undefined
              }
            />
          ))}
        </ul>
      )}
    </div>
  );
}
