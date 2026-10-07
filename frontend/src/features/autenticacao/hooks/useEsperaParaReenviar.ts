import { useEffect, useState } from 'react';

/** O `intervalo-entre-codigos` do backend: antes dele, um novo pedido é ignorado em silêncio. */
const INTERVALO_ENTRE_CODIGOS_MS = 60_000;
const UM_SEGUNDO_MS = 1_000;

/**
 * Os segundos até o servidor aceitar outro código. Conta a partir do relógio, e não de ticks: com
 * a aba em segundo plano o navegador espaça os timers, e a contagem não pode atrasar junto.
 */
export function useEsperaParaReenviar() {
  const [liberaEm, setLiberaEm] = useState(0);
  const [agora, setAgora] = useState(() => Date.now());
  const restantes = Math.max(0, Math.ceil((liberaEm - agora) / UM_SEGUNDO_MS));

  useEffect(() => {
    if (restantes === 0) {
      return undefined;
    }
    const relogio = setTimeout(() => setAgora(Date.now()), UM_SEGUNDO_MS);
    return () => clearTimeout(relogio);
  }, [restantes, agora]);

  function iniciar() {
    const momento = Date.now();
    setAgora(momento);
    setLiberaEm(momento + INTERVALO_ENTRE_CODIGOS_MS);
  }

  return { restantes, iniciar };
}
