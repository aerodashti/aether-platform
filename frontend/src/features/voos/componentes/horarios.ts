/**
 * Os horários do trecho viajam como instantes (ISO 8601; o servidor responde em UTC) e aparecem no
 * fuso deste dispositivo (ADR-0021). O painel continua pedindo data e hora, como no protótipo: quem
 * monta o instante é a tela, a partir do relógio local.
 */

export type CampoDeHorario =
  'partidaPrevista' | 'pousoPrevisto' | 'partidaRealizada' | 'pousoRealizado';

/** A hora de cada campo como o campo nativo a entrega: "HH:MM", ou vazio. */
export type Horarios = Record<CampoDeHorario, string>;

export type Instantes = Partial<Record<CampoDeHorario, Date>>;

/** Os instantes gravados, como o servidor os devolve, e a data a que pertencem. */
export interface HorariosGravados {
  data: string;
  instantes: Partial<Record<CampoDeHorario, string>>;
}

const HORA = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });
const MILISSEGUNDOS_POR_HORA = 60 * 60 * 1000;
const MILISSEGUNDOS_POR_DIA = 24 * MILISSEGUNDOS_POR_HORA;
const MILISSEGUNDOS_POR_DECIMO_DE_HORA = 6 * 60 * 1000;
/** Partida realizada mais de 12 h antes da prevista é atraso que cruzou a meia-noite. */
const ATRASO_QUE_VIRA_O_DIA = 12 * MILISSEGUNDOS_POR_HORA;
/** O maior adiantamento que puxa a partida para a véspera de uma prevista de madrugada. */
const ADIANTAMENTO_DA_VESPERA = 3 * MILISSEGUNDOS_POR_HORA;

/** O fuso em que o painel lê e mostra os horários (decisão de produto D17). */
export function fusoDoDispositivo(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/** "HH:MM" no fuso de quem olha; vazio sem horário. */
export function horaLocal(instante: string | undefined): string {
  return instante ? HORA.format(new Date(instante)) : '';
}

/**
 * A hora na data do trecho, `dias` à frente ou atrás. Uma data que o campo nativo deixou passar
 * mas não existe (ano de cinco dígitos) não vira instante — `toISOString` lançaria no meio do envio.
 */
function naData(data: string, hora: string, dias = 0): Date | undefined {
  if (data === '' || hora === '') {
    return undefined;
  }
  const instante = new Date(`${data}T${hora}:00`);
  instante.setDate(instante.getDate() + dias);
  return Number.isNaN(instante.getTime()) ? undefined : instante;
}

/**
 * O pouso depois da partida do par: no dia dela, ou no seguinte quando a hora é menor — quem sai
 * às 23:30 e pousa à 01:00 cruzou a meia-noite. Na mesma hora não avança: um voo de 24 h por erro
 * de digitação é o que a validação acusa.
 */
function pousoDepoisDe(partida: Date | undefined, data: string, hora: string): Date | undefined {
  if (partida === undefined || hora === '') {
    return naData(data, hora);
  }
  const [horas = 0, minutos = 0] = hora.split(':').map(Number);
  const pouso = new Date(partida);
  pouso.setHours(horas, minutos, 0, 0);
  if (pouso < partida) {
    pouso.setDate(pouso.getDate() + 1);
  }
  return pouso;
}

/**
 * A partida realizada na data do trecho, salvo dois casos, assimétricos de propósito: atrasar é
 * comum e longo, adiantar é raro e curto.
 * - Mais de 12 h antes da prevista, é o dia seguinte: o voo previsto para 23:30 que saiu às 00:20
 *   atrasou e cruzou a meia-noite — não saiu 23 h antes.
 * - Na véspera, até 3 h antes da prevista, é o dia anterior: o previsto para 00:10 que saiu às
 *   23:50 adiantou 20 min.
 * Fora disso, fica na data, mesmo longe da prevista: o previsto para 10:00 que saiu às 23:00
 * atrasou 13 h, e não adiantou 11 h.
 */
function partidaPertoDe(prevista: Date | undefined, data: string, hora: string): Date | undefined {
  const noDia = naData(data, hora);
  if (prevista === undefined || noDia === undefined) {
    return noDia;
  }
  if (prevista.getTime() - noDia.getTime() > ATRASO_QUE_VIRA_O_DIA) {
    return naData(data, hora, 1);
  }
  const vespera = naData(data, hora, -1);
  const adiantamento = vespera === undefined ? -1 : prevista.getTime() - vespera.getTime();
  return adiantamento >= 0 && adiantamento <= ADIANTAMENTO_DA_VESPERA ? vespera : noDia;
}

function doGravado(instante: string | undefined): Date | undefined {
  return instante ? new Date(instante) : undefined;
}

/**
 * Os quatro instantes do trecho. Na correção, com a data mantida, o horário que a pessoa não tocou
 * volta como foi gravado: remontá-lo com a hora local de quem corrige deslocaria em um dia o voo
 * lançado noutro fuso. A partida intocada fica no instante gravado e ancora o pouso alterado; o
 * pouso intocado só fica no gravado se a partida também ficou, senão é remontado depois dela.
 */
export function instantesDoTrecho(
  data: string,
  horarios: Horarios,
  gravados?: HorariosGravados,
): Instantes {
  const intocado = (campo: CampoDeHorario) =>
    gravados !== undefined &&
    gravados.data === data &&
    horarios[campo] === horaLocal(gravados.instantes[campo]);
  const gravado = (campo: CampoDeHorario) => doGravado(gravados?.instantes[campo]);

  const partidaPrevista = intocado('partidaPrevista')
    ? gravado('partidaPrevista')
    : naData(data, horarios.partidaPrevista);
  const pousoPrevisto =
    intocado('partidaPrevista') && intocado('pousoPrevisto')
      ? gravado('pousoPrevisto')
      : pousoDepoisDe(partidaPrevista, data, horarios.pousoPrevisto);
  const partidaRealizada = intocado('partidaRealizada')
    ? gravado('partidaRealizada')
    : partidaPertoDe(partidaPrevista, data, horarios.partidaRealizada);
  const pousoRealizado =
    intocado('partidaRealizada') && intocado('pousoRealizado')
      ? gravado('pousoRealizado')
      : pousoDepoisDe(partidaRealizada, data, horarios.pousoRealizado);
  return { partidaPrevista, pousoPrevisto, partidaRealizada, pousoRealizado };
}

/** Quantos dias o instante cai depois (ou antes, negativo) da data do trecho, no fuso local. */
export function diasDepoisDaData(instante: Date, data: string): number {
  const [ano = 0, mes = 1, dia = 1] = data.split('-').map(Number);
  const doInstante = new Date(instante.getFullYear(), instante.getMonth(), instante.getDate());
  return Math.round(
    (doInstante.getTime() - new Date(ano, mes - 1, dia).getTime()) / MILISSEGUNDOS_POR_DIA,
  );
}

/** O par que vale, pela regra do servidor: o realizado quando está completo, senão o previsto. */
function parQueVale(instantes: Instantes): [Date | undefined, Date | undefined] {
  const realizado =
    instantes.partidaRealizada !== undefined && instantes.pousoRealizado !== undefined;
  return realizado
    ? [instantes.partidaRealizada, instantes.pousoRealizado]
    : [instantes.partidaPrevista, instantes.pousoPrevisto];
}

/** A duração em horas, com uma casa. Sem par que feche, não há duração. */
export function duracaoEmHoras(instantes: Instantes): number | undefined {
  const [partida, pouso] = parQueVale(instantes);
  if (partida === undefined || pouso === undefined || pouso <= partida) {
    return undefined;
  }
  return Math.round((pouso.getTime() - partida.getTime()) / MILISSEGUNDOS_POR_DECIMO_DE_HORA) / 10;
}

/** O pouso do par que vale cai noutro dia que a partida: o voo cruzou a meia-noite. */
export function pousoCruzaAMeiaNoite(instantes: Instantes): boolean {
  const [partida, pouso] = parQueVale(instantes);
  return (
    partida !== undefined && pouso !== undefined && partida.toDateString() !== pouso.toDateString()
  );
}
