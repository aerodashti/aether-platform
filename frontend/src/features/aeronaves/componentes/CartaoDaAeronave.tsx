import { LinkDeTexto } from '@/design-system/primitivos/LinkDeTexto';

import type { AeronaveResponse } from '../api/useAeronaves';

import estilos from './CartaoDaAeronave.module.css';
import { EtiquetaDeSituacao } from './EtiquetaDeSituacao';
import { dataCurta, prazoEmPalavras, ROTULO_DO_DOCUMENTO } from './rotulos';

interface CartaoDaAeronaveProps {
  aeronave: AeronaveResponse;
  /** Quantos proprietários no contrato vigente; `undefined` enquanto os vínculos não chegaram. */
  proprietarios: number | undefined;
}

/**
 * Uma aeronave da frota, como no protótipo: identificação, etiqueta de situação, os números à
 * direita e a seta que abre o detalhe.
 *
 * <p>Dos números do protótipo só a contagem de proprietários está aqui — saldo do fundo e custo
 * da competência pertencem a aportes e a lançamentos, e **coluna vazia não existe**. Em troca
 * entra o próximo vencimento, porque o brief proíbe estado sem consequência: "Atenção" sozinho
 * não informa, e a forma correta é dizer qual documento e quando.
 */
export function CartaoDaAeronave({ aeronave, proprietarios }: CartaoDaAeronaveProps) {
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

      {proprietarios !== undefined ? (
        <span className={estilos.numero}>
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
