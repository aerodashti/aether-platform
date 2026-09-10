import { juntarClasses } from '@/design-system/classes';
import { Botao } from '@/design-system/primitivos/Botao';
import { LinkDeTexto } from '@/design-system/primitivos/LinkDeTexto';
import { Texto } from '@/design-system/primitivos/Texto';

import type { AeronaveResponse } from '../api/useAeronaves';

import { dataCurta, prazoEmPalavras, ROTULO_DA_SITUACAO, ROTULO_DO_DOCUMENTO } from './rotulos';
import estilos from './TabelaDaFrota.module.css';

interface TabelaDaFrotaProps {
  itens: AeronaveResponse[];
  carregando: boolean;
  erro: boolean;
  aoTentarDeNovo: () => void;
}

const LINHAS_DO_ESQUELETO = 4;

const CLASSE_DA_SITUACAO = {
  REGULAR: estilos.regular,
  ATENCAO: estilos.atencao,
  VENCIDO: estilos.vencido,
} as const;

/**
 * A grade da frota, na armadura de trilhas: identificador, rótulo, estado e lockup.
 *
 * <p>A coluna de vencimento não está no protótipo — ela entra porque o brief proíbe estado sem
 * consequência: "Atenção" sozinho não informa, e a forma correta é dizer qual documento e quando.
 * Ela ocupa a trilha de lockup, que é exatamente a forma "grandeza + qualificador".
 */
export function TabelaDaFrota({ itens, carregando, erro, aoTentarDeNovo }: TabelaDaFrotaProps) {
  if (erro) {
    return (
      <div className={estilos.recado} role="alert">
        <div className={estilos.recadoCritico}>
          <span className={estilos.ponto} aria-hidden="true" />
          <Texto variante="corpo" como="span">
            Não foi possível carregar a frota
          </Texto>
        </div>
        <Texto variante="apoio" tom="suave" como="p">
          A consulta ao servidor falhou. Nada foi alterado.
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
          Carregando a frota…
        </div>
        <table className={estilos.grade}>
          <Cabecalho />
          <tbody className={estilos.corpo}>
            {Array.from({ length: LINHAS_DO_ESQUELETO }, (_, indice) => (
              <tr className={estilos.linha} key={indice} aria-hidden="true">
                <td className={estilos.celula}>
                  <span className={estilos.esqueleto} />
                </td>
                <td className={estilos.celula}>
                  <span className={estilos.esqueleto} />
                </td>
                <td className={estilos.celula}>
                  <span className={estilos.esqueleto} />
                </td>
                <td className={estilos.celula}>
                  <span className={estilos.esqueleto} />
                </td>
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
          Nenhuma aeronave cadastrada
        </Texto>
        <Texto variante="apoio" tom="suave" como="p">
          Cadastre a primeira aeronave para começar a lançar custos, voos e rateio.
        </Texto>
      </div>
    );
  }

  return (
    <table className={estilos.grade}>
      <Cabecalho />
      <tbody className={estilos.corpo}>
        {itens.map((aeronave) => {
          const situacao = aeronave.situacaoRegular ?? 'REGULAR';
          return (
            <tr className={estilos.linha} key={aeronave.id}>
              <td className={estilos.celula}>
                <span className={estilos.matricula}>
                  <LinkDeTexto para={`/aeronaves/${aeronave.id}`} mono>
                    {aeronave.matricula}
                  </LinkDeTexto>
                </span>
              </td>

              <td className={estilos.celula}>
                <span className={estilos.modelo} title={aeronave.modelo}>
                  {aeronave.modelo}
                </span>
              </td>

              <td className={estilos.celula}>
                <span className={juntarClasses(estilos.situacao, CLASSE_DA_SITUACAO[situacao])}>
                  {/* Dot com a cor da severidade: um dos poucos círculos permitidos. */}
                  <span className={estilos.ponto} aria-hidden="true" />
                  {ROTULO_DA_SITUACAO[situacao]}
                </span>
              </td>

              <td className={estilos.celula}>
                <span className={estilos.vencimento}>
                  <span className={estilos.data}>{dataCurta(aeronave.proximoVencimento)}</span>
                  {/* O prazo em palavras só entra quando decide algo. Numa aeronave saudável,
                      "em 241 dias" é número sem pergunta — o brief chama isso de data slop. */}
                  <span className={estilos.qualificador}>
                    {aeronave.documentoDoProximoVencimento
                      ? ROTULO_DO_DOCUMENTO[aeronave.documentoDoProximoVencimento]
                      : ''}
                    {situacao === 'REGULAR'
                      ? ''
                      : ` · ${prazoEmPalavras(aeronave.diasAteOProximoVencimento)}`}
                  </span>
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
        <th scope="col">Matrícula</th>
        <th scope="col">Modelo</th>
        {/* O protótipo escreve "Status"; o glossário proíbe o anglicismo e manda "Situação". */}
        <th scope="col">Situação</th>
        <th scope="col">Próximo vencimento</th>
      </tr>
    </thead>
  );
}
