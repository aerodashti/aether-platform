import { describe, expect, it } from 'vitest';

import type { TrechoResponse } from '../api/useVoos';

import { instantesDoTrecho } from './horarios';
import { corpoDoTrecho, horariosGravados, rascunhoInicial } from './rascunhoDoTrecho';

const GRAVADO: TrechoResponse = {
  id: 5,
  aeronaveId: 1,
  relatorioDeVoo: 'RV-2026-042',
  numeroDoTrecho: 2,
  data: '2026-09-10',
  origem: 'SBSP',
  destino: 'SBSV',
  km: 1962.5,
  partidaPrevista: new Date(2026, 8, 10, 9, 0).toISOString(),
  pousoPrevisto: new Date(2026, 8, 10, 11, 40).toISOString(),
  proprietarioId: 7,
  observacoes: 'Pendente.',
};

describe('rascunho do trecho', () => {
  it('a correção começa no que está gravado, com a vírgula decimal na distância', () => {
    expect(rascunhoInicial(GRAVADO)).toMatchObject({
      aeronaveId: '1',
      numeroDoTrecho: '2',
      km: '1962,5',
      partidaPrevista: '09:00',
      pousoPrevisto: '11:40',
      partidaRealizada: '',
      proprietarioId: '7',
    });
  });

  it('o lançamento novo começa no trecho 1, na aeronave do filtro', () => {
    expect(rascunhoInicial(undefined, '3')).toMatchObject({
      aeronaveId: '3',
      numeroDoTrecho: '1',
      km: '',
    });
  });

  it('o corpo lê a distância brasileira, apara os textos e nunca leva NaN', () => {
    const rascunho = {
      ...rascunhoInicial(GRAVADO),
      relatorioDeVoo: ' rv-2026-042 ',
      origem: ' sbsp',
      km: '1.962,5',
      proprietarioId: '',
    };
    const corpo = corpoDoTrecho(
      rascunho,
      instantesDoTrecho(rascunho.data, rascunho, horariosGravados(GRAVADO)),
    );

    expect(corpo).toMatchObject({
      aeronaveId: 1,
      relatorioDeVoo: 'rv-2026-042',
      numeroDoTrecho: 2,
      origem: 'sbsp',
      km: 1962.5,
      partidaPrevista: GRAVADO.partidaPrevista,
      proprietarioId: undefined,
    });
    expect(JSON.stringify(corpoDoTrecho({ ...rascunho, km: 'dez' }, {}))).toContain('"km":null');
  });
});
