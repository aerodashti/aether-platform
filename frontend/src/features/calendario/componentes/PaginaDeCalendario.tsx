import { useAeronaves } from '@/compartilhado/aeronaves/useAeronaves';
import {
  competenciaLocal,
  hojeLocal,
  somarMesesNaCompetencia,
} from '@/compartilhado/formatacao/datas';
import { ehCompetencia } from '@/compartilhado/recorte/competencia';
import { FalhaDaConsulta } from '@/compartilhado/recorte/FalhaDaConsulta';
import { useRecorteDaUrl } from '@/compartilhado/recorte/useRecorteDaUrl';
import { juntarClasses } from '@/design-system/classes';
import { iniciaisDe } from '@/design-system/primitivos/Avatar';
import { Botao } from '@/design-system/primitivos/Botao';
import { LinkDeTexto } from '@/design-system/primitivos/LinkDeTexto';
import { Selecao } from '@/design-system/primitivos/Selecao';
import { CLASSE_DA_COR, type CorDeIdentificacao } from '@/design-system/primitivos/SeletorDeCor';
import { Texto } from '@/design-system/primitivos/Texto';

import { useCalendario } from '../api/useCalendario';

import estilos from './PaginaDeCalendario.module.css';
import { DIAS_DA_SEMANA, semanasDaCompetencia, tituloDaCompetencia } from './rotulos';

/**
 * O mês de uma aeronave: trechos pintados com a cor do proprietário e manutenções programadas.
 *
 * <p>É uma visualização, não um editor: clicar num trecho abre o diário — a tela dona da edição —
 * já no recorte certo. O protótipo edita aqui; a adaptação está em `docs/design-system.md`.
 *
 * <p>Aeronave e mês moram na URL, como nas telas de registro: o "Abrir" de um aviso chega aqui
 * por `?aeronave=` e o recarregamento mantém o mês.
 */
export function PaginaDeCalendario() {
  const aeronaves = useAeronaves();
  const primeira = aeronaves.data?.[0]?.id;
  const recorte = useRecorteDaUrl(competenciaLocal());

  const aeronaveId = recorte.aeronaveId || (primeira != null ? String(primeira) : '');
  // Sem competência na URL, vazia (que aqui não tem sentido de "histórico") ou fora do formato
  // (um link editado à mão), o mês corrente: um "2026-13" viraria "Janeiro de 2027" sem dias.
  const competencia = ehCompetencia(recorte.competencia) ? recorte.competencia : competenciaLocal();
  const irPara = (meses: number) =>
    recorte.setCompetencia(somarMesesNaCompetencia(competencia, meses));
  const calendario = useCalendario(aeronaveId, competencia);

  const hoje = hojeLocal();
  const semanas = semanasDaCompetencia(competencia);
  const donosDoMes = [
    ...new Map(
      [...calendario.trechosPorDia.values()]
        .flat()
        .filter((trecho) => !trecho.vooDeManutencao && trecho.nomeDoProprietario)
        .map((trecho) => [
          trecho.nomeDoProprietario ?? '',
          {
            nome: trecho.nomeDoProprietario ?? '',
            cor: (trecho.corDeIdentificacao ?? 'CINZA') as CorDeIdentificacao,
          },
        ]),
    ).values(),
  ];

  return (
    <div className={estilos.tela}>
      <div className={estilos.cabecalho}>
        <Selecao
          rotulo="Aeronave"
          rotuloOculto
          valor={aeronaveId}
          opcoes={(aeronaves.data ?? []).map((aeronave) => ({
            valor: String(aeronave.id),
            rotulo: `${aeronave.matricula} — ${aeronave.modelo}`,
          }))}
          aoMudar={recorte.setAeronaveId}
          apoio={recorte.avisoDaAeronave}
        />
        <div className={estilos.navegacaoDoMes}>
          <Botao
            variante="fantasma"
            tamanho="pequeno"
            rotuloAcessivel="Mês anterior"
            aoClicar={() => irPara(-1)}
          >
            ←
          </Botao>
          <Texto variante="subtitulo" como="h2">
            {tituloDaCompetencia(competencia)}
          </Texto>
          <Botao
            variante="fantasma"
            tamanho="pequeno"
            rotuloAcessivel="Próximo mês"
            aoClicar={() => irPara(1)}
          >
            →
          </Botao>
        </div>
      </div>

      {calendario.erro ? (
        <div className={estilos.recado} role="alert">
          <FalhaDaConsulta
            falha={calendario.erro}
            generica="Não foi possível carregar o calendário."
            aoTentarDeNovo={() => void calendario.refetch()}
            aoLimpar={recorte.limpar}
          />
        </div>
      ) : (
        <div className={estilos.painel}>
          {/* A legenda do protótipo: quem voou no mês, na cor de cada um, e a manutenção. A cor é
              do cadastro de Proprietários — aqui ela só se lê. */}
          <ul className={estilos.legenda} aria-label="Legenda">
            {donosDoMes.map((dono) => (
              <li key={dono.nome} className={estilos.itemDaLegenda}>
                <span
                  className={juntarClasses(estilos.amostra, CLASSE_DA_COR[dono.cor])}
                  aria-hidden="true"
                />
                {dono.nome}
              </li>
            ))}
            <li className={estilos.itemDaLegenda}>
              <span
                className={juntarClasses(estilos.amostra, estilos.amostraManutencao)}
                aria-hidden="true"
              />
              Manutenção programada
            </li>
            <li className={estilos.dica}>Clique em um trecho para abri-lo no diário</li>
          </ul>

          <div className={estilos.semana} aria-hidden="true">
            {DIAS_DA_SEMANA.map((dia) => (
              <span key={dia} className={estilos.diaDaSemana}>
                {dia}
              </span>
            ))}
          </div>
          <div className={estilos.mes}>
            {semanas.flat().map((dia) => {
              if (!dia.doMes) {
                // Os dias do mês vizinho ficam em branco, como no protótipo: são de outra página.
                return <div key={dia.iso} className={estilos.vazio} aria-hidden="true" />;
              }
              const trechos = calendario.trechosPorDia.get(dia.iso) ?? [];
              const manutencoes = calendario.manutencoesPorDia.get(dia.iso) ?? [];
              return (
                <div
                  key={dia.iso}
                  className={juntarClasses(estilos.dia, dia.iso === hoje && estilos.hoje)}
                  aria-current={dia.iso === hoje ? 'date' : undefined}
                >
                  <span className={estilos.numeroDoDia}>{dia.dia}</span>
                  {trechos.map((trecho) => (
                    <span
                      key={trecho.id}
                      className={juntarClasses(
                        estilos.trecho,
                        CLASSE_DA_COR[(trecho.corDeIdentificacao ?? 'CINZA') as CorDeIdentificacao],
                      )}
                    >
                      <span className={estilos.iniciais} aria-hidden="true">
                        {trecho.vooDeManutencao ? 'MNT' : iniciaisDe(trecho.nomeDoProprietario)}
                      </span>
                      <LinkDeTexto
                        para={`/voos?aeronave=${aeronaveId}&competencia=${competencia}`}
                        rotuloAcessivel={`Abrir o diário no trecho ${trecho.relatorioDeVoo}`}
                      >
                        {trecho.origem}→{trecho.destino}
                      </LinkDeTexto>
                    </span>
                  ))}
                  {manutencoes.map((manutencao) => (
                    <span
                      key={manutencao.id}
                      className={estilos.manutencao}
                      title={manutencao.descricao}
                    >
                      {manutencao.descricao}
                    </span>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
