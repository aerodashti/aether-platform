import { useId, useRef, type ChangeEvent } from 'react';

import { juntarClasses } from '@/design-system/classes';

import estilos from './SeletorDeArquivos.module.css';

interface SeletorDeArquivosProps {
  rotulo: string;
  aoEscolher: (arquivos: File[]) => void;
  multiplo?: boolean;
  /** O `accept` do input: extensões ou tipos que a janela do sistema oferece primeiro. */
  aceita?: string;
  /** Inerte e anunciado como ocupado, durante o envio. */
  carregando?: boolean;
  /** `id` do texto com os tipos e o tamanho aceitos, para o leitor de tela ouvir antes de escolher. */
  descritoPor?: string;
}

/**
 * O botão que abre a janela de arquivos do sistema — o "+ Adicionar documentos" do protótipo.
 *
 * <p>É um `<input type="file">` de verdade, escondido só visualmente dentro do rótulo: teclado,
 * leitor de tela e arrastar para o botão vêm do navegador. Depois de cada escolha o valor é
 * limpo, para que escolher o mesmo arquivo de novo (depois de um erro) dispare outra vez.
 */
export function SeletorDeArquivos({
  rotulo,
  aoEscolher,
  multiplo = false,
  aceita,
  carregando = false,
  descritoPor,
}: SeletorDeArquivosProps) {
  const id = useId();
  const entrada = useRef<HTMLInputElement>(null);

  function aoMudar(evento: ChangeEvent<HTMLInputElement>) {
    const escolhidos = Array.from(evento.target.files ?? []);
    if (entrada.current) {
      entrada.current.value = '';
    }
    if (escolhidos.length > 0) {
      aoEscolher(escolhidos);
    }
  }

  return (
    <label htmlFor={id} className={juntarClasses(estilos.botao, carregando && estilos.carregando)}>
      {/* Inerte sem `disabled` durante o envio: desabilitar o campo focado manda o foco para o
          `<body>`, e quem usa teclado perde o lugar no meio do envio. */}
      <input
        ref={entrada}
        id={id}
        type="file"
        className={estilos.entrada}
        multiple={multiplo}
        accept={aceita}
        aria-disabled={carregando || undefined}
        aria-busy={carregando || undefined}
        aria-describedby={descritoPor}
        onClick={(evento) => {
          if (carregando) {
            evento.preventDefault();
          }
        }}
        onChange={aoMudar}
      />
      {rotulo}
    </label>
  );
}
