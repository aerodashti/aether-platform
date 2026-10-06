package br.com.aerodash.aether.documento;

import java.io.InputStream;

/** O que o download precisa: o fluxo do arquivo e como apresentá-lo. */
public record ConteudoDoDocumento(
    String nome, String tipoDeConteudo, long tamanho, InputStream conteudo) {}
