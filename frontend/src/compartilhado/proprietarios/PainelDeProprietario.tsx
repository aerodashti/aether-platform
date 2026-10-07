import { useState } from 'react';

import { ResumoDoFormulario } from '@/compartilhado/formulario/ResumoDoFormulario';
import { useValidacao } from '@/compartilhado/formulario/useValidacao';
import { Botao } from '@/design-system/primitivos/Botao';
import { CampoDeTexto } from '@/design-system/primitivos/CampoDeTexto';
import { PainelModal } from '@/design-system/primitivos/PainelModal';
import { SeletorDeCor, type CorDeIdentificacao } from '@/design-system/primitivos/SeletorDeCor';
import { Texto } from '@/design-system/primitivos/Texto';

import { formatarCpfCnpj, mascararCpfCnpj } from './cpfCnpj';
import estilos from './PainelDeProprietario.module.css';
import { useAtualizarProprietario, useCriarProprietario } from './useAcoesDeProprietario';
import type { ProprietarioResponse } from './useProprietarios';
import {
  ROTULOS_DO_PROPRIETARIO,
  validarProprietario,
  type CampoDoProprietario,
  type RascunhoDoProprietario,
} from './validacaoDoProprietario';

interface PainelDeProprietarioProps {
  /** Sem proprietário é cadastro novo; com ele, edição dos mesmos campos. */
  proprietario?: ProprietarioResponse;
  aoFechar: () => void;
  /** Recebe o proprietário salvo — é como o cadastro de aeronave vincula o recém-criado. */
  aoSalvar?: (salvo: ProprietarioResponse) => void;
}

const COR_INICIAL: CorDeIdentificacao = 'PETROLEO';

function rascunhoDe(proprietario: ProprietarioResponse | undefined): RascunhoDoProprietario {
  return {
    nome: proprietario?.nome ?? '',
    cpfCnpj: proprietario?.cpfCnpj ? formatarCpfCnpj(proprietario.cpfCnpj) : '',
    email: proprietario?.email ?? '',
    telefone: proprietario?.telefone ?? '',
    corDeIdentificacao:
      (proprietario?.corDeIdentificacao as CorDeIdentificacao | undefined) ?? COR_INICIAL,
  };
}

/**
 * Cadastro e edição de proprietário, no mesmo painel: os campos são os mesmos, e a situação não
 * está aqui de propósito — desativar e reativar são ações da linha da grade.
 *
 * <p>É compartilhado porque duas telas o abrem: a de Proprietários, que é o CRUD, e o cadastro
 * de aeronave, que só precisa criar um proprietário sem sair do fluxo.
 *
 * <p>Quem monta este componente escolhe o `key` (id do proprietário ou "novo"), e é a remontagem
 * que zera o estado — não há efeito sincronizando props com estado. Durante o envio o painel não
 * sai de cena: cancelar ali não desfaria o cadastro, e o vínculo da Nova aeronave se perderia.
 */
export function PainelDeProprietario({
  proprietario,
  aoFechar,
  aoSalvar,
}: PainelDeProprietarioProps) {
  const [rascunho, setRascunho] = useState(() => rascunhoDe(proprietario));
  const criar = useCriarProprietario();
  const atualizar = useAtualizarProprietario();

  const editando = proprietario?.id != null;
  const mutacao = editando ? atualizar : criar;
  const validacao = useValidacao({
    erros: validarProprietario(rascunho),
    valores: rascunho,
    rotulos: ROTULOS_DO_PROPRIETARIO,
    falha: mutacao.error,
  });

  function alterar<C extends CampoDoProprietario>(campo: C) {
    return (valor: RascunhoDoProprietario[C]) =>
      setRascunho((atual) => ({ ...atual, [campo]: valor }));
  }

  function salvar() {
    const aoConcluir = (salvo: ProprietarioResponse) => {
      aoSalvar?.(salvo);
      aoFechar();
    };
    if (proprietario?.id != null) {
      atualizar.mutate({ id: proprietario.id, cadastro: rascunho }, { onSuccess: aoConcluir });
    } else {
      criar.mutate(rascunho, { onSuccess: aoConcluir });
    }
  }

  const titulo = editando ? 'Editar proprietário' : 'Novo proprietário';

  return (
    <PainelModal aberto aoFechar={aoFechar} rotulo={titulo} podeFechar={!mutacao.isPending}>
      <form
        className={estilos.formulario}
        noValidate
        onSubmit={(evento) => {
          evento.preventDefault();
          validacao.enviar(salvar);
        }}
      >
        <Texto variante="titulo" como="h2">
          {titulo}
        </Texto>
        {/* A orientação é de cadastro: na edição, o proprietário já existe e já pode estar vinculado. */}
        {editando ? null : (
          <Texto variante="apoio" tom="suave" como="p">
            Cadastre o proprietário uma única vez — depois vincule-o a quantas aeronaves precisar,
            com percentuais diferentes em cada uma.
          </Texto>
        )}

        <div ref={validacao.refDoFormulario} className={estilos.campos}>
          <CampoDeTexto
            rotulo={ROTULOS_DO_PROPRIETARIO.nome}
            obrigatorio
            valor={rascunho.nome}
            aoMudar={alterar('nome')}
            erro={validacao.erroDe('nome')}
            exemplo="Ricardo Meirelles"
            maxLength={120}
            autoComplete="off"
          />
          <CampoDeTexto
            rotulo={ROTULOS_DO_PROPRIETARIO.cpfCnpj}
            valor={rascunho.cpfCnpj}
            aoMudar={(valor) => alterar('cpfCnpj')(mascararCpfCnpj(valor))}
            erro={validacao.erroDe('cpfCnpj')}
            apoio="Opcional. CPF com 11 números ou CNPJ com 14 caracteres — o CNPJ emitido desde julho de 2026 pode ter letras."
            exemplo="123.456.789-09"
            maxLength={20}
            inputMode="text"
            autoComplete="off"
          />
          <CampoDeTexto
            rotulo={ROTULOS_DO_PROPRIETARIO.email}
            tipo="email"
            valor={rascunho.email}
            aoMudar={alterar('email')}
            erro={validacao.erroDe('email')}
            exemplo="ricardo@exemplo.com.br"
            maxLength={180}
            autoComplete="off"
          />
          <CampoDeTexto
            rotulo={ROTULOS_DO_PROPRIETARIO.telefone}
            tipo="telefone"
            valor={rascunho.telefone}
            aoMudar={alterar('telefone')}
            erro={validacao.erroDe('telefone')}
            exemplo="+55 11 98888-0000"
            maxLength={20}
            autoComplete="off"
          />
          <SeletorDeCor
            rotulo={ROTULOS_DO_PROPRIETARIO.corDeIdentificacao}
            apoio="Usada para identificar os trechos deste proprietário no calendário."
            valor={rascunho.corDeIdentificacao}
            aoEscolher={alterar('corDeIdentificacao')}
            erro={validacao.erroDe('corDeIdentificacao')}
          />
        </div>

        <ResumoDoFormulario resumo={validacao.resumo} />

        <div className={estilos.acoes}>
          <Botao variante="secundario" aoClicar={aoFechar} desabilitado={mutacao.isPending}>
            Cancelar
          </Botao>
          <Botao tipo="submit" carregando={mutacao.isPending}>
            {editando ? 'Salvar alterações' : 'Cadastrar'}
          </Botao>
        </div>
      </form>
    </PainelModal>
  );
}
