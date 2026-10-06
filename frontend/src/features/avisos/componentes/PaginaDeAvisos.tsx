import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  useAvisos,
  useMarcarLeitura,
  type CategoriaDoAviso,
} from '@/compartilhado/avisos/useAvisos';
import { juntarClasses } from '@/design-system/classes';
import { Abas } from '@/design-system/primitivos/Abas';
import { Botao } from '@/design-system/primitivos/Botao';
import { Esqueleto } from '@/design-system/primitivos/Esqueleto';
import { Texto } from '@/design-system/primitivos/Texto';

import estilos from './PaginaDeAvisos.module.css';
import { CATEGORIAS, dataEmTexto } from './rotulos';

type Filtro = CategoriaDoAviso | 'TODOS';

/**
 * A Central de avisos do protótipo: os indicadores, os chips por categoria com a contagem e a
 * lista do mais urgente ao menos. Cada aviso diz o que é, em que aeronave e até quando, e leva à
 * tela onde se resolve.
 *
 * <p>O "Notificar responsáveis" do protótipo não está aqui: enviar e-mail a proprietários é uma
 * feature própria, com quem recebe e quando — ver docs/design-system.md.
 */
export function PaginaDeAvisos() {
  const consulta = useAvisos();
  const marcar = useMarcarLeitura();
  const navegar = useNavigate();
  const [filtro, setFiltro] = useState<Filtro>('TODOS');

  const avisos = consulta.data?.avisos ?? [];
  const indicadores = consulta.data?.indicadores;
  const visiveis =
    filtro === 'TODOS' ? avisos : avisos.filter((aviso) => aviso.categoria === filtro);
  const naoLidos = avisos.filter((aviso) => !aviso.lido).map((aviso) => aviso.chave ?? '');
  const categorias = (Object.keys(CATEGORIAS) as CategoriaDoAviso[]).map((categoria) => ({
    valor: categoria,
    rotulo: CATEGORIAS[categoria],
    contagem: avisos.filter((aviso) => aviso.categoria === categoria).length,
  }));

  if (consulta.isError) {
    return (
      <div className={estilos.recado} role="alert">
        <Texto variante="corpo" como="p">
          Não foi possível carregar os avisos.
        </Texto>
        <Botao variante="secundario" tamanho="pequeno" aoClicar={() => void consulta.refetch()}>
          Tentar de novo
        </Botao>
      </div>
    );
  }

  return (
    <div className={estilos.tela}>
      <div className={estilos.cabecalho}>
        <Texto variante="corpo" tom="suave" como="p">
          {indicadores
            ? `${indicadores.ativos} ${indicadores.ativos === 1 ? 'aviso ativo' : 'avisos ativos'} · ${indicadores.naoLidos} não ${indicadores.naoLidos === 1 ? 'lido' : 'lidos'}`
            : 'Carregando os avisos…'}
        </Texto>
        <Botao
          variante="secundario"
          desabilitado={naoLidos.length === 0}
          carregando={marcar.isPending}
          aoClicar={() => marcar.mutate({ chaves: naoLidos, lido: true })}
        >
          Marcar todos como lidos
        </Botao>
      </div>

      <dl className={estilos.indicadores} role="group" aria-label="Indicadores dos avisos">
        {[
          ['Avisos ativos', indicadores?.ativos, `${indicadores?.naoLidos ?? 0} não lidos`],
          ['Vencidos', indicadores?.vencidos, 'exigem ação imediata'],
          ['Próximos do limite', indicadores?.proximos, 'dentro da janela de aviso'],
          ['Aeronaves envolvidas', indicadores?.aeronavesEnvolvidas, 'com ao menos um aviso'],
        ].map(([rotulo, valor, apoio]) => (
          <div className={estilos.indicador} key={String(rotulo)}>
            <dt className={estilos.indicadorRotulo}>{rotulo}</dt>
            <dd className={estilos.indicadorValor}>{valor ?? '—'}</dd>
            <dd className={estilos.indicadorApoio}>{apoio}</dd>
          </div>
        ))}
      </dl>

      <Abas<Filtro>
        rotulo="Categorias de aviso"
        valor={filtro}
        aoEscolher={setFiltro}
        abas={[{ valor: 'TODOS', rotulo: 'Todos', contagem: avisos.length }, ...categorias]}
      />

      {consulta.isPending ? (
        <div className={estilos.recado} role="status">
          <Esqueleto />
          <span className={estilos.apenasLeitor}>Carregando os avisos…</span>
        </div>
      ) : visiveis.length === 0 ? (
        <div className={estilos.recado}>
          <Texto variante="corpo" como="p">
            {filtro === 'TODOS'
              ? 'Nenhum aviso ativo — seguros, manutenção, tripulação e fundos estão em dia.'
              : 'Nenhum aviso nesta categoria — tudo em dia.'}
          </Texto>
        </div>
      ) : (
        <ul className={estilos.lista} aria-label="Avisos">
          {visiveis.map((aviso) => {
            const vencido = aviso.gravidade === 'VENCIDO';
            return (
              <li
                key={aviso.chave}
                className={juntarClasses(
                  estilos.aviso,
                  vencido ? estilos.vencido : estilos.proximo,
                  aviso.lido && estilos.lido,
                )}
              >
                <div className={estilos.oQue}>
                  <div className={estilos.titulo}>
                    <span className={estilos.tituloTexto}>{aviso.titulo}</span>
                    <span className={estilos.categoria}>
                      {CATEGORIAS[aviso.categoria ?? 'DOCUMENTOS']}
                    </span>
                  </div>
                  <span className={estilos.detalhe}>{aviso.detalhe}</span>
                </div>
                <div className={estilos.onde}>
                  <span className={estilos.matricula}>{aviso.matricula}</span>
                  <span className={estilos.detalhe}>{aviso.modelo}</span>
                  {aviso.prazo ? (
                    <span className={estilos.prazo}>{dataEmTexto(aviso.prazo)}</span>
                  ) : null}
                </div>
                <span
                  className={juntarClasses(
                    estilos.situacao,
                    aviso.lido
                      ? estilos.situacaoLida
                      : vencido
                        ? estilos.situacaoVencida
                        : estilos.situacaoProxima,
                  )}
                >
                  {aviso.lido ? 'Lido' : vencido ? 'Vencido' : 'Próximo'}
                </span>
                <div className={estilos.acoes}>
                  <Botao
                    variante="secundario"
                    tamanho="pequeno"
                    rotuloAcessivel={`${aviso.lido ? 'Marcar como não lido' : 'Marcar como lido'}: ${aviso.titulo ?? ''}`}
                    aoClicar={() =>
                      marcar.mutate({ chaves: [aviso.chave ?? ''], lido: !aviso.lido })
                    }
                  >
                    {aviso.lido ? 'Marcar como não lido' : 'Marcar como lido'}
                  </Botao>
                  <Botao
                    tamanho="pequeno"
                    rotuloAcessivel={`Abrir: ${aviso.titulo ?? ''}`}
                    aoClicar={() => void navegar(aviso.destino ?? '/')}
                  >
                    Abrir
                  </Botao>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
