import { useEffect, useState } from 'react';

export interface EsperaParaReenviar {
  restante: number;
  iniciar: () => void;
}

/**
 * Quantos segundos faltam para poder pedir outro código.
 *
 * <p>O servidor ignora, em silêncio, o pedido feito antes do intervalo — e responde o mesmo 202.
 * Sem esta espera, a tela diria "código enviado" a um pedido que não enviou nada.
 */
export function useEsperaParaReenviar(segundos: number): EsperaParaReenviar {
  const [restante, setRestante] = useState(0);

  useEffect(() => {
    if (restante === 0) {
      return;
    }
    const passo = setTimeout(() => setRestante((atual) => atual - 1), 1000);
    return () => clearTimeout(passo);
  }, [restante]);

  return { restante, iniciar: () => setRestante(segundos) };
}
