import { useEffect, useState } from 'react';

import { ErroDeApi } from '@/api/cliente';
import { Botao } from '@/design-system/primitivos/Botao';
import { CampoDeTexto } from '@/design-system/primitivos/CampoDeTexto';
import { Texto } from '@/design-system/primitivos/Texto';

import { useAlterarEmpresa, type EmpresaResponse } from '../api/useConfiguracoes';

import { Cartao } from './Cartao';
import estilos from './CartaoDaEmpresa.module.css';
import { formatarCnpj } from './rotulos';

/**
 * Os dados da conta.
 *
 * <p>O CNPJ aparece bloqueado, e não ausente: quem administra precisa conferir que está na conta
 * certa. Ele é o documento do contrato — trocá-lo é trocar de empresa, não editar um campo.
 */
export function CartaoDaEmpresa({ empresa }: { empresa: EmpresaResponse }) {
  const [nomeFantasia, setNomeFantasia] = useState(empresa.nomeFantasia ?? '');
  const [razaoSocial, setRazaoSocial] = useState(empresa.razaoSocial ?? '');
  const [email, setEmail] = useState(empresa.email ?? '');
  const [telefone, setTelefone] = useState(empresa.telefone ?? '');
  const alterar = useAlterarEmpresa();

  // Quem manda no formulário é o servidor: se a resposta trouxer outro valor — porque outra
  // pessoa salvou, ou porque o backend normalizou algo —, os campos acompanham.
  useEffect(() => {
    setNomeFantasia(empresa.nomeFantasia ?? '');
    setRazaoSocial(empresa.razaoSocial ?? '');
    setEmail(empresa.email ?? '');
    setTelefone(empresa.telefone ?? '');
  }, [empresa]);

  const erro = alterar.error instanceof ErroDeApi ? alterar.error.message : undefined;
  const completo = [nomeFantasia, razaoSocial, email, telefone].every(
    (campo) => campo.trim().length > 0,
  );

  return (
    <Cartao titulo="Dados da empresa">
      <CampoDeTexto
        rotulo="Nome fantasia"
        valor={nomeFantasia}
        aoMudar={setNomeFantasia}
        maxLength={120}
      />
      <CampoDeTexto
        rotulo="Razão social"
        valor={razaoSocial}
        aoMudar={setRazaoSocial}
        maxLength={180}
      />

      <div>
        <Texto variante="apoio" tom="suave" como="p">
          CNPJ (somente leitura)
        </Texto>
        <div className={estilos.bloqueado}>
          <span className={estilos.documento}>{formatarCnpj(empresa.cnpj)}</span>
          <span className={estilos.selo}>BLOQUEADO</span>
        </div>
      </div>

      <div className={estilos.par}>
        <CampoDeTexto
          rotulo="E-mail"
          valor={email}
          aoMudar={setEmail}
          tipo="email"
          inputMode="email"
          maxLength={180}
          erro={erro}
        />
        <CampoDeTexto rotulo="Telefone" valor={telefone} aoMudar={setTelefone} maxLength={20} />
      </div>

      <div className={estilos.acao}>
        <Botao
          aoClicar={() => alterar.mutate({ nomeFantasia, razaoSocial, email, telefone })}
          desabilitado={!completo}
          carregando={alterar.isPending}
        >
          Salvar alterações
        </Botao>
        {alterar.isSuccess ? (
          <Texto variante="apoio" tom="positivo" como="span">
            Dados salvos.
          </Texto>
        ) : null}
      </div>
    </Cartao>
  );
}
