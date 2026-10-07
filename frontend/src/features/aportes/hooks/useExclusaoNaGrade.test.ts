import { describe, expect, it } from 'vitest';

import { ErroDeApi } from '@/api/cliente';

import { mensagemDaFalhaAoExcluir } from './useExclusaoNaGrade';

describe('mensagemDaFalhaAoExcluir', () => {
  const descricao = 'aporte de Ricardo Meirelles em 03/10/26';

  it('o 404 é o registro que outra pessoa já excluiu', () => {
    expect(
      mensagemDaFalhaAoExcluir(new ErroDeApi('Aporte não encontrado.', 404, null), descricao),
    ).toBe('O aporte de Ricardo Meirelles em 03/10/26 já tinha sido excluído.');
  });

  it('as demais falhas dizem o item e o motivo', () => {
    expect(
      mensagemDaFalhaAoExcluir(
        new ErroDeApi('Não foi possível falar com o servidor.', 0, null),
        descricao,
      ),
    ).toBe(
      'Não foi possível excluir o aporte de Ricardo Meirelles em 03/10/26. Não foi possível falar com o servidor.',
    );
  });
});
