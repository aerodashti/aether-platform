import { describe, expect, it } from 'vitest';

import {
  diasDepoisDaData,
  duracaoEmHoras,
  horaLocal,
  instantesDoTrecho,
  type Horarios,
} from './horarios';

const SEM_HORARIOS: Horarios = {
  partidaPrevista: '',
  pousoPrevisto: '',
  partidaRealizada: '',
  pousoRealizado: '',
};

function horarios(parcial: Partial<Horarios>): Horarios {
  return { ...SEM_HORARIOS, ...parcial };
}

describe('horários do trecho', () => {
  it('monta o instante a partir da data e da hora locais, e volta à mesma hora local', () => {
    const { partidaPrevista } = instantesDoTrecho(
      '2026-09-08',
      horarios({ partidaPrevista: '08:30' }),
    );

    expect(partidaPrevista).toEqual(new Date(2026, 8, 8, 8, 30));
    expect(horaLocal(partidaPrevista?.toISOString())).toBe('08:30');
  });

  it('pouso antes da partida é no dia seguinte; na mesma hora não vira um voo de 24 h', () => {
    const virada = instantesDoTrecho(
      '2026-09-08',
      horarios({ partidaPrevista: '23:30', pousoPrevisto: '01:00' }),
    );
    const mesmaHora = instantesDoTrecho(
      '2026-09-08',
      horarios({ partidaPrevista: '10:00', pousoPrevisto: '10:00' }),
    );

    expect(virada.pousoPrevisto).toEqual(new Date(2026, 8, 9, 1, 0));
    expect(duracaoEmHoras(virada)).toBe(1.5);
    expect(mesmaHora.pousoPrevisto).toEqual(mesmaHora.partidaPrevista);
    expect(duracaoEmHoras(mesmaHora)).toBeUndefined();
  });

  it('a partida realizada cai no dia mais perto da prevista: o atraso que cruzou a meia-noite', () => {
    const atrasado = instantesDoTrecho(
      '2026-09-10',
      horarios({ partidaPrevista: '23:30', partidaRealizada: '00:20', pousoRealizado: '01:10' }),
    );
    const adiantado = instantesDoTrecho(
      '2026-09-10',
      horarios({ partidaPrevista: '00:10', partidaRealizada: '23:50', pousoRealizado: '00:40' }),
    );
    const semPrevista = instantesDoTrecho(
      '2026-09-10',
      horarios({ partidaRealizada: '00:20', pousoRealizado: '01:10' }),
    );

    expect(atrasado.partidaRealizada).toEqual(new Date(2026, 8, 11, 0, 20));
    expect(atrasado.pousoRealizado).toEqual(new Date(2026, 8, 11, 1, 10));
    expect(adiantado.partidaRealizada).toEqual(new Date(2026, 8, 9, 23, 50));
    expect(adiantado.pousoRealizado).toEqual(new Date(2026, 8, 10, 0, 40));
    expect(semPrevista.partidaRealizada).toEqual(new Date(2026, 8, 10, 0, 20));
  });

  it('na correção, o par intocado volta como foi gravado, mesmo lançado noutro dia local', () => {
    const gravados = {
      data: '2026-09-11',
      instantes: {
        partidaRealizada: new Date(2026, 8, 10, 23, 30).toISOString(),
        pousoRealizado: new Date(2026, 8, 11, 0, 30).toISOString(),
      },
    };
    const intocado = horarios({ partidaRealizada: '23:30', pousoRealizado: '00:30' });

    expect(instantesDoTrecho('2026-09-11', intocado, gravados).partidaRealizada).toEqual(
      new Date(2026, 8, 10, 23, 30),
    );
    expect(
      instantesDoTrecho('2026-09-11', { ...intocado, pousoRealizado: '00:45' }, gravados)
        .partidaRealizada,
    ).toEqual(new Date(2026, 8, 11, 23, 30));
    expect(instantesDoTrecho('2026-09-12', intocado, gravados).partidaRealizada).toEqual(
      new Date(2026, 8, 12, 23, 30),
    );
  });

  it('data que não existe não vira instante — e não lança no meio do envio', () => {
    const instantes = instantesDoTrecho('20266-01-01', horarios({ partidaPrevista: '10:00' }));

    expect(instantes.partidaPrevista).toBeUndefined();
  });

  it('a duração usa o realizado completo; sem ele, o previsto', () => {
    const instantes = instantesDoTrecho(
      '2026-09-08',
      horarios({
        partidaPrevista: '08:30',
        pousoPrevisto: '09:20',
        partidaRealizada: '08:42',
        pousoRealizado: '09:31',
      }),
    );

    expect(duracaoEmHoras(instantes)).toBe(0.8);
    expect(duracaoEmHoras({ ...instantes, pousoRealizado: undefined })).toBe(0.8);
    expect(duracaoEmHoras({})).toBeUndefined();
  });

  it('diz quantos dias o instante cai depois ou antes da data do trecho', () => {
    expect(diasDepoisDaData(new Date(2026, 8, 11, 0, 20), '2026-09-10')).toBe(1);
    expect(diasDepoisDaData(new Date(2026, 8, 9, 23, 50), '2026-09-10')).toBe(-1);
    expect(diasDepoisDaData(new Date(2026, 8, 10, 12, 0), '2026-09-10')).toBe(0);
    expect(horaLocal(undefined)).toBe('');
  });
});
