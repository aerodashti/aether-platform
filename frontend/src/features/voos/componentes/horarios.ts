/**
 * Os horários do trecho viajam como instantes (ISO 8601 com fuso, o servidor responde em UTC) e
 * aparecem no fuso de quem olha. O painel continua pedindo data e hora, como no protótipo: quem
 * monta o instante é a tela, a partir do relógio local.
 */

const HORA = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });

/** "HH:MM" no fuso de quem olha; vazio sem horário. */
export function horaLocal(instante: string | undefined): string {
  return instante ? HORA.format(new Date(instante)) : '';
}

/**
 * Pouso na mesma hora ou antes da partida é pouso no dia seguinte: um voo que sai às 23:30 e pousa
 * à 01:00 cruzou a meia-noite, e o painel diz isso em vez de calcular 23 horas.
 */
export function pousoNoDiaSeguinte(partida: string, pouso: string): boolean {
  return partida !== '' && pouso !== '' && pouso <= partida;
}

/**
 * O instante de uma hora local na data do trecho. Para o pouso, informe a partida do mesmo par: se
 * ele cai no dia seguinte, a data avança um dia.
 */
export function instanteDe(data: string, hora: string, partidaDoPar?: string): string | undefined {
  if (data === '' || hora === '') {
    return undefined;
  }
  const instante = new Date(`${data}T${hora}:00`);
  if (partidaDoPar !== undefined && pousoNoDiaSeguinte(partidaDoPar, hora)) {
    instante.setDate(instante.getDate() + 1);
  }
  return instante.toISOString();
}
