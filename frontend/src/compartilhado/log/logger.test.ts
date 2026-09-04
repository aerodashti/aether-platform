import { afterEach, describe, expect, it, vi } from 'vitest';

import { logger } from './logger';

describe('logger', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('encaminha cada nível para o console correspondente', () => {
    const erro = vi.spyOn(console, 'error').mockImplementation(() => {});
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});

    logger.erro('falhou', { requisicao: 'abc-123' });
    logger.aviso('degradou');
    logger.info('abriu a tela');

    expect(erro).toHaveBeenCalledWith('falhou', { requisicao: 'abc-123' });
    expect(aviso).toHaveBeenCalledWith('degradou', {});
    expect(info).toHaveBeenCalledWith('abriu a tela', {});
  });

  it('não escreve debug em produção', () => {
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => {});

    vi.stubEnv('PROD', true);
    logger.debug('detalhe técnico');
    expect(debug).not.toHaveBeenCalled();

    vi.stubEnv('PROD', false);
    logger.debug('detalhe técnico');
    expect(debug).toHaveBeenCalledTimes(1);
  });
});
