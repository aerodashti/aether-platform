import { useState } from 'react';

import { useTrocarSenha } from '../api/useConfiguracoes';

import { Cartao } from './Cartao';
import estilos from './CartaoDeSeguranca.module.css';
import { FormularioDaSenha } from './FormularioDaSenha';
import { ResultadoDoEnvio } from './ResultadoDoEnvio';

/**
 * Trocar a própria senha.
 *
 * <p>Pede as duas provas que o servidor exige: a senha atual, que só quem sabe tem, e o código de
 * seis dígitos, que só quem tem o e-mail recebe. É o que impede alguém que encontrou a estação
 * destravada de tomar a conta em dez segundos.
 *
 * <p>A cada troca concluída o formulário é refeito (a `key`), e a região que anuncia "Senha
 * alterada." fica aqui fora: montada junto com o texto, ela não seria lida.
 */
export function CartaoDeSeguranca() {
  const trocar = useTrocarSenha();
  const [trocasConcluidas, setTrocasConcluidas] = useState(0);

  return (
    <Cartao titulo="Segurança" descricao="Altere a senha de acesso da sua conta.">
      <div className={estilos.formularioComResultado}>
        <FormularioDaSenha
          key={trocasConcluidas}
          trocar={trocar}
          aoTrocar={() => setTrocasConcluidas((atual) => atual + 1)}
        />
        <ResultadoDoEnvio
          resultado={
            trocar.isSuccess
              ? { mensagem: 'Senha alterada. As outras sessões foram encerradas.', tom: 'positivo' }
              : undefined
          }
        />
      </div>
    </Cartao>
  );
}
