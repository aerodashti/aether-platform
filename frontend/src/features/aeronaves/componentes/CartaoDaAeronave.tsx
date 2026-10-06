import { competenciaAbreviada, type SaldoDaAeronave } from '@/compartilhado/fundo/useSaldosDoFundo';
import { juntarClasses } from '@/design-system/classes';
import { LinkDeTexto } from '@/design-system/primitivos/LinkDeTexto';

import type { AeronaveResponse } from '../api/useAeronaves';

import estilos from './CartaoDaAeronave.module.css';
import { EtiquetaDeSituacao } from './EtiquetaDeSituacao';
import { dataCurta, moedaEmTexto, prazoEmPalavras, ROTULO_DO_DOCUMENTO } from './rotulos';

interface CartaoDaAeronaveProps {
  aeronave: AeronaveResponse;
  /** Quantos proprietários no contrato vigente; `undefined` enquanto os vínculos não chegaram. */
  proprietarios: number | undefined;
  /** O fundo hoje, do fechamento; `undefined` enquanto não chegou. */
  saldo: SaldoDaAeronave | undefined;
}

/**
 * Uma aeronave da frota, como no protótipo: identificação, etiqueta de situação, os números à
 * direita e a seta que abre o detalhe.
 *
 * <p>Os números do protótipo — saldo do fundo, custo da competência e proprietários — mais o
 * próximo vencimento, porque o brief proíbe estado sem consequência: "Atenção" sozinho não
 * informa, e a forma correta é dizer qual documento e quando. Saldo negativo vem em vermelho: é
 * dinheiro que os proprietários devem ao fundo.
 */
export function CartaoDaAeronave({ aeronave, proprietarios, saldo }: CartaoDaAeronaveProps) {
  const situacao = aeronave.situacaoRegular ?? 'REGULAR';
  const documento = aeronave.documentoDoProximoVencimento
    ? ROTULO_DO_DOCUMENTO[aeronave.documentoDoProximoVencimento]
    : '';
  // O prazo em palavras só entra quando decide algo. Numa aeronave saudável, "em 241 dias" é
  // número sem pergunta — o brief chama isso de data slop.
  const qualificador =
    situacao === 'REGULAR'
      ? documento
      : [documento, prazoEmPalavras(aeronave.diasAteOProximoVencimento)]
          .filter(Boolean)
          .join(' · ');

  return (
    <li className={estilos.cartao}>
      <div className={estilos.identidade}>
        <span className={estilos.matricula}>
          <LinkDeTexto para={`/aeronaves/${aeronave.id}`} mono>
            {aeronave.matricula}
          </LinkDeTexto>
        </span>
        <span className={estilos.modelo} title={aeronave.modelo}>
          {aeronave.modelo}
        </span>
      </div>

      <EtiquetaDeSituacao situacao={situacao} />

      <span className={estilos.espaco} />

      <span className={estilos.numero}>
        <span className={estilos.rotulo}>Próximo vencimento</span>
        <span className={estilos.valor}>{dataCurta(aeronave.proximoVencimento)}</span>
        {qualificador ? <span className={estilos.qualificador}>{qualificador}</span> : null}
      </span>

      {saldo ? (
        <>
          <span className={estilos.numero}>
            <span className={estilos.rotulo}>Saldo do fundo</span>
            <span
              className={juntarClasses(
                estilos.valor,
                (saldo.saldoDoFundo ?? 0) < 0 && estilos.devedor,
              )}
            >
              {moedaEmTexto(saldo.saldoDoFundo)}
            </span>
          </span>
          <span className={juntarClasses(estilos.numero, estilos.foraDoCelular)}>
            <span className={estilos.rotulo}>Custo {competenciaAbreviada(saldo.competencia)}</span>
            <span className={estilos.valor}>{moedaEmTexto(saldo.custoDaCompetencia)}</span>
          </span>
        </>
      ) : null}

      {proprietarios !== undefined ? (
        <span className={juntarClasses(estilos.numero, estilos.foraDoCelular)}>
          <span className={estilos.rotulo}>Proprietários</span>
          <span className={estilos.valor}>{proprietarios}</span>
        </span>
      ) : null}

      <span className={estilos.seta}>
        <LinkDeTexto
          para={`/aeronaves/${aeronave.id}`}
          rotuloAcessivel={`Abrir ${aeronave.matricula}`}
        >
          →
        </LinkDeTexto>
      </span>
    </li>
  );
}
