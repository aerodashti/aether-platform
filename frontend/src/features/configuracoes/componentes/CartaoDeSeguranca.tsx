import { useState } from 'react';

import { ErroDeApi } from '@/api/cliente';
import { Botao } from '@/design-system/primitivos/Botao';
import { CampoDeTexto } from '@/design-system/primitivos/CampoDeTexto';
import { Texto } from '@/design-system/primitivos/Texto';

import { useSolicitarTokenDeSenha, useTrocarSenha } from '../api/useConfiguracoes';

import { Cartao } from './Cartao';
import estilos from './CartaoDeSeguranca.module.css';

/**
 * Trocar a própria senha.
 *
 * <p>Pede as duas provas que o servidor exige: a senha atual, que só quem sabe tem, e o código de
 * seis dígitos, que só quem tem o e-mail recebe. É o que impede alguém que encontrou a estação
 * destravada de tomar a conta em dez segundos.
 */
export function CartaoDeSeguranca() {
  const [atual, setAtual] = useState('');
  const [nova, setNova] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [codigo, setCodigo] = useState('');
  const pedirToken = useSolicitarTokenDeSenha();
  const trocar = useTrocarSenha();

  const confere = nova.length === 0 || confirmacao.length === 0 || nova === confirmacao;
  const completo =
    atual.length > 0 && nova.length >= 8 && nova === confirmacao && /^\d{6}$/.test(codigo);
  const erro = trocar.error instanceof ErroDeApi ? trocar.error.message : undefined;

  function enviar() {
    trocar.mutate(
      { senhaAtual: atual, novaSenha: nova, codigo },
      {
        onSuccess: () => {
          setAtual('');
          setNova('');
          setConfirmacao('');
          setCodigo('');
        },
      },
    );
  }

  return (
    <Cartao titulo="Segurança" descricao="Altere a senha de acesso da sua conta.">
      <CampoDeTexto
        rotulo="Senha atual"
        valor={atual}
        aoMudar={setAtual}
        tipo="senha"
        autoComplete="current-password"
        erro={erro}
      />
      <CampoDeTexto
        rotulo="Nova senha"
        valor={nova}
        aoMudar={setNova}
        tipo="senha"
        autoComplete="new-password"
        apoio="Mínimo de 8 caracteres."
      />
      <CampoDeTexto
        rotulo="Confirmar nova senha"
        valor={confirmacao}
        aoMudar={setConfirmacao}
        tipo="senha"
        autoComplete="new-password"
        erro={confere ? undefined : 'As duas senhas não conferem.'}
      />

      <div className={estilos.token}>
        <Texto variante="apoio" tom="suave" como="p">
          Por segurança, enviamos um código de seis dígitos para o e-mail cadastrado. Informe-o para
          confirmar a troca.
        </Texto>
        <div className={estilos.linha}>
          <div className={estilos.campo}>
            <CampoDeTexto
              rotulo="Código de confirmação"
              valor={codigo}
              aoMudar={setCodigo}
              inputMode="numeric"
              alinhamento="centro"
              espacado
              maxLength={6}
              autoComplete="one-time-code"
            />
          </div>
          <Botao
            variante="secundario"
            aoClicar={() => pedirToken.mutate()}
            carregando={pedirToken.isPending}
          >
            Enviar código
          </Botao>
        </div>
        {pedirToken.isSuccess ? (
          <Texto variante="apoio" tom="positivo" como="p">
            Código enviado para o e-mail cadastrado.
          </Texto>
        ) : null}
      </div>

      <div className={estilos.acao}>
        <Botao aoClicar={enviar} desabilitado={!completo} carregando={trocar.isPending}>
          Alterar senha
        </Botao>
        {trocar.isSuccess ? (
          <Texto variante="apoio" tom="positivo" como="span">
            Senha alterada.
          </Texto>
        ) : null}
      </div>
    </Cartao>
  );
}
