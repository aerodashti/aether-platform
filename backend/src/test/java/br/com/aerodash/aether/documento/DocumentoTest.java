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
  @DisplayName("o corte do nome longo não parte um emoji ao meio")
  void corteSemMeioCaractere() {
    String nome = Documento.nomeLimpo("a".repeat(195) + "\uD83D\uDE00" + "b".repeat(10) + ".pdf");

    assertThat(nome).isEqualTo("a".repeat(195) + ".pdf");
  }

  @Test
  @DisplayName("nome só com a extensão não é nome")
  void possuiNome() {
    assertThat(Documento.possuiNome("CVA.pdf")).isTrue();
    assertThat(Documento.possuiNome("semextensao")).isTrue();
    assertThat(Documento.possuiNome(".pdf")).isFalse();
    assertThat(Documento.possuiNome(Documento.nomeLimpo("   .pdf"))).isFalse();
    assertThat(Documento.possuiNome("")).isFalse();
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
  @DisplayName("a extensão só vale com a assinatura do formato no começo do arquivo")
  void assinaturas() {
    assertThat(TipoDeArquivo.PDF.reconhece(ascii("%PDF-1.7"))).isTrue();
    assertThat(TipoDeArquivo.PDF.reconhece(ascii("\r\n%PDF-1.4 com lixo antes"))).isTrue();
    assertThat(TipoDeArquivo.PDF.reconhece(ascii("<html><script>"))).isFalse();
    assertThat(TipoDeArquivo.PNG.reconhece(bytes(0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A)))
        .isTrue();
    assertThat(TipoDeArquivo.JPG.reconhece(bytes(0xFF, 0xD8, 0xFF, 0xE0))).isTrue();
    assertThat(TipoDeArquivo.JPEG.reconhece(bytes(0x89, 'P', 'N', 'G'))).isFalse();
    assertThat(TipoDeArquivo.WEBP.reconhece(ascii("RIFF\0\0\0\0WEBPVP8 "))).isTrue();
    assertThat(TipoDeArquivo.WEBP.reconhece(ascii("RIFF\0\0\0\0WAVE"))).isFalse();
    assertThat(TipoDeArquivo.HEIC.reconhece(ascii("\0\0\0\u0018ftypheic"))).isTrue();
    assertThat(TipoDeArquivo.DOCX.reconhece(bytes('P', 'K', 3, 4))).isTrue();
    assertThat(TipoDeArquivo.XLSX.reconhece(ascii("<table>"))).isFalse();
    assertThat(TipoDeArquivo.XLS.reconhece(bytes(0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1)))
        .isTrue();
    assertThat(TipoDeArquivo.DOC.reconhece(ascii("{\\rtf1\\ansi"))).isTrue();
    assertThat(TipoDeArquivo.CSV.reconhece(ascii("data;valor"))).isTrue();
    assertThat(TipoDeArquivo.TXT.reconhece(new byte[0])).isTrue();
    assertThat(TipoDeArquivo.PDF.reconhece(new byte[0])).isFalse();
  }

  private static byte[] ascii(String texto) {
    return texto.getBytes(StandardCharsets.ISO_8859_1);
  }

  private static byte[] bytes(int... valores) {
    byte[] lidos = new byte[valores.length];
    for (int i = 0; i < valores.length; i++) {
      lidos[i] = (byte) valores[i];
    }
    return lidos;
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
    try (var restantes = Files.list(pasta)) {
      assertThat(restantes).isEmpty();
    }

    org.assertj.core.api.Assertions.assertThatThrownBy(() -> disco.abrir("../segredo"))
        .isInstanceOf(IllegalArgumentException.class);
  }
}
