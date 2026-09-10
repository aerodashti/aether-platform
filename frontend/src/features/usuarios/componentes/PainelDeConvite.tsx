import { useState } from 'react';

import { ErroDeApi } from '@/api/cliente';
import type { PapelDoUsuario } from '@/compartilhado/sessao/sessao';
import { Botao } from '@/design-system/primitivos/Botao';
import { CampoDeTexto } from '@/design-system/primitivos/CampoDeTexto';
import { PainelModal } from '@/design-system/primitivos/PainelModal';
import { Selecao } from '@/design-system/primitivos/Selecao';
import { Texto } from '@/design-system/primitivos/Texto';

import { useConvidarUsuario } from '../api/useUsuarios';

import estilos from './PainelDeConvite.module.css';
import { PAPEIS, ROTULO_DO_PAPEL } from './rotulos';

interface PainelDeConviteProps {
  aberto: boolean;
  aoFechar: () => void;
}

const PAPEL_INICIAL: PapelDoUsuario = 'GESTOR';

/**
 * O convite.
 *
 * <p>Não há campo de senha, e a ausência é a regra do produto: quem cria a senha é a própria
 * pessoa, pelo link do convite.
 */
export function PainelDeConvite({ aberto, aoFechar }: PainelDeConviteProps) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [papel, setPapel] = useState<PapelDoUsuario>(PAPEL_INICIAL);
  const convidar = useConvidarUsuario();

  function fechar() {
    setNome('');
    setEmail('');
    setPapel(PAPEL_INICIAL);
    convidar.reset();
    aoFechar();
  }

  function enviarConvite() {
    convidar.mutate({ nome, email, papel }, { onSuccess: fechar });
  }

  const erro = convidar.error instanceof ErroDeApi ? convidar.error.message : undefined;
  const podeEnviar = nome.trim().length > 0 && email.trim().length > 0;

  return (
    <PainelModal aberto={aberto} aoFechar={fechar} rotulo="Convidar usuário">
      <Texto variante="titulo" como="h2">
        Convidar usuário
      </Texto>
      <Texto variante="apoio" tom="suave" como="p">
        A pessoa recebe um e-mail com o link para criar a própria senha. Nenhuma senha é definida
        por você.
      </Texto>

      <CampoDeTexto
        rotulo="Nome"
        valor={nome}
        aoMudar={setNome}
        exemplo="Camila Nogueira"
        maxLength={120}
        autoComplete="off"
      />
      <CampoDeTexto
        rotulo="E-mail"
        valor={email}
        aoMudar={setEmail}
        tipo="email"
        exemplo="camila@administraair.com.br"
        maxLength={180}
        inputMode="email"
        autoComplete="off"
        erro={erro}
      />
      <Selecao
        rotulo="Papel"
        valor={papel}
        aoMudar={(valor) => setPapel(valor as PapelDoUsuario)}
        opcoes={PAPEIS.map((opcao) => ({ valor: opcao, rotulo: ROTULO_DO_PAPEL[opcao] }))}
      />

      <div className={estilos.acoes}>
        <Botao variante="secundario" aoClicar={fechar}>
          Cancelar
        </Botao>
        <Botao aoClicar={enviarConvite} desabilitado={!podeEnviar} carregando={convidar.isPending}>
          Enviar convite
        </Botao>
      </div>
    </PainelModal>
  );
}
