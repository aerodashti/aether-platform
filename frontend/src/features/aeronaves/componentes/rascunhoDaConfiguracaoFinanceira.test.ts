import { describe, expect, it } from 'vitest';

import type { DetalheDaAeronaveResponse } from '../api/useDetalheDaAeronave';

import { configuracaoParaEnvio, rascunhoDaConfiguracao } from './rascunhoDaConfiguracaoFinanceira';

function detalheCom(financeiro: Record<string, unknown>) {
  return { id: 4, configuracaoFinanceira: financeiro } as unknown as DetalheDaAeronaveResponse;
}

describe('rascunho da configuração financeira', () => {
  it('abre o valor ausente vazio e os valores com vírgula, como o saldo', () => {
    const vazio = rascunhoDaConfiguracao(detalheCom({ valorDoAporte: null, saldoDeAbertura: 0 }));
    const preenchido = rascunhoDaConfiguracao(
      detalheCom({ valorDoAporte: 85000.5, saldoDeAbertura: -12500.25 }),
    );

    expect(vazio.valorDoAporte).toBe('');
    expect(preenchido.valorDoAporte).toBe('85000,5');
    expect(preenchido.saldoDeAbertura).toBe('-12500,25');
  });

  it('envia milhar como milhar: "12.500" é doze mil e quinhentos', () => {
    const envio = configuracaoParaEnvio({
      baseDoRateio: 'POR_PROPRIEDADE',
      modeloDeAporte: 'FIXO',
      periodicidadeDoAporteMeses: '3',
      valorDoAporte: '85.000,00',
      diaDeFechamento: '10',
      saldoDeAbertura: '12.500',
    });

    expect(envio).toEqual({
      baseDoRateio: 'POR_PROPRIEDADE',
      modeloDeAporte: 'FIXO',
      periodicidadeDoAporteMeses: 3,
      valorDoAporte: 85000,
      diaDeFechamento: 10,
      saldoDeAbertura: 12500,
    });
  });

  it('no proporcional ao uso o valor do aporte não vai', () => {
    const envio = configuracaoParaEnvio({
      baseDoRateio: 'POR_USO',
      modeloDeAporte: 'PROPORCIONAL_AO_USO',
      periodicidadeDoAporteMeses: '1',
      valorDoAporte: '85.000,00',
      diaDeFechamento: '1',
      saldoDeAbertura: '0',
    });

    expect(envio.valorDoAporte).toBeUndefined();
  });
});
