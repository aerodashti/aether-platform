import { useEffect, useRef } from 'react';

import { Texto } from '@/design-system/primitivos/Texto';
import { usePassosDeAcesso } from '@/features/autenticacao/hooks/usePassosDeAcesso';

import { ArteDoGlobo } from './ArteDoGlobo';
import { FundoDoPainel } from './FundoDoPainel';
import estilos from './PaginaDeLogin.module.css';
import { PassoDeCodigo } from './PassoDeCodigo';
import { PassoDeEmail } from './PassoDeEmail';
import { PassoDeEntrada } from './PassoDeEntrada';
import { PassoDeNovaSenha } from './PassoDeNovaSenha';

/**
 * A tela de entrada: quatro passos no mesmo painel, sem trocar de rota.
 *
 * <p>Os passos não são URLs porque nenhum deles é endereçável — voltar ao "código" depois de sair
 * da tela não faria sentido sem o código em mãos, e um link para o passo da senha nova seria um
 * convite a compartilhar um estado que só vale com o código já conferido.
 */
export function PaginaDeLogin() {
  const acesso = usePassosDeAcesso();
  const areaDoPasso = useRef<HTMLDivElement>(null);

  // Trocar de passo troca o formulário inteiro: sem mover o foco, ele cairia no `body` — o botão
  // que a pessoa acabou de acionar deixa de existir. Levar para o primeiro campo é onde ela
  // precisa digitar de qualquer forma.
  useEffect(() => {
    areaDoPasso.current?.querySelector('input')?.focus();
  }, [acesso.passo]);

  return (
    <div className={estilos.tela}>
      <section className={estilos.painel}>
        <FundoDoPainel />

        <div className={estilos.coluna}>
          <header className={estilos.marca}>
            <Texto variante="titulo" como="p">
              <span className={estilos.palavraDaMarca}>Æther</span>
            </Texto>
            <p className={estilos.assinatura}>Intelligent air asset management</p>
          </header>

          <div className={estilos.formulario} ref={areaDoPasso}>
            {acesso.passo === 'entrada' ? <PassoDeEntrada acesso={acesso} /> : null}
            {acesso.passo === 'email' ? <PassoDeEmail acesso={acesso} /> : null}
            {acesso.passo === 'codigo' ? <PassoDeCodigo acesso={acesso} /> : null}
            {acesso.passo === 'novaSenha' ? <PassoDeNovaSenha acesso={acesso} /> : null}
          </div>

          <p className={estilos.rodape}>© 2026 Æther · Administraair Consultoria</p>
        </div>
      </section>

      <ArteDoGlobo />

      {/* `status` e não `alert`: o aviso não interrompe a leitura, é anunciado na primeira pausa. */}
      <div className={estilos.faixaDeAviso} role="status" aria-live="polite">
        {acesso.aviso ? <p className={estilos.aviso}>{acesso.aviso}</p> : null}
      </div>
    </div>
  );
}
