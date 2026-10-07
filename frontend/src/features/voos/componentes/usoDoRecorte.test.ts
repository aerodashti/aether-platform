import { describe, expect, it } from 'vitest';

import type { TrechoResponse } from '../api/useVoos';

import { diarioDoVoo, relatoriosDoRecorte, usoPorProprietario } from './usoDoRecorte';

const TRECHOS: TrechoResponse[] = [
  {
    id: 1,
    relatorioDeVoo: 'RV-041',
    horas: 0.8,
    km: 365,
    proprietarioId: 1,
    nomeDoProprietario: 'Ricardo',
    vooDeManutencao: false,
  },
  {
    id: 2,
    relatorioDeVoo: 'RV-041',
    horas: 0.9,
    km: 365,
    proprietarioId: 1,
    nomeDoProprietario: 'Ricardo',
    vooDeManutencao: false,
  },
  {
    id: 3,
    relatorioDeVoo: 'RV-042',
    horas: 2.7,
    km: 1962,
    proprietarioId: 2,
    nomeDoProprietario: 'Vetor',
    vooDeManutencao: false,
  },
  { id: 4, relatorioDeVoo: 'RV-043', horas: 0.4, km: 58, vooDeManutencao: true },
];

describe('uso do recorte', () => {
  it('o % de uso é sobre as horas atribuídas: voo de manutenção fica de fora', () => {
    const [vetor, ricardo] = usoPorProprietario(TRECHOS);

    expect(vetor?.nome).toBe('Vetor');
    expect(vetor?.percentual).toBeCloseTo(61.36, 1);
    expect(ricardo?.horas).toBeCloseTo(1.7);
    expect(ricardo?.km).toBe(730);
    expect((vetor?.percentual ?? 0) + (ricardo?.percentual ?? 0)).toBeCloseTo(100);
  });

  it('o filtro por voo lista os Rel. Voo e soma os totais só do voo escolhido', () => {
    expect(relatoriosDoRecorte(TRECHOS)).toEqual(['RV-043', 'RV-042', 'RV-041']);

    const voo = diarioDoVoo(
      { trechos: TRECHOS, totais: { horas: 4.8, km: 2750, pousos: 4 } },
      'RV-041',
    );
    expect(voo?.trechos).toHaveLength(2);
    expect(voo?.totais?.horas).toBeCloseTo(1.7);
    expect(voo?.totais?.km).toBe(730);
    expect(voo?.totais?.pousos).toBe(2);
  });
});
