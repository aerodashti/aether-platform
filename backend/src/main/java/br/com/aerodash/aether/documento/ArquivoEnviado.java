package br.com.aerodash.aether.documento;

import java.io.IOException;
import java.io.InputStream;

/** Um arquivo como chegou no envio, sem amarrar o service ao tipo do Spring Web. */
public record ArquivoEnviado(String nome, long tamanho, Conteudo conteudo) {

  /** O fluxo é aberto só na hora de gravar, e por quem grava. */
  @FunctionalInterface
  public interface Conteudo {
    InputStream abrir() throws IOException;
  }
}
