import { describe, expect, it } from 'vitest';

import type { ProprietarioResponse } from '../api/useProprietarios';

import { correspondeABusca } from './busca';

const OTAVIO: ProprietarioResponse = {
  id: 4,
  nome: 'Otávio Lins',
  cpfCnpj: '15350946056',
  email: 'otavio@exemplo.com.br',
  corDeIdentificacao: 'CINZA',
  situacao: 'INATIVO',
};

describe('correspondeABusca', () => {
  it('busca vazia mostra todos', () => {
    expect(correspondeABusca(OTAVIO, '  ')).toBe(true);
  });

  it('nome sem acento e sem diferença de caixa', () => {
    expect(correspondeABusca(OTAVIO, 'otavio')).toBe(true);
    expect(correspondeABusca(OTAVIO, 'LINS')).toBe(true);
  });

  it('e-mail', () => {
    expect(correspondeABusca(OTAVIO, 'exemplo.com')).toBe(true);
  });

  it('documento copiado do cartão, com pontuação, ou só os números', () => {
    expect(correspondeABusca(OTAVIO, '153.509.460-56')).toBe(true);
    expect(correspondeABusca(OTAVIO, '15350946056')).toBe(true);
    expect(correspondeABusca(OTAVIO, '153.509')).toBe(true);
  });

  it('o que não está em lugar nenhum não aparece', () => {
    expect(correspondeABusca(OTAVIO, 'Helena')).toBe(false);
    expect(correspondeABusca(OTAVIO, '529.982')).toBe(false);
  });

  it('sem documento nem e-mail (quem não gere a conta), procura só pelo nome', () => {
    const resumido = { ...OTAVIO, cpfCnpj: undefined, email: undefined };

    expect(correspondeABusca(resumido, 'otávio')).toBe(true);
    expect(correspondeABusca(resumido, '153')).toBe(false);
  });
});
