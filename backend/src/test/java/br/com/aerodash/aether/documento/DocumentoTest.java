package br.com.aerodash.aether.documento;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

@DisplayName("Documento, TipoDeArquivo e ArmazenamentoEmDisco")
class DocumentoTest {

  @Test
  @DisplayName("o nome perde o caminho e os caracteres de controle, e o longo guarda a extensão")
  void nomeLimpo() {
    assertThat(Documento.nomeLimpo("C:\\fakepath\\Apólice RETA.pdf")).isEqualTo("Apólice RETA.pdf");
    assertThat(Documento.nomeLimpo("../../etc/passwd")).isEqualTo("passwd");
    assertThat(Documento.nomeLimpo("laudo\u0000\n.pdf")).isEqualTo("laudo.pdf");
    String longo = Documento.nomeLimpo("a".repeat(300) + ".xlsx");
    assertThat(longo).hasSize(200).endsWith(".xlsx");
  }

  @Test
  @DisplayName("o tipo vem da extensão, sem diferenciar maiúscula; HTML e sem extensão não entram")
  void tipos() {
    assertThat(TipoDeArquivo.doNome("CVA.PDF")).contains(TipoDeArquivo.PDF);
    assertThat(TipoDeArquivo.doNome("pagina.html")).isEmpty();
    assertThat(TipoDeArquivo.doNome("semextensao")).isEmpty();
    assertThat(TipoDeArquivo.doNome("termina.")).isEmpty();
  }

  @Test
  @DisplayName("o tamanho vai de 1 byte a 20 MB")
  void limite() {
    assertThat(Documento.cabeNoLimite(0)).isFalse();
    assertThat(Documento.cabeNoLimite(Documento.TAMANHO_MAXIMO)).isTrue();
    assertThat(Documento.cabeNoLimite(Documento.TAMANHO_MAXIMO + 1)).isFalse();
  }

  @Test
  @DisplayName("o disco guarda, abre e apaga pela chave, e recusa chave que não é UUID")
  void disco(@TempDir Path pasta) throws Exception {
    ArmazenamentoEmDisco disco =
        new ArmazenamentoEmDisco(new PropriedadesDeDocumentos(pasta.toString()));
    String chave = "123e4567-e89b-12d3-a456-426614174000";

    disco.guardar(chave, new ByteArrayInputStream("conteúdo".getBytes(StandardCharsets.UTF_8)));
    try (var lido = disco.abrir(chave)) {
      assertThat(new String(lido.readAllBytes(), StandardCharsets.UTF_8)).isEqualTo("conteúdo");
    }
    disco.apagar(chave);
    disco.apagar(chave);
    assertThat(Files.list(pasta)).isEmpty();

    org.assertj.core.api.Assertions.assertThatThrownBy(() -> disco.abrir("../segredo"))
        .isInstanceOf(IllegalArgumentException.class);
  }
}
