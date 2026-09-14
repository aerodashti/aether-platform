import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAeronaves } from '@/compartilhado/aeronaves/useAeronaves';
import { juntarClasses } from '@/design-system/classes';
import { Botao } from '@/design-system/primitivos/Botao';
import { Selecao } from '@/design-system/primitivos/Selecao';
import { PontoDeCor, type CorDeIdentificacao } from '@/design-system/primitivos/SeletorDeCor';
import { Texto } from '@/design-system/primitivos/Texto';

import { useCalendario } from '../api/useCalendario';

import estilos from './PaginaDeCalendario.module.css';
import {
  competenciaAtual,
  DIAS_DA_SEMANA,
  semanasDaCompetencia,
  somarMeses,
  tituloDaCompetencia,
} from './rotulos';

/**
 * O mês de uma aeronave: trechos pintados com a cor do proprietário e manutenções programadas.
 *
 * <p>É uma visualização, não um editor: clicar num trecho abre o diário — a tela dona da edição —
 * já no recorte certo. O protótipo edita aqui; a adaptação está em `docs/design-system.md`.
 */
export function PaginaDeCalendario() {
  const aeronaves = useAeronaves();
  const primeira = aeronaves.data?.[0]?.id;
  const [escolhida, setEscolhida] = useState('');
  const [competencia, setCompetencia] = useState(competenciaAtual());
  const navegar = useNavigate();

  const aeronaveId = escolhida || (primeira != null ? String(primeira) : '');
  const calendario = useCalendario(aeronaveId, competencia);

  const hoje = new Date().toISOString().slice(0, 10);
  const semanas = semanasDaCompetencia(competencia);

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
          aoMudar={setEscolhida}
        />
        <div className={estilos.navegacaoDoMes}>
          <Botao
            variante="fantasma"
            tamanho="pequeno"
            rotuloAcessivel="Mês anterior"
            aoClicar={() => setCompetencia((atual) => somarMeses(atual, -1))}
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
            aoClicar={() => setCompetencia((atual) => somarMeses(atual, 1))}
          >
            →
          </Botao>
        </div>
        <Texto variante="apoio" tom="suave" como="p">
          Clique num trecho para abrir o diário; manutenções programadas aparecem com ⚑.
        </Texto>
      </div>

      {calendario.isError ? (
        <div className={estilos.recado} role="alert">
          <Texto variante="corpo" como="p">
            Não foi possível carregar o calendário.
          </Texto>
          <Botao variante="secundario" tamanho="pequeno" aoClicar={() => void calendario.refetch()}>
            Tentar de novo
          </Botao>
        </div>
      ) : (
        <div className={estilos.painel}>
          <div className={estilos.semana} aria-hidden="true">
            {DIAS_DA_SEMANA.map((dia) => (
              <span key={dia} className={estilos.diaDaSemana}>
                {dia}
              </span>
            ))}
          </div>
          {semanas.map((semana) => (
            <div key={semana[0]?.iso} className={estilos.semana}>
              {semana.map((dia) => {
                const trechos = calendario.trechosPorDia.get(dia.iso) ?? [];
                const manutencoes = calendario.manutencoesPorDia.get(dia.iso) ?? [];
                return (
                  <div
                    key={dia.iso}
                    className={juntarClasses(
                      estilos.dia,
                      !dia.doMes && estilos.foraDoMes,
                      dia.iso === hoje && estilos.hoje,
                    )}
                  >
                    <span className={estilos.numeroDoDia}>{dia.dia}</span>
                    {trechos.map((trecho) => (
                      <Botao
                        key={trecho.id}
                        variante="fantasma"
                        tamanho="pequeno"
                        rotuloAcessivel={`Abrir o diário no trecho ${trecho.relatorioDeVoo}`}
                        aoClicar={() => void navegar('/voos')}
                      >
                        <span className={estilos.trecho}>
                          <PontoDeCor
                            cor={(trecho.corDeIdentificacao ?? 'CINZA') as CorDeIdentificacao}
                          />
                          <span className={estilos.trechoTexto}>
                            {trecho.origem}→{trecho.destino}
                          </span>
                        </span>
                      </Botao>
                    ))}
                    {manutencoes.map((manutencao) => (
                      <span key={manutencao.id} className={estilos.manutencao}>
                        <span aria-hidden="true">⚑</span>
                        <span className={estilos.trechoTexto} title={manutencao.descricao}>
                          {manutencao.descricao}
                        </span>
                      </span>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
