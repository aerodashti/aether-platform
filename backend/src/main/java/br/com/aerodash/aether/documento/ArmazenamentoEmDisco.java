package br.com.aerodash.aether.documento;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.regex.Pattern;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Os arquivos num diretório do servidor, um por chave, sem subpastas. A chave é validada como UUID
 * antes de virar caminho: nada de {@code ../} chegando ao disco, nem por engano.
 */
@Component
@EnableConfigurationProperties(PropriedadesDeDocumentos.class)
public class ArmazenamentoEmDisco implements ArmazenamentoDeArquivos {

  private static final Pattern CHAVE =
      Pattern.compile("[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}");

  private final Path diretorio;

  public ArmazenamentoEmDisco(PropriedadesDeDocumentos propriedades) throws IOException {
    this.diretorio = Path.of(propriedades.diretorio()).toAbsolutePath().normalize();
    Files.createDirectories(diretorio);
  }

  @Override
  public void guardar(String chave, InputStream conteudo) throws IOException {
    // Grava ao lado e move: um envio interrompido nunca deixa meio arquivo com a chave final.
    Path temporario = Files.createTempFile(diretorio, ".envio-", ".tmp");
    try {
      Files.copy(conteudo, temporario, StandardCopyOption.REPLACE_EXISTING);
      Files.move(temporario, caminho(chave), StandardCopyOption.ATOMIC_MOVE);
    } finally {
      Files.deleteIfExists(temporario);
    }
  }

  @Override
  public InputStream abrir(String chave) throws IOException {
    return Files.newInputStream(caminho(chave));
  }

  @Override
  public void apagar(String chave) throws IOException {
    Files.deleteIfExists(caminho(chave));
  }

  private Path caminho(String chave) {
    if (chave == null || !CHAVE.matcher(chave).matches()) {
      throw new IllegalArgumentException("Chave de armazenamento inválida.");
    }
    return diretorio.resolve(chave);
  }
}
