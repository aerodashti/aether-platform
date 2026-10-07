import { Texto } from '@/design-system/primitivos/Texto';

interface ResumoDoFormularioProps {
  /** O `resumo` de `useValidacao`. Vazio, não ocupa espaço. */
  resumo: string | undefined;
  /** Para o botão de salvar apontar para cá com `descritoPor`. */
  id?: string;
}

/**
 * A frase junto dos botões que diz por que não salvou: "Revise 2 campos: Categoria, Data." ou a
 * recusa do servidor. É um `alert` sempre montado — a região viva precisa existir antes do texto
 * para o leitor de tela anunciar a mudança.
 */
export function ResumoDoFormulario({ resumo, id }: ResumoDoFormularioProps) {
  return (
    <div role="alert" id={id}>
      {resumo ? (
        <Texto variante="apoio" tom="critico" como="p">
          {resumo}
        </Texto>
      ) : null}
    </div>
  );
}
