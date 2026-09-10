import { Botao } from '@/design-system/primitivos/Botao';
import { Esqueleto } from '@/design-system/primitivos/Esqueleto';
import { PontoDeCor, type CorDeIdentificacao } from '@/design-system/primitivos/SeletorDeCor';
import { Texto } from '@/design-system/primitivos/Texto';

import {
  useDesativarProprietario,
  useReativarProprietario,
  type ProprietarioResponse,
} from '../api/useProprietarios';

import { formatarCpfCnpj, linhaDeContato } from './rotulos';
import estilos from './TabelaDeProprietarios.module.css';

interface TabelaDeProprietariosProps {
  itens: ProprietarioResponse[];
  carregando: boolean;
  erro: boolean;
  /** Escrita é de administrador e gestor; para os demais a grade é só leitura. */
  podeGerir: boolean;
  aoEditar: (proprietario: ProprietarioResponse) => void;
  aoTentarDeNovo: () => void;
}

const LINHAS_DO_ESQUELETO = 4;

/**
 * A grade de proprietários, na mesma mecânica da de usuários: `<table>` de verdade com a régua da
 * armadura aplicada por grid em cada linha, e a grade suprimida por inteiro fora do estado
 * "dados".
 *
 * <p>As colunas de aeronave, participação e saldo do protótipo não estão aqui: pertencem ao
 * contrato de participação e ao rateio, e **coluna vazia não existe** — cada uma entra com a
 * feature dona do seu número, como na tela de Aeronaves.
 */
export function TabelaDeProprietarios({
  itens,
  carregando,
  erro,
  podeGerir,
  aoEditar,
  aoTentarDeNovo,
}: TabelaDeProprietariosProps) {
  const desativar = useDesativarProprietario();
  const reativar = useReativarProprietario();

  if (erro) {
    return (
      <div className={estilos.recado} role="alert">
        <Texto variante="corpo" como="p">
          Não foi possível carregar os proprietários.
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
          Carregando proprietários…
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
          Nenhum proprietário encontrado
        </Texto>
        <Texto variante="apoio" tom="suave" como="p">
          Limpe a busca ou volte o filtro de situação para "Todas".
        </Texto>
      </div>
    );
  }

  return (
    <table className={estilos.grade}>
      <Cabecalho />
      <tbody className={estilos.corpo}>
        {itens.map((proprietario) => {
          const id = proprietario.id ?? 0;
          const inativo = proprietario.situacao === 'INATIVO';
          const contato = linhaDeContato(proprietario.email, proprietario.telefone);

          return (
            <tr className={estilos.linha} key={id}>
              <td className={estilos.celula}>
                <span className={estilos.pessoa}>
                  <PontoDeCor
                    cor={(proprietario.corDeIdentificacao ?? 'CINZA') as CorDeIdentificacao}
                  />
                  <span className={estilos.nomes}>
                    <span className={estilos.nome}>
                      <span className={estilos.trunca}>{proprietario.nome}</span>
                    </span>
                    {contato ? <span className={estilos.contato}>{contato}</span> : null}
                  </span>
                </span>
              </td>

              <td className={estilos.celula}>
                <span className={estilos.documento}>{formatarCpfCnpj(proprietario.cpfCnpj)}</span>
              </td>

              <td className={estilos.celula}>
                {/* O normal não precisa de rótulo, só a exceção precisa. */}
                <span className={inativo ? estilos.situacao : undefined}>
                  {inativo ? 'Inativo' : ''}
                </span>
              </td>

              <td className={estilos.celula}>
                {podeGerir ? (
                  <span className={estilos.acoes}>
                    <Botao
                      variante="fantasma"
                      tamanho="pequeno"
                      aoClicar={() => aoEditar(proprietario)}
                    >
                      Editar
                    </Botao>
                    <Botao
                      variante="fantasma"
                      tamanho="pequeno"
                      tom={inativo ? 'padrao' : 'critico'}
                      carregando={desativar.isPending || reativar.isPending}
                      aoClicar={() => (inativo ? reativar.mutate(id) : desativar.mutate(id))}
                    >
                      {inativo ? 'Reativar' : 'Desativar'}
                    </Botao>
                  </span>
                ) : null}
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
        <th scope="col">Proprietário · contato</th>
        <th scope="col">CPF / CNPJ</th>
        <th scope="col">Situação</th>
        <th scope="col" className={estilos.apenasLeitor}>
          Ações
        </th>
      </tr>
    </thead>
  );
}
