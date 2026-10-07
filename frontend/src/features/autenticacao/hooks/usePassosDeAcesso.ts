import { useMemo, useState } from 'react';

import { ErroDeApi } from '@/api/cliente';
import {
  useConcluirConvite,
  useEntrar,
  useRedefinirSenha,
  useSolicitarCodigo,
  useValidarCodigo,
} from '@/features/autenticacao/api/useAcesso';

import { useEsperaParaReenviar } from './useEsperaParaReenviar';

/** Os passos da área não logada. `criarSenha` só existe para quem chega pelo link do convite. */
export type Passo = 'entrada' | 'email' | 'codigo' | 'novaSenha' | 'criarSenha';

export type CampoDeAcesso =
  'email' | 'senha' | 'emailDeRecuperacao' | 'codigo' | 'novaSenha' | 'confirmacao';

type Campos = Record<CampoDeAcesso, string>;

const CAMPOS_VAZIOS: Campos = {
  email: '',
  senha: '',
  emailDeRecuperacao: '',
  codigo: '',
  novaSenha: '',
  confirmacao: '',
};

/** O que a recuperação digitou e não deve sobreviver a quem desiste dela ou recomeça. */
const SEGREDOS_VAZIOS: Partial<Campos> = { codigo: '', novaSenha: '', confirmacao: '' };

const AVISO_DE_REENVIO =
  'Se o e-mail estiver cadastrado, um novo código chega em instantes. Use o do e-mail mais recente: o anterior deixa de valer.';

interface OpcoesDosPassos {
  /** O token do link do convite, quando a pessoa chegou por ele. */
  convite: string | null;
  aoEntrar: () => void;
  /** Tira o token do endereço: usado ou abandonado, o link não tem mais o que fazer ali. */
  aoSairDoConvite: () => void;
}

interface Transicao {
  campos?: Partial<Campos>;
  /** A recusa que o passo de destino deve mostrar. */
  falha?: unknown;
}

/**
 * O 401 da entrada não diz qual campo errou, de propósito. Na tela ele cai na senha: é o campo que
 * a pessoa vai redigitar, e é para lá que o foco vai.
 */
function recusaNaSenha(falha: unknown): unknown {
  if (falha instanceof ErroDeApi && falha.status === 401) {
    return new ErroDeApi(falha.message, falha.status, falha.requisicao, { senha: falha.message });
  }
  return falha;
}

function recusouOCodigo(falha: unknown): boolean {
  return falha instanceof ErroDeApi && 'codigo' in falha.campos;
}

/**
 * Estado e transições dos passos. Cada passo valida o próprio formulário; aqui fica o que atravessa
 * os passos — os campos, as chamadas e a recusa de cada uma — e o único lugar onde se troca de passo.
 */
export function usePassosDeAcesso({ convite, aoEntrar, aoSairDoConvite }: OpcoesDosPassos) {
  // O token é o do endereço de chegada: tirá-lo da URL depois não pode mudar o que se envia.
  const [token] = useState(convite);
  const [passo, setPasso] = useState<Passo>(convite ? 'criarSenha' : 'entrada');
  const [campos, setCampos] = useState<Campos>(CAMPOS_VAZIOS);
  const [aviso, setAviso] = useState<string | null>(null);
  const [falhaTrazida, setFalhaTrazida] = useState<unknown>();
  const [reenvios, setReenvios] = useState(0);
  const espera = useEsperaParaReenviar();

  const entrada = useEntrar();
  const pedido = useSolicitarCodigo();
  const reenvio = useSolicitarCodigo();
  const conferencia = useValidarCodigo();
  const redefinicao = useRedefinirSenha();
  const conclusao = useConcluirConvite();
  const envios = [entrada, pedido, reenvio, conferencia, redefinicao, conclusao];

  const falhaDaEntrada = useMemo(() => recusaNaSenha(entrada.error), [entrada.error]);

  function preencher(campo: CampoDeAcesso, valor: string) {
    setCampos((atuais) => ({ ...atuais, [campo]: valor }));
    setAviso(null);
  }

  /** Cada passo começa sem a recusa do anterior: ela era de outro formulário. */
  function irPara(destino: Passo, { campos: mudancas, falha }: Transicao = {}) {
    envios.forEach((envio) => envio.reset());
    setFalhaTrazida(falha);
    setCampos((atuais) => ({ ...atuais, ...mudancas }));
    setPasso(destino);
    setAviso(null);
  }

  function entrar() {
    entrada.mutate({ email: campos.email.trim(), senha: campos.senha }, { onSuccess: aoEntrar });
  }

  function irParaRecuperacao() {
    // O e-mail já digitado no login segue adiante; vazio, não apaga o que a recuperação já tinha.
    const digitado = campos.email.trim();
    irPara('email', {
      campos: { ...SEGREDOS_VAZIOS, emailDeRecuperacao: digitado || campos.emailDeRecuperacao },
    });
  }

  function pedirCodigo() {
    pedido.mutate(campos.emailDeRecuperacao.trim(), {
      onSuccess: () => {
        espera.iniciar();
        irPara('codigo', { campos: { codigo: '' } });
      },
    });
  }

  /** O código novo aposenta o anterior: o campo recomeça vazio e o passo, sem as recusas antigas. */
  function reenviarCodigo() {
    setAviso(null);
    reenvio.mutate(campos.emailDeRecuperacao.trim(), {
      onSuccess: () => {
        espera.iniciar();
        irPara('codigo', { campos: { codigo: '' } });
        setReenvios((atuais) => atuais + 1);
        setAviso(AVISO_DE_REENVIO);
      },
    });
  }

  function conferirCodigo() {
    conferencia.mutate(
      { email: campos.emailDeRecuperacao.trim(), codigo: campos.codigo },
      { onSuccess: () => irPara('novaSenha', { campos: { novaSenha: '', confirmacao: '' } }) },
    );
  }

  /** O código pode vencer entre a conferência e a troca: aí se volta ao passo que pede outro. */
  function redefinirSenha() {
    redefinicao.mutate(
      {
        email: campos.emailDeRecuperacao.trim(),
        codigo: campos.codigo,
        novaSenha: campos.novaSenha,
      },
      {
        onSuccess: () => {
          irPara('entrada', {
            campos: { ...SEGREDOS_VAZIOS, email: campos.emailDeRecuperacao.trim(), senha: '' },
          });
          setAviso('Senha redefinida. Entre com a nova senha.');
        },
        onError: (falha) => {
          if (recusouOCodigo(falha)) {
            irPara('codigo', { falha });
          }
        },
      },
    );
  }

  function sairDoConvite() {
    aoSairDoConvite();
    irPara('entrada', { campos: SEGREDOS_VAZIOS });
  }

  function criarSenha() {
    conclusao.mutate(
      { convite: token ?? '', novaSenha: campos.novaSenha },
      {
        onSuccess: () => {
          sairDoConvite();
          setAviso('Senha criada. Entre com o e-mail em que recebeu o convite e a nova senha.');
        },
      },
    );
  }

  return {
    passo,
    campos,
    aviso,
    /** Muda a cada código reenviado: o passo do código recomeça do zero. */
    reenvios,
    esperaParaReenviar: espera.restantes,
    enviando: envios.some((envio) => envio.isPending),
    falhaDaEntrada,
    falhaDoPedido: pedido.error,
    falhaDoCodigo: conferencia.error ?? reenvio.error ?? falhaTrazida,
    falhaDaRedefinicao: redefinicao.error,
    falhaDoConvite: conclusao.error,
    preencher,
    entrar,
    irParaRecuperacao,
    pedirCodigo,
    reenviarCodigo,
    conferirCodigo,
    redefinirSenha,
    criarSenha,
    sairDoConvite,
    voltarParaEntrada: () => irPara('entrada', { campos: SEGREDOS_VAZIOS }),
    voltarParaEmail: () => irPara('email', { campos: SEGREDOS_VAZIOS }),
  };
}

export type Acesso = ReturnType<typeof usePassosDeAcesso>;
