/**
 * Único ponto do frontend que fala com o console.
 *
 * Os níveis têm o mesmo significado do backend (ver `docs/logs.md`): `erro` exige ação, `aviso` é
 * degradação recuperável, `info` é evento de negócio e `debug` é detalhe técnico — desligado em
 * produção. Quando entrar um coletor (Sentry), ele entra aqui e em nenhum outro lugar.
 */
type Contexto = Record<string, unknown>;

export const logger = {
  debug(mensagem: string, contexto?: Contexto): void {
    if (import.meta.env.PROD) {
      return;
    }
    console.debug(mensagem, contexto ?? {});
  },

  info(mensagem: string, contexto?: Contexto): void {
    console.info(mensagem, contexto ?? {});
  },

  aviso(mensagem: string, contexto?: Contexto): void {
    console.warn(mensagem, contexto ?? {});
  },

  erro(mensagem: string, contexto?: Contexto): void {
    console.error(mensagem, contexto ?? {});
  },
};
