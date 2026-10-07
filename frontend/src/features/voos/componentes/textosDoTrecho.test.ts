import { describe, expect, it } from 'vitest';

import { instantesDoTrecho } from './horarios';
import {
  apoioDaData,
  apoioDoDestino,
  apoioDoDia,
  opcoesDeAtribuicao,
  textoDaDuracao,
} from './textosDoTrecho';

describe('textos do painel de trecho', () => {
  it('diz quando partida ou pouso saem da data do trecho', () => {
    expect(apoioDoDia('Pouso', new Date(2026, 8, 11, 1, 0), '2026-09-10')).toBe(
      'Pouso no dia seguinte, 11/09/2026 (+1 dia).',
    );
    expect(apoioDoDia('Partida', new Date(2026, 8, 9, 23, 50), '2026-09-10')).toBe(
      'Partida no dia anterior, 09/09/2026 (−1 dia).',
    );
    expect(apoioDoDia('Pouso', new Date(2026, 8, 10, 11, 0), '2026-09-10')).toBeUndefined();
  });

  it('a duração ao vivo diz também a virada da meia-noite', () => {
    const virada = instantesDoTrecho('2026-09-10', {
      partidaPrevista: '23:30',
      pousoPrevisto: '01:00',
      partidaRealizada: '',
      pousoRealizado: '',
    });

    expect(textoDaDuracao(virada)).toBe('Duração (automática): 1,5 h, com pouso no dia seguinte.');
    expect(textoDaDuracao({})).toBe('Duração (automática): —');
  });

  it('o planejado com data passada avisa que ainda não soma nos contadores', () => {
    expect(apoioDaData('2026-10-01', false, '2026-10-07')).toMatch(/Data passada/);
    expect(apoioDaData('2026-10-01', true, '2026-10-07')).toBeUndefined();
    expect(apoioDaData('2026-10-08', false, '2026-10-07')).toBeUndefined();
  });

  it('origem igual ao destino é um voo local, dito no destino', () => {
    expect(apoioDoDestino('SBSP', 'sbsp')).toBe('Igual à origem: voo local.');
    expect(apoioDoDestino('SBSP', 'SBRJ')).toBe('Código ICAO de 4 letras.');
  });

  it('a atribuição oferece os donos ativos e mantém quem já recebeu, mesmo inativo', () => {
    const opcoes = opcoesDeAtribuicao(
      [
        { id: 7, nome: 'Ricardo Meirelles', situacao: 'ATIVO' },
        { id: 4, nome: 'Otávio Lins', situacao: 'INATIVO' },
        { id: 9, nome: 'Helena Sarraf', situacao: 'INATIVO' },
      ],
      () => true,
      '4',
    );

    expect(opcoes.map((opcao) => opcao.rotulo)).toEqual([
      'Manutenção · divide entre todos',
      'Ricardo Meirelles',
      'Otávio Lins (inativo)',
    ]);
  });
});
