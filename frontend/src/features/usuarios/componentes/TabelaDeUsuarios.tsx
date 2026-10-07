import { Botao } from '@/design-system/primitivos/Botao';
import { Esqueleto } from '@/design-system/primitivos/Esqueleto';
import { Texto } from '@/design-system/primitivos/Texto';

import type { UsuarioResponse } from '../api/useUsuarios';

import {
  iniciais,
  ROTULO_DA_SITUACAO,
  ROTULO_DO_PAPEL,
  ultimoAcessoCompleto,
  ultimoAcessoCurto,
} from './rotulos';
import estilos from './TabelaDeUsuarios.module.css';

/** O que cada linha oferece. Quem executa e anuncia o resultado é a página. */
export interface AcoesDaLinha {
  aoReenviar: (usuario: UsuarioResponse) => void;
  aoDesativar: (usuario: UsuarioResponse) => void;
  aoReativar: (usuario: UsuarioResponse) => void;
  reenviando: (id: number) => boolean;
  reativando: (id: number) => boolean;
}

interface TabelaDeUsuariosProps {
  itens: UsuarioResponse[];
  carregando: boolean;
  erro: boolean;
  emailDaSessao: string | undefined;
  aoTentarDeNovo: () => void;
  acoes: AcoesDaLinha;
}

const LINHAS_DO_ESQUELETO = 4;

/**
 * A grade de usuários.
 *
 * <p>É `<table role="table">` de verdade, com a régua aplicada por `display: grid` em cada linha: as trilhas
 * ficam alinhadas como numa grade CSS, e cabeçalho, associação célula–coluna e navegação por
 * leitor de tela continuam vindo da semântica da tabela.
 *
 * <p>Fora do estado "dados" a grade é suprimida por inteiro — nunca fica um aviso por cima de uma
 * tabela antiga, que é como se lê um dado velho achando que é novo.
 */
export function TabelaDeUsuarios({
  itens,
  carregando,
  erro,
  emailDaSessao,
  aoTentarDeNovo,
  acoes,
}: TabelaDeUsuariosProps) {
  if (erro) {
    return (
      <div className={estilos.recado} role="alert">
        <Texto variante="corpo" como="p">
          Não foi possível carregar os usuários.
        </Texto>
        <Texto variante="apoio" tom="suave" como="p">
          A conexão com o servidor falhou. Nada foi alterado.
        </Texto>
        <Botao variante="secundario" tamanho="pequeno" aoClicar={aoTentarDeNovo}>
          Tentar de novo
        </Botao>
      </div>
    );
  }

  if (carregando) {
    return (
      <>
        <div role="status" className={estilos.apenasLeitor}>
          Carregando usuários…
        </div>
        <table role="table" className={estilos.grade}>
          <Cabecalho />
          <tbody role="rowgroup" className={estilos.corpo}>
            {Array.from({ length: LINHAS_DO_ESQUELETO }, (_, indice) => (
              <tr role="row" className={estilos.linha} key={indice} aria-hidden="true">
                <td role="cell" className={estilos.celula}>
                  <Esqueleto />
                </td>
                <td role="cell" className={estilos.celula}>
                  <Esqueleto />
                </td>
                <td role="cell" className={estilos.celula}>
                  <Esqueleto />
                </td>
                <td role="cell" className={estilos.celula}>
                  <Esqueleto />
                </td>
                <td role="cell" className={estilos.celula} />
              </tr>
            ))}
          </tbody>
        </table>
      </>
    );
  }

  if (itens.length === 0) {
    return (
      <div className={estilos.recado}>
        <Texto variante="corpo" como="p">
          Nenhum usuário encontrado
        </Texto>
        <Texto variante="apoio" tom="suave" como="p">
          Ajuste a busca ou os filtros de papel e situação.
        </Texto>
      </div>
    );
  }

  return (
    <table role="table" className={estilos.grade}>
      <Cabecalho />
      <tbody role="rowgroup" className={estilos.corpo}>
        {itens.map((usuario) => {
          const id = Number(usuario.id);
          const ehVoce = usuario.email !== undefined && usuario.email === emailDaSessao;
          const pendente = usuario.situacao === 'PENDENTE';
          const inativo = usuario.situacao === 'INATIVO';
          const rotulo = usuario.situacao ? ROTULO_DA_SITUACAO[usuario.situacao] : undefined;

          return (
            <tr role="row" className={estilos.linha} key={id}>
              <td role="cell" className={estilos.celula}>
                <div className={estilos.pessoa}>
                  <span className={estilos.avatar} aria-hidden="true">
                    {iniciais(usuario.nome)}
                  </span>
                  <span className={estilos.nomes}>
                    <span className={estilos.nome}>
                      <span className={estilos.trunca}>{usuario.nome}</span>
                      {ehVoce ? <span className={estilos.voce}>você</span> : null}
                    </span>
                    <span className={estilos.email} title={usuario.email}>
                      {usuario.email}
                    </span>
                  </span>
                </div>
              </td>

              <td role="cell" className={estilos.celula}>
                <span className={estilos.papel}>
                  {usuario.papel ? ROTULO_DO_PAPEL[usuario.papel] : ''}
                </span>
              </td>

              <td role="cell" className={estilos.celula}>
                {/* ATIVO não vira etiqueta: só a exceção precisa de rótulo. */}
                <span className={pendente ? estilos.situacaoAtencao : estilos.situacao}>
                  {rotulo ?? ''}
                </span>
              </td>

              <td role="cell" className={estilos.celula}>
                <span className={estilos.acesso} title={ultimoAcessoCompleto(usuario.ultimoAcesso)}>
                  {ultimoAcessoCurto(usuario.ultimoAcesso)}
                </span>
              </td>

              <td role="cell" className={estilos.celula}>
                <span className={estilos.acoes}>
                  {pendente ? (
                    <Botao
                      variante="fantasma"
                      tamanho="pequeno"
                      carregando={acoes.reenviando(id)}
                      rotuloAcessivel={`Reenviar convite para ${usuario.nome ?? ''}`}
                      aoClicar={() => acoes.aoReenviar(usuario)}
                    >
                      Reenviar
                    </Botao>
                  ) : null}
                  {/* Ninguém mexe no próprio acesso: o servidor recusa com 409, e a tela não
                      oferece o que seria recusado. Ver docs/adr/0015-papel-do-usuario-e-convite.md. */}
                  {ehVoce ? null : (
                    <Botao
                      variante="fantasma"
                      tamanho="pequeno"
                      tom={inativo ? 'padrao' : 'critico'}
                      carregando={inativo && acoes.reativando(id)}
                      rotuloAcessivel={`${inativo ? 'Reativar' : 'Desativar'} ${usuario.nome ?? ''}`}
                      aoClicar={() =>
                        inativo ? acoes.aoReativar(usuario) : acoes.aoDesativar(usuario)
                      }
                    >
                      {inativo ? 'Reativar' : 'Desativar'}
                    </Botao>
                  )}
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function Cabecalho() {
  return (
    <thead role="rowgroup" className={estilos.corpo}>
      <tr role="row" className={estilos.cabecalho}>
        <th role="columnheader" scope="col">
          Usuário · e-mail
        </th>
        <th role="columnheader" scope="col">
          Papel
        </th>
        <th role="columnheader" scope="col">
          Situação
        </th>
        <th role="columnheader" scope="col">
          Último acesso
        </th>
        {/* A coluna de ação não mostra rótulo, mas precisa de nome acessível. */}
        <th role="columnheader" scope="col" className={estilos.apenasLeitor}>
          Ações
        </th>
      </tr>
    </thead>
  );
}
