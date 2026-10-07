import type { ProprietarioResponse } from '@/compartilhado/proprietarios/useProprietarios';
import type { OpcaoDeSelecao } from '@/design-system/primitivos/Selecao';

import { diasDepoisDaData, duracaoEmHoras, pousoCruzaAMeiaNoite, type Instantes } from './horarios';
import { ATRIBUICAO_DE_MANUTENCAO } from './rotulos';

/** O que o painel de trecho diz ao lado dos campos — redação de tela, sem regra de negócio. */

const DATA = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});
const HORAS = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

/** "Pouso no dia seguinte, 09/09/2026 (+1 dia)." — só quando o instante sai da data do trecho. */
export function apoioDoDia(
  evento: 'Partida' | 'Pouso',
  instante: Date | undefined,
  data: string,
): string | undefined {
  if (instante === undefined) {
    return undefined;
  }
  const dias = diasDepoisDaData(instante, data);
  const quando = DATA.format(instante);
  if (dias === 0) {
    return undefined;
  }
  if (dias === 1) {
    return `${evento} no dia seguinte, ${quando} (+1 dia).`;
  }
  if (dias === -1) {
    return `${evento} no dia anterior, ${quando} (−1 dia).`;
  }
  return `${evento} em ${quando}.`;
}

/** A duração ao vivo; a virada da meia-noite vai na mesma frase, para o leitor de tela anunciar. */
export function textoDaDuracao(instantes: Instantes): string {
  const horas = duracaoEmHoras(instantes);
  if (horas === undefined) {
    return 'Duração (automática): —';
  }
  const virada = pousoCruzaAMeiaNoite(instantes) ? ', com pouso no dia seguinte' : '';
  return `Duração (automática): ${HORAS.format(horas)} h${virada}.`;
}

/** O planejado com data passada nasce atrasado (decisão D2): o painel diz o que fazer. */
export function apoioDaData(data: string, realizado: boolean, hoje: string): string | undefined {
  return !realizado && data !== '' && data < hoje
    ? 'Data passada: se o trecho já voou, preencha os horários realizados — sem eles, ele não soma nos contadores.'
    : undefined;
}

/** Origem igual ao destino é permitida (decisão D18): o painel diz que entendeu um voo local. */
export function apoioDoDestino(origem: string, destino: string): string {
  const mesmoAerodromo =
    destino.trim().length === 4 && destino.trim().toUpperCase() === origem.trim().toUpperCase();
  return mesmoAerodromo ? 'Igual à origem: voo local.' : 'Código ICAO de 4 letras.';
}

/**
 * O que a atribuição faz de verdade (decisões D11 e D23): sem contrato vigente, o trecho não tem
 * entre quem ser rateado.
 */
export function apoioDaAtribuicao(semContratoVigente: boolean): string {
  return semContratoVigente
    ? 'Esta aeronave não tem contrato vigente: o trecho não será rateado entre proprietários.'
    : 'A lista traz os donos do contrato vigente. O trecho entra no % de uso de quem usou, na competência da data do trecho.';
}

/**
 * Quem pode receber o trecho: os donos do contrato vigente que estão ativos, mais quem já o recebeu
 * — mesmo inativo, para a correção não trocar em silêncio a atribuição de um voo passado (D12).
 */
export function opcoesDeAtribuicao(
  proprietarios: ProprietarioResponse[],
  podeReceber: (proprietarioId: number | undefined) => boolean,
  atribuido: string,
): OpcaoDeSelecao[] {
  const escolhiveis = proprietarios.filter(
    (dono) => podeReceber(dono.id) && (dono.situacao === 'ATIVO' || String(dono.id) === atribuido),
  );
  return [
    { valor: '', rotulo: ATRIBUICAO_DE_MANUTENCAO },
    ...escolhiveis.map((dono) => ({
      valor: String(dono.id),
      rotulo: dono.situacao === 'ATIVO' ? (dono.nome ?? '') : `${dono.nome ?? ''} (inativo)`,
    })),
  ];
}
