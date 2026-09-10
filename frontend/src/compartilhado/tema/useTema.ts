import { useCallback, useEffect, useState } from 'react';

import {
  aplicarPreferencia,
  lerPreferencia,
  sistemaEstaEscuro,
  type PreferenciaDeTema,
} from './tema';

/**
 * A preferência de tema e como trocá-la.
 *
 * <p>Observa `prefers-color-scheme` enquanto a preferência é "sistema", para que a nota da tela
 * ("O sistema está em escuro") acompanhe o sistema mudando embaixo da aplicação — no macOS isso
 * acontece sozinho ao anoitecer.
 */
export function useTema() {
  const [preferencia, definir] = useState<PreferenciaDeTema>(lerPreferencia);
  const [escuroNoSistema, setEscuroNoSistema] = useState(sistemaEstaEscuro);

  useEffect(() => {
    const consulta = window.matchMedia('(prefers-color-scheme: dark)');
    const aoMudar = (evento: MediaQueryListEvent) => setEscuroNoSistema(evento.matches);
    consulta.addEventListener('change', aoMudar);
    return () => consulta.removeEventListener('change', aoMudar);
  }, []);

  const escolher = useCallback((nova: PreferenciaDeTema) => {
    aplicarPreferencia(nova);
    definir(nova);
  }, []);

  return { preferencia, escolher, escuroNoSistema };
}
