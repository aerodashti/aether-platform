import type { PreferenciaDeTema } from '@/compartilhado/tema/tema';
import { useTema } from '@/compartilhado/tema/useTema';
import { GrupoDeOpcoes } from '@/design-system/primitivos/GrupoDeOpcoes';
import { Texto } from '@/design-system/primitivos/Texto';

import { Cartao } from './Cartao';

const OPCOES = [
  { valor: 'claro', rotulo: 'Tema claro' },
  { valor: 'escuro', rotulo: 'Tema escuro' },
  { valor: 'sistema', rotulo: 'Do sistema' },
];

/**
 * O tema.
 *
 * <p>Não tem botão de salvar, e a ausência é a decisão: a escolha se aplica na hora, e o
 * resultado é a própria tela mudando de cor. Pedir confirmação para algo cujo efeito já está
 * visível é cerimônia sem função.
 */
export function CartaoDeAparencia() {
  const { preferencia, escolher, escuroNoSistema } = useTema();

  const nota =
    preferencia === 'sistema'
      ? `Seguindo o sistema, que está em ${escuroNoSistema ? 'escuro' : 'claro'}.`
      : 'Preferência fixada neste navegador.';

  return (
    <Cartao titulo="Aparência" descricao="Tema da interface neste navegador.">
      <GrupoDeOpcoes
        rotulo="Tema da interface"
        valor={preferencia}
        opcoes={OPCOES}
        aoEscolher={(valor) => escolher(valor as PreferenciaDeTema)}
        marcador
        larguraIgual
      />
      <Texto variante="apoio" tom="suave" como="p">
        {nota}
      </Texto>
    </Cartao>
  );
}
