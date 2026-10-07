import { useState } from 'react';

import { Formulario } from '@/compartilhado/formulario/Formulario';
import { ResumoDoFormulario } from '@/compartilhado/formulario/ResumoDoFormulario';
import { useValidacao } from '@/compartilhado/formulario/useValidacao';
import { Botao } from '@/design-system/primitivos/Botao';
import { CampoDeTexto } from '@/design-system/primitivos/CampoDeTexto';

import {
  useAlterarEmpresa,
  type AlterarEmpresaRequest,
  type EmpresaResponse,
} from '../api/useConfiguracoes';
import { useResultadoDoCartao } from '../hooks/useResultadoDoCartao';

import { Cartao } from './Cartao';
import estilos from './CartaoDaEmpresa.module.css';
import { ResultadoDoEnvio } from './ResultadoDoEnvio';
import { formatarCnpj } from './rotulos';
import {
  ROTULOS_DA_EMPRESA,
  validarDadosDaEmpresa,
  type CampoDaEmpresa,
  type RascunhoDaEmpresa,
} from './validacaoDaEmpresa';

function rascunhoDe(empresa: EmpresaResponse): RascunhoDaEmpresa {
  return {
    nomeFantasia: empresa.nomeFantasia ?? '',
    razaoSocial: empresa.razaoSocial ?? '',
    email: empresa.email ?? '',
    telefone: empresa.telefone ?? '',
  };
}

function paraEnvio(rascunho: RascunhoDaEmpresa): Required<AlterarEmpresaRequest> {
  return {
    nomeFantasia: rascunho.nomeFantasia.trim(),
    razaoSocial: rascunho.razaoSocial.trim(),
    email: rascunho.email.trim(),
    telefone: rascunho.telefone.trim(),
  };
}

function mesmosDados(a: RascunhoDaEmpresa, b: RascunhoDaEmpresa): boolean {
  return (Object.keys(a) as CampoDaEmpresa[]).every((campo) => a[campo] === b[campo]);
}

/**
 * Os dados da conta.
 *
 * <p>O CNPJ aparece bloqueado, e não ausente: quem administra precisa conferir que está na conta
 * certa. Ele é o documento do contrato — trocá-lo é trocar de empresa, não editar um campo.
 *
 * <p>O rascunho nasce dos dados da empresa e só volta a eles quando este cartão salva. Salvar a
 * antecedência, no cartão vizinho, também atualiza a empresa no cache — e não pode apagar o
 * telefone que a pessoa acabou de digitar aqui.
 */
export function CartaoDaEmpresa({ empresa }: { empresa: EmpresaResponse }) {
  const [rascunho, setRascunho] = useState(() => rascunhoDe(empresa));
  const alterar = useAlterarEmpresa();
  const validacao = useValidacao({
    erros: validarDadosDaEmpresa(rascunho),
    valores: rascunho,
    rotulos: ROTULOS_DA_EMPRESA,
    falha: alterar.error,
  });
  const { resultado, aoEditar, salvarSeMudou } = useResultadoDoCartao(alterar, 'Dados salvos.');

  function mudar(campo: CampoDaEmpresa) {
    return (valor: string) => {
      aoEditar();
      setRascunho((atual) => ({ ...atual, [campo]: valor }));
    };
  }

  function salvar() {
    const dados = paraEnvio(rascunho);
    salvarSeMudou(!mesmosDados(dados, rascunhoDe(empresa)), () =>
      alterar.mutate(dados, { onSuccess: (salva) => setRascunho(rascunhoDe(salva)) }),
    );
  }

  return (
    <Cartao titulo="Dados da empresa">
      <Formulario aoEnviar={() => validacao.enviar(salvar)} referencia={validacao.refDoFormulario}>
        <CampoDeTexto
          rotulo="Nome fantasia"
          obrigatorio
          valor={rascunho.nomeFantasia}
          aoMudar={mudar('nomeFantasia')}
          maxLength={120}
          autoComplete="organization"
          erro={validacao.erroDe('nomeFantasia')}
        />
        <CampoDeTexto
          rotulo="Razão social"
          obrigatorio
          valor={rascunho.razaoSocial}
          aoMudar={mudar('razaoSocial')}
          maxLength={180}
          autoComplete="off"
          erro={validacao.erroDe('razaoSocial')}
        />

        <div>
          <span className={estilos.rotulo}>
            CNPJ <span className={estilos.rotuloApoio}>(somente leitura)</span>
          </span>
          <div className={estilos.bloqueado}>
            <span className={estilos.documento}>{formatarCnpj(empresa.cnpj)}</span>
            <span className={estilos.selo}>BLOQUEADO</span>
          </div>
        </div>

        <div className={estilos.par}>
          <CampoDeTexto
            rotulo="E-mail"
            obrigatorio
            valor={rascunho.email}
            aoMudar={mudar('email')}
            tipo="email"
            exemplo="contato@empresa.com.br"
            maxLength={180}
            autoComplete="off"
            erro={validacao.erroDe('email')}
          />
          <CampoDeTexto
            rotulo="Telefone"
            obrigatorio
            valor={rascunho.telefone}
            aoMudar={mudar('telefone')}
            tipo="telefone"
            exemplo="+55 11 3000-0000"
            maxLength={20}
            autoComplete="off"
            erro={validacao.erroDe('telefone')}
          />
        </div>

        <div className={estilos.acao}>
          <Botao tamanho="grande" tipo="submit" carregando={alterar.isPending}>
            Salvar alterações
          </Botao>
          <ResumoDoFormulario resumo={validacao.resumo} />
          <ResultadoDoEnvio resultado={resultado} />
        </div>
      </Formulario>
    </Cartao>
  );
}
