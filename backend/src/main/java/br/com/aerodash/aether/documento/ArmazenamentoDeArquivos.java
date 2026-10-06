package br.com.aerodash.aether.documento;

import java.io.IOException;
import java.io.InputStream;

/**
 * Onde o conteúdo dos documentos mora. Hoje é o disco do servidor; amanhã pode ser um bucket —
 * trocar é escrever outro adaptador, sem tocar em regra nem em tela (ADR-0020).
 *
 * <p>A chave é sempre gerada pelo Aether (UUID): nome de arquivo vindo do usuário nunca vira
 * caminho.
 */
public interface ArmazenamentoDeArquivos {

  void guardar(String chave, InputStream conteudo) throws IOException;

  InputStream abrir(String chave) throws IOException;

  /** Apagar o que não existe não é erro: o objetivo — não existir — já foi atingido. */
  void apagar(String chave) throws IOException;
}
