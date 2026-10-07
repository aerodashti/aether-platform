import { useEffect, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import { Texto } from '@/design-system/primitivos/Texto';
import { usePassosDeAcesso } from '@/features/autenticacao/hooks/usePassosDeAcesso';

import { ArteDoGlobo } from './ArteDoGlobo';
import { FundoDoPainel } from './FundoDoPainel';
import { Informacao } from './Icones';
import estilos from './PaginaDeLogin.module.css';
import { PassoDeCodigo } from './PassoDeCodigo';
import { PassoDeCriarSenha } from './PassoDeCriarSenha';
import { PassoDeEmail } from './PassoDeEmail';
import { PassoDeEntrada } from './PassoDeEntrada';
import { PassoDeNovaSenha } from './PassoDeNovaSenha';

/** O primeiro campo que ainda falta preencher; com tudo preenchido, o primeiro editável. */
function primeiroCampoAPreencher(area: HTMLElement): HTMLInputElement | undefined {
  const editaveis = Array.from(area.querySelectorAll('input')).filter((campo) => !campo.readOnly);
  return editaveis.find((campo) => campo.value === '') ?? editaveis[0];
}

/**
 * A tela de entrada: os passos no mesmo painel, sem trocar de rota.
 *
 * <p>Os passos não são URLs porque nenhum deles é endereçável — voltar ao "código" depois de sair
 * da tela não faria sentido sem o código em mãos, e um link para o passo da senha nova seria um
 * convite a compartilhar um estado que só vale com o código já conferido. A exceção é o convite:
 * o link do e-mail traz `?convite=<token>`, e é ele que abre o passo de criar a senha.
 */
export function PaginaDeLogin() {
  const navegar = useNavigate();
  const localizacao = useLocation();
  const [parametros] = useSearchParams();

  // Quem foi barrado numa rota volta para ela; quem veio direto vai para a raiz. `replace` tira
  // a tela de entrada do histórico: o Voltar de quem acabou de entrar não deve reabri-la.
  const destino = (localizacao.state as { de?: string } | null)?.de ?? '/';

  const acesso = usePassosDeAcesso({
    convite: parametros.get('convite'),
    aoEntrar: () => void navegar(destino, { replace: true }),
    aoSairDoConvite: () => void navegar(localizacao.pathname, { replace: true }),
  });
  const areaDoPasso = useRef<HTMLDivElement>(null);
  const chaveDoPasso = `${acesso.passo}-${acesso.reenvios}`;

  // Trocar de passo troca o formulário inteiro: sem mover o foco, ele cairia no `body` — o botão
  // que a pessoa acabou de acionar deixa de existir. Se o passo novo já levou o foco a um campo
  // com erro, ele fica lá.
  useEffect(() => {
    const area = areaDoPasso.current;
    if (area && !area.contains(document.activeElement)) {
      primeiroCampoAPreencher(area)?.focus();
    }
  }, [chaveDoPasso]);

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
            {/* A chave muda a cada reenvio: o passo recomeça sem as recusas do código anterior. */}
            {acesso.passo === 'codigo' ? (
              <PassoDeCodigo key={acesso.reenvios} acesso={acesso} />
            ) : null}
            {acesso.passo === 'novaSenha' ? <PassoDeNovaSenha acesso={acesso} /> : null}
            {acesso.passo === 'criarSenha' ? <PassoDeCriarSenha acesso={acesso} /> : null}
          </div>

          <p className={estilos.rodape}>© 2026 Æther · Administraair Consultoria</p>
        </div>
      </section>

      <ArteDoGlobo />

      {/* Só avisos de andamento ("senha redefinida", "código reenviado"); recusa fica no resumo do
          formulário, junto do botão. `status` e não `alert`: é anunciado na primeira pausa. */}
      <div className={estilos.faixaDeAviso} role="status" aria-live="polite">
        {acesso.aviso ? (
          <p className={estilos.aviso}>
            <Informacao />
            {acesso.aviso}
          </p>
        ) : null}
      </div>
    </div>
  );
}
