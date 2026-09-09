import { useCallback, useMemo, useState } from 'react';

import { ErroDeApi } from '@/api/cliente';
import { contexto } from '@/compartilhado/observabilidade/observabilidade';
import {
  useEntrar,
  useRedefinirSenha,
  useSolicitarCodigo,
  useValidarCodigo,
  type SessaoResponse,
} from '@/features/autenticacao/api/useAcesso';

/** Os quatro passos da área não logada, na ordem em que a tela os apresenta. */
export type Passo = 'entrada' | 'email' | 'codigo' | 'novaSenha';

export type CampoDeAcesso =
  'email' | 'senha' | 'emailDeRecuperacao' | 'codigo' | 'novaSenha' | 'confirmacao';

type Campos = Record<CampoDeAcesso, string>;
type Erros = Partial<Record<CampoDeAcesso, string>>;

const CAMPOS_VAZIOS: Campos = {
  email: '',
  senha: '',
  emailDeRecuperacao: '',
  codigo: '',
  novaSenha: '',
  confirmacao: '',
};

/** Mesma forma aceita pelo backend: algo, arroba, algo, ponto, algo — sem espaços. */
const FORMATO_DE_EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const TAMANHO_DO_CODIGO = 6;
const TAMANHO_MINIMO_DA_SENHA = 8;

interface AcessoConcluido {
  usuario: SessaoResponse;
}

/**
 * Estado e regras dos quatro passos. Fica fora do JSX de propósito: a tela só desenha, e cada
 * transição de passo tem um único lugar onde acontece.
 */
export function usePassosDeAcesso(aoEntrar?: (dados: AcessoConcluido) => void) {
  const [passo, setPasso] = useState<Passo>('entrada');
  const [campos, setCampos] = useState<Campos>(CAMPOS_VAZIOS);
  const [erros, setErros] = useState<Erros>({});
  const [aviso, setAviso] = useState<string | null>(null);

  const entrar = useEntrar();
  const solicitarCodigo = useSolicitarCodigo();
  const validarCodigo = useValidarCodigo();
  const redefinirSenha = useRedefinirSenha();

  const preencher = useCallback((campo: CampoDeAcesso, valor: string) => {
    setCampos((atuais) => ({ ...atuais, [campo]: valor }));
    // Corrigir o campo limpa o erro dele: manter a borda vermelha enquanto a pessoa digita a
    // correção faz o formulário parecer quebrado.
    setErros((atuais) => {
      if (!(campo in atuais)) {
        return atuais;
      }
      const restantes = { ...atuais };
      delete restantes[campo];
      return restantes;
    });
    setAviso(null);
  }, []);

  const irPara = useCallback((destino: Passo) => {
    setPasso(destino);
    setErros({});
    setAviso(null);
  }, []);

  /** Traduz a falha da API para o texto que a pessoa lê. */
  const relatar = useCallback((falha: unknown, reserva: string) => {
    const texto = falha instanceof ErroDeApi ? falha.message : reserva;
    contexto.erro('Falha no acesso', { mensagem: texto });
    setAviso(texto);
  }, []);

  const submeterEntrada = useCallback(async () => {
    const encontrados: Erros = {};
    if (!FORMATO_DE_EMAIL.test(campos.email.trim())) {
      encontrados.email = 'Informe um e-mail válido.';
    }
    if (!campos.senha) {
      encontrados.senha = 'Informe a senha.';
    }
    contexto.decisao('acesso.entrada_valida', Object.keys(encontrados).length === 0);
    if (Object.keys(encontrados).length > 0) {
      setErros(encontrados);
      return;
    }

    try {
      const usuario = await entrar.mutateAsync({
        email: campos.email.trim(),
        senha: campos.senha,
      });
      aoEntrar?.({ usuario });
    } catch (falha) {
      relatar(falha, 'Não foi possível entrar. Tente novamente em instantes.');
    }
  }, [aoEntrar, campos.email, campos.senha, entrar, relatar]);

  const irParaRecuperacao = useCallback(() => {
    // O e-mail já digitado segue para o passo seguinte: quem errou a senha não deve redigitá-lo.
    setCampos((atuais) => ({ ...atuais, emailDeRecuperacao: atuais.email }));
    irPara('email');
  }, [irPara]);

  const submeterEmail = useCallback(async () => {
    const email = campos.emailDeRecuperacao.trim();
    const valido = FORMATO_DE_EMAIL.test(email);
    contexto.decisao('acesso.email_valido', valido);
    if (!valido) {
      setErros({ emailDeRecuperacao: 'Informe um e-mail válido.' });
      return;
    }

    try {
      await solicitarCodigo.mutateAsync(email);
      irPara('codigo');
    } catch (falha) {
      relatar(falha, 'Não foi possível enviar o código. Tente novamente em instantes.');
    }
  }, [campos.emailDeRecuperacao, irPara, relatar, solicitarCodigo]);

  const reenviarCodigo = useCallback(async () => {
    try {
      await solicitarCodigo.mutateAsync(campos.emailDeRecuperacao.trim());
      setAviso('Código reenviado. Confira sua caixa de entrada.');
    } catch (falha) {
      relatar(falha, 'Não foi possível reenviar o código.');
    }
  }, [campos.emailDeRecuperacao, relatar, solicitarCodigo]);

  const submeterCodigo = useCallback(async () => {
    const codigo = campos.codigo.trim();
    const completo = new RegExp(`^\\d{${TAMANHO_DO_CODIGO}}$`).test(codigo);
    contexto.decisao('acesso.codigo_completo', completo);
    if (!completo) {
      setErros({ codigo: 'O código tem seis dígitos.' });
      return;
    }

    try {
      await validarCodigo.mutateAsync({ email: campos.emailDeRecuperacao.trim(), codigo });
      irPara('novaSenha');
    } catch (falha) {
      setErros({ codigo: 'Código inválido ou expirado.' });
      relatar(falha, 'Código inválido ou expirado.');
    }
  }, [campos.codigo, campos.emailDeRecuperacao, irPara, relatar, validarCodigo]);

  const submeterNovaSenha = useCallback(async () => {
    const encontrados: Erros = {};
    if (campos.novaSenha.length < TAMANHO_MINIMO_DA_SENHA) {
      encontrados.novaSenha = `A nova senha precisa de ao menos ${TAMANHO_MINIMO_DA_SENHA} caracteres.`;
    } else if (campos.novaSenha !== campos.confirmacao) {
      encontrados.confirmacao = 'A confirmação não confere com a nova senha.';
    }
    contexto.decisao('acesso.senha_valida', Object.keys(encontrados).length === 0);
    if (Object.keys(encontrados).length > 0) {
      setErros(encontrados);
      return;
    }

    try {
      await redefinirSenha.mutateAsync({
        email: campos.emailDeRecuperacao.trim(),
        codigo: campos.codigo.trim(),
        novaSenha: campos.novaSenha,
      });
      setCampos((atuais) => ({
        ...CAMPOS_VAZIOS,
        email: atuais.emailDeRecuperacao.trim(),
      }));
      setPasso('entrada');
      setErros({});
      setAviso('Senha redefinida. Entre com a nova senha.');
    } catch (falha) {
      relatar(falha, 'Não foi possível redefinir a senha.');
    }
  }, [
    campos.codigo,
    campos.confirmacao,
    campos.emailDeRecuperacao,
    campos.novaSenha,
    redefinirSenha,
    relatar,
  ]);

  const enviando = useMemo(
    () =>
      entrar.isPending ||
      solicitarCodigo.isPending ||
      validarCodigo.isPending ||
      redefinirSenha.isPending,
    [
      entrar.isPending,
      redefinirSenha.isPending,
      solicitarCodigo.isPending,
      validarCodigo.isPending,
    ],
  );

  return {
    passo,
    campos,
    erros,
    aviso,
    enviando,
    preencher,
    voltarParaEntrada: useCallback(() => irPara('entrada'), [irPara]),
    irParaRecuperacao,
    submeterEntrada,
    submeterEmail,
    submeterCodigo,
    submeterNovaSenha,
    reenviarCodigo,
  };
}
