import { useState } from 'react';

import { ErroDeApi } from '@/api/cliente';
import { Botao } from '@/design-system/primitivos/Botao';
import { CampoDeTexto } from '@/design-system/primitivos/CampoDeTexto';
import { PainelModal } from '@/design-system/primitivos/PainelModal';
import { SeletorDeCor, type CorDeIdentificacao } from '@/design-system/primitivos/SeletorDeCor';
import { Texto } from '@/design-system/primitivos/Texto';

import estilos from './PainelDeProprietario.module.css';
import { useAtualizarProprietario, useCriarProprietario } from './useAcoesDeProprietario';
import type { ProprietarioResponse } from './useProprietarios';

interface PainelDeProprietarioProps {
  /** Sem proprietário é cadastro novo; com ele, edição dos mesmos campos. */
  proprietario?: ProprietarioResponse;
  aoFechar: () => void;
  /** Recebe o proprietário salvo — é como o cadastro de aeronave vincula o recém-criado. */
  aoSalvar?: (salvo: ProprietarioResponse) => void;
}

const COR_INICIAL: CorDeIdentificacao = 'PETROLEO';

/**
 * Cadastro e edição de proprietário, no mesmo painel: os campos são os mesmos, e a situação não
 * está aqui de propósito — desativar e reativar são ações da linha da grade.
 *
 * <p>É compartilhado porque duas telas o abrem: a de Proprietários, que é o CRUD, e o cadastro
 * de aeronave, que só precisa criar um proprietário sem sair do fluxo.
 *
 * <p>Quem monta este componente escolhe o `key` (id do proprietário ou "novo"), e é a remontagem
 * que zera o estado — não há efeito sincronizando props com estado.
 */
export function PainelDeProprietario({
  proprietario,
  aoFechar,
  aoSalvar,
}: PainelDeProprietarioProps) {
  const [nome, setNome] = useState(proprietario?.nome ?? '');
  const [cpfCnpj, setCpfCnpj] = useState(proprietario?.cpfCnpj ?? '');
  const [email, setEmail] = useState(proprietario?.email ?? '');
  const [telefone, setTelefone] = useState(proprietario?.telefone ?? '');
  const [cor, setCor] = useState<CorDeIdentificacao>(
    (proprietario?.corDeIdentificacao as CorDeIdentificacao | undefined) ?? COR_INICIAL,
  );
  const criar = useCriarProprietario();
  const atualizar = useAtualizarProprietario();

  const editando = proprietario?.id != null;
  const mutacao = editando ? atualizar : criar;

  function salvar() {
    const cadastro = { nome, cpfCnpj, email, telefone, corDeIdentificacao: cor };
    const aoConcluir = (salvo: ProprietarioResponse) => {
      aoSalvar?.(salvo);
      aoFechar();
    };
    if (proprietario?.id != null) {
      atualizar.mutate({ id: proprietario.id, cadastro }, { onSuccess: aoConcluir });
    } else {
      criar.mutate(cadastro, { onSuccess: aoConcluir });
    }
  }

  // O 400 do documento curto e o 409 do duplicado falam do mesmo campo: o erro aparece nele.
  const erro = mutacao.error instanceof ErroDeApi ? mutacao.error.message : undefined;

  return (
    <PainelModal
      aberto
      aoFechar={aoFechar}
      rotulo={editando ? 'Editar proprietário' : 'Novo proprietário'}
    >
      <Texto variante="titulo" como="h2">
        {editando ? 'Editar proprietário' : 'Novo proprietário'}
      </Texto>
      <Texto variante="apoio" tom="suave" como="p">
        Cadastre o proprietário uma única vez — depois vincule-o a quantas aeronaves precisar, com
        percentuais diferentes em cada uma.
      </Texto>

      <CampoDeTexto
        rotulo="Nome / Nome fantasia"
        valor={nome}
        aoMudar={setNome}
        exemplo="Ricardo Meirelles"
        maxLength={120}
        autoComplete="off"
      />
      <CampoDeTexto
        rotulo="CPF / CNPJ"
        valor={cpfCnpj}
        aoMudar={setCpfCnpj}
        exemplo="123.456.789-01"
        maxLength={20}
        inputMode="numeric"
        autoComplete="off"
        erro={erro}
      />
      <CampoDeTexto
        rotulo="E-mail"
        valor={email}
        aoMudar={setEmail}
        tipo="email"
        exemplo="ricardo@exemplo.com.br"
        maxLength={180}
        inputMode="email"
        autoComplete="off"
      />
      <CampoDeTexto
        rotulo="Telefone"
        valor={telefone}
        aoMudar={setTelefone}
        exemplo="+55 11 98888-0000"
        maxLength={20}
        autoComplete="off"
      />

      <div>
        <Texto variante="corpo" como="p">
          Cor de identificação
        </Texto>
        <Texto variante="apoio" tom="suave" como="p">
          Usada para identificar os trechos deste proprietário no calendário.
        </Texto>
        <div className={estilos.cores}>
          <SeletorDeCor rotulo="Cor de identificação" valor={cor} aoEscolher={setCor} />
        </div>
      </div>

      <div className={estilos.acoes}>
        <Botao variante="secundario" aoClicar={aoFechar}>
          Cancelar
        </Botao>
        <Botao
          aoClicar={salvar}
          desabilitado={nome.trim().length === 0}
          carregando={mutacao.isPending}
        >
          {editando ? 'Salvar alterações' : 'Cadastrar'}
        </Botao>
      </div>
    </PainelModal>
  );
}
