import { useState } from 'react';

import { ResumoDoFormulario } from '@/compartilhado/formulario/ResumoDoFormulario';
import { useValidacao } from '@/compartilhado/formulario/useValidacao';
import type { PapelDoUsuario } from '@/compartilhado/sessao/sessao';
import { Botao } from '@/design-system/primitivos/Botao';
import { CampoDeTexto } from '@/design-system/primitivos/CampoDeTexto';
import { PainelModal } from '@/design-system/primitivos/PainelModal';
import { Selecao } from '@/design-system/primitivos/Selecao';
import { Texto } from '@/design-system/primitivos/Texto';

import { useConvidarUsuario, type UsuarioResponse } from '../api/useUsuarios';

import estilos from './Painel.module.css';
import {
  DESCRICAO_DO_PAPEL,
  HORAS_DE_VALIDADE_DO_CONVITE,
  PAPEIS,
  ROTULO_DO_PAPEL,
} from './rotulos';
import {
  ROTULOS_DO_CONVITE,
  validarConvite,
  type CampoDoConvite,
  type RascunhoDoConvite,
} from './validacaoDoConvite';

interface PainelDeConviteProps {
  aoFechar: () => void;
  /** O painel fecha ao convidar; quem anuncia o resultado é a página, que continua na tela. */
  aoConvidar: (convidado: UsuarioResponse) => void;
}

const RASCUNHO_INICIAL: RascunhoDoConvite = { nome: '', email: '', papel: 'GESTOR' };

const OPCOES_DE_PAPEL = PAPEIS.map((papel) => ({ valor: papel, rotulo: ROTULO_DO_PAPEL[papel] }));

/**
 * O convite.
 *
 * <p>Não há campo de senha, e a ausência é a regra do produto: quem cria a senha é a própria
 * pessoa, pelo link do convite.
 *
 * <p>Nasce a cada abertura (a página só o monta quando aberto): rascunho, erros e a tentativa de
 * salvar começam do zero.
 */
export function PainelDeConvite({ aoFechar, aoConvidar }: PainelDeConviteProps) {
  const [rascunho, setRascunho] = useState(RASCUNHO_INICIAL);
  const convidar = useConvidarUsuario();
  const validacao = useValidacao({
    erros: validarConvite(rascunho),
    valores: rascunho,
    rotulos: ROTULOS_DO_CONVITE,
    falha: convidar.error,
  });

  function mudar(campo: CampoDoConvite) {
    return (valor: string) => setRascunho((atual) => ({ ...atual, [campo]: valor }));
  }

  function enviarConvite() {
    const convite = {
      nome: rascunho.nome.trim(),
      email: rascunho.email.trim(),
      papel: rascunho.papel,
    };
    convidar.mutate(convite, {
      onSuccess: (convidado) => {
        aoConvidar(convidado);
        aoFechar();
      },
    });
  }

  return (
    <PainelModal
      aberto
      aoFechar={aoFechar}
      rotulo="Convidar usuário"
      podeFechar={!convidar.isPending}
    >
      <form
        noValidate
        onSubmit={(evento) => {
          evento.preventDefault();
          validacao.enviar(enviarConvite);
        }}
      >
        <div ref={validacao.refDoFormulario} className={estilos.campos}>
          <Texto variante="titulo" como="h2">
            Convidar usuário
          </Texto>
          <Texto variante="apoio" tom="suave" como="p">
            A pessoa recebe um e-mail com o link para criar a própria senha, que vale{' '}
            {HORAS_DE_VALIDADE_DO_CONVITE} horas. Nenhuma senha é definida por você.
          </Texto>

          <CampoDeTexto
            rotulo="Nome"
            obrigatorio
            valor={rascunho.nome}
            aoMudar={mudar('nome')}
            exemplo="Camila Nogueira"
            maxLength={120}
            autoComplete="off"
            erro={validacao.erroDe('nome')}
          />
          <CampoDeTexto
            rotulo="E-mail"
            obrigatorio
            valor={rascunho.email}
            aoMudar={mudar('email')}
            tipo="email"
            exemplo="camila@administraair.com.br"
            maxLength={180}
            autoComplete="off"
            erro={validacao.erroDe('email')}
          />
          <Selecao
            rotulo="Papel"
            obrigatorio
            valor={rascunho.papel}
            aoMudar={(valor) =>
              setRascunho((atual) => ({ ...atual, papel: valor as PapelDoUsuario }))
            }
            opcoes={OPCOES_DE_PAPEL}
            apoio={DESCRICAO_DO_PAPEL[rascunho.papel]}
            erro={validacao.erroDe('papel')}
          />

          <ResumoDoFormulario resumo={validacao.resumo} />
          <div className={estilos.acoes}>
            <Botao variante="secundario" aoClicar={aoFechar} desabilitado={convidar.isPending}>
              Cancelar
            </Botao>
            <Botao tipo="submit" carregando={convidar.isPending}>
              Enviar convite
            </Botao>
          </div>
        </div>
      </form>
    </PainelModal>
  );
}
