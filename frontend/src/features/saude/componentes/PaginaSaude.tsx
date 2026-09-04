import { ErroDeApi } from '@/api/cliente';
import { Botao } from '@/design-system/primitivos/Botao';
import { Texto, type TomDeTexto } from '@/design-system/primitivos/Texto';
import { useSaude, type Saude } from '@/features/saude/api/useSaude';

import estilos from './PaginaSaude.module.css';

type Situacao = NonNullable<Saude['situacaoGeral']>;

const tomDaSituacao: Record<Situacao, TomDeTexto> = {
  OPERANTE: 'positivo',
  DEGRADADO: 'atencao',
  INDISPONIVEL: 'critico',
};

const rotuloDaSituacao: Record<Situacao, string> = {
  OPERANTE: 'Operante',
  DEGRADADO: 'Degradado',
  INDISPONIVEL: 'Indisponível',
};

function mensagemDoErro(erro: unknown): string {
  if (erro instanceof ErroDeApi) {
    return erro.message;
  }
  return 'Não foi possível falar com o servidor. Verifique se o backend está no ar.';
}

/**
 * Tela de referência do bootstrap: demonstra o caminho completo de uma feature no frontend —
 * hook do Query, primitivos do design system e os três estados (carregando, erro e conteúdo).
 */
export function PaginaSaude() {
  const { data: saude, isPending, isError, error, refetch, isFetching } = useSaude();

  return (
    <section className={estilos.pagina}>
      <header className={estilos.cabecalho}>
        <Texto variante="legenda" tom="suave">
          Plataforma
        </Texto>
        <Texto variante="titulo">Saúde do Aether</Texto>
      </header>

      {isPending && <Texto tom="suave">Consultando a situação da plataforma…</Texto>}

      {isError && (
        <div role="alert" className={estilos.aviso}>
          <Texto tom="critico">{mensagemDoErro(error)}</Texto>
        </div>
      )}

      {saude && (
        <div className={estilos.resumo}>
          <Texto variante="legenda" tom="suave">
            Situação geral
          </Texto>
          <Texto
            variante="subtitulo"
            tom={saude.situacaoGeral ? tomDaSituacao[saude.situacaoGeral] : 'suave'}
          >
            {saude.situacaoGeral ? rotuloDaSituacao[saude.situacaoGeral] : 'Desconhecida'}
          </Texto>
          <Texto variante="legenda" tom="suave">
            Versão {saude.versao}
          </Texto>

          <ul className={estilos.componentes}>
            {saude.componentes?.map((componente, indice) => (
              <li key={componente.componente ?? indice} className={estilos.componente}>
                <Texto>{componente.componente}</Texto>
                <Texto
                  tom={componente.situacao ? tomDaSituacao[componente.situacao] : 'suave'}
                  como="span"
                >
                  {componente.situacao ? rotuloDaSituacao[componente.situacao] : 'Desconhecida'}
                </Texto>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Botao aoClicar={() => void refetch()} carregando={isFetching}>
        {isFetching ? 'Atualizando…' : 'Atualizar'}
      </Botao>
    </section>
  );
}
