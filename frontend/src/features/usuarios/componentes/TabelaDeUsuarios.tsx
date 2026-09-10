import { Botao } from '@/design-system/primitivos/Botao';
import { Esqueleto } from '@/design-system/primitivos/Esqueleto';
import { Texto } from '@/design-system/primitivos/Texto';

import {
  useDesativarUsuario,
  useReativarUsuario,
  useReenviarConvite,
  type UsuarioResponse,
} from '../api/useUsuarios';

import {
  iniciais,
  ROTULO_DA_SITUACAO,
  ROTULO_DO_PAPEL,
  ultimoAcessoCompleto,
  ultimoAcessoCurto,
} from './rotulos';
import estilos from './TabelaDeUsuarios.module.css';

interface TabelaDeUsuariosProps {
  itens: UsuarioResponse[];
  carregando: boolean;
  erro: boolean;
  emailDaSessao: string | undefined;
  aoTentarDeNovo: () => void;
}

const LINHAS_DO_ESQUELETO = 4;

/**
 * A grade de usuários.
 *
 * <p>É `<table>` de verdade, com a régua aplicada por `display: grid` em cada linha: as trilhas
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
}: TabelaDeUsuariosProps) {
  const reenviar = useReenviarConvite();
  const desativar = useDesativarUsuario();
  const reativar = useReativarUsuario();

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
        <table className={estilos.grade}>
          <Cabecalho />
          <tbody className={estilos.corpo}>
            {Array.from({ length: LINHAS_DO_ESQUELETO }, (_, indice) => (
              <tr className={estilos.linha} key={indice} aria-hidden="true">
                <td className={estilos.celula}>
                  <Esqueleto />
                </td>
                <td className={estilos.celula}>
                  <Esqueleto />
                </td>
                <td className={estilos.celula}>
                  <Esqueleto />
                </td>
                <td className={estilos.celula}>
                  <Esqueleto />
                </td>
                <td className={estilos.celula} />
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
    <table className={estilos.grade}>
      <Cabecalho />
      <tbody className={estilos.corpo}>
        {itens.map((usuario) => {
          const id = Number(usuario.id);
          const ehVoce = usuario.email !== undefined && usuario.email === emailDaSessao;
          const pendente = usuario.situacao === 'PENDENTE';
          const inativo = usuario.situacao === 'INATIVO';
          const rotulo = usuario.situacao ? ROTULO_DA_SITUACAO[usuario.situacao] : undefined;

          return (
            <tr className={estilos.linha} key={id}>
              <td className={estilos.celula}>
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

              <td className={estilos.celula}>
                <span className={estilos.papel}>
                  {usuario.papel ? ROTULO_DO_PAPEL[usuario.papel] : ''}
                </span>
              </td>

              <td className={estilos.celula}>
                {/* ATIVO não vira etiqueta: só a exceção precisa de rótulo. */}
                <span className={pendente ? estilos.situacaoAtencao : estilos.situacao}>
                  {rotulo ?? ''}
                </span>
              </td>

              <td className={estilos.celula}>
                <span className={estilos.acesso} title={ultimoAcessoCompleto(usuario.ultimoAcesso)}>
                  {ultimoAcessoCurto(usuario.ultimoAcesso)}
                </span>
              </td>

              <td className={estilos.celula}>
                <span className={estilos.acoes}>
                  {pendente ? (
                    <Botao
                      variante="fantasma"
                      tamanho="pequeno"
                      carregando={reenviar.isPending}
                      aoClicar={() => reenviar.mutate(id)}
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
                      carregando={desativar.isPending || reativar.isPending}
                      aoClicar={() => (inativo ? reativar.mutate(id) : desativar.mutate(id))}
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
    <thead className={estilos.corpo}>
      <tr className={estilos.cabecalho}>
        <th scope="col">Usuário · e-mail</th>
        <th scope="col">Papel</th>
        <th scope="col">Situação</th>
        <th scope="col">Último acesso</th>
        {/* A coluna de ação não mostra rótulo, mas precisa de nome acessível. */}
        <th scope="col" className={estilos.apenasLeitor}>
          Ações
        </th>
      </tr>
    </thead>
  );
}
