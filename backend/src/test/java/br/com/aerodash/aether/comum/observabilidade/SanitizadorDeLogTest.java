package br.com.aerodash.aether.comum.observabilidade;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.stream.IntStream;
import org.assertj.core.api.InstanceOfAssertFactories;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("SanitizadorDeLog")
class SanitizadorDeLogTest {

  private static final String JSON = "application/json";

  private final SanitizadorDeLog sanitizador =
      new SanitizadorDeLog(new PoliticaDeCamposSensiveis(), new ObjectMapper());

  @Test
  @DisplayName("mascara o CPF preservando só os cinco últimos dígitos")
  void mascaraOCpf() {
    Map<String, Object> tratado = comoMapa("{\"cpf\":\"12345678901\",\"id\":7}");

    assertThat(tratado).containsEntry("cpf", "***.***.789-01").containsEntry("id", 7);
    assertThat(String.valueOf(tratado)).doesNotContain("12345678901");
  }

  @Test
  @DisplayName("mascara o CPF já formatado, o inválido e o nulo")
  void mascaraCpfFormatadoEInvalido() {
    assertThat(comoMapa("{\"cpf\":\"123.456.789-01\"}")).containsEntry("cpf", "***.***.789-01");
    assertThat(comoMapa("{\"cpf\":\"123\"}")).containsEntry("cpf", "***");
    assertThat(comoMapa("{\"cpf\":null}")).containsEntry("cpf", "***");
  }

  @Test
  @DisplayName("mascara o CPF em qualquer profundidade, dentro de objeto e de lista")
  void mascaraCpfAninhado() {
    Map<String, Object> tratado =
        comoMapa(
            "{\"proprietario\":{\"nome\":\"Ana\",\"cpf\":\"12345678901\"},"
                + "\"tripulantes\":[{\"cpf\":\"98765432100\"}]}");

    assertThat(String.valueOf(tratado))
        .contains("***.***.789-01")
        .contains("***.***.321-00")
        .doesNotContain("12345678901")
        .doesNotContain("98765432100");
  }

  @Test
  @DisplayName("campo que não é sensível aparece em claro")
  void campoComumApareceEmClaro() {
    Map<String, Object> tratado =
        comoMapa(
            "{\"id\":7,\"versao\":\"0.1.0\",\"saudavel\":true,\"matricula\":\"PR-ABC\","
                + "\"verificadoEm\":\"2026-09-04T12:00:00Z\",\"situacao\":\"OPERANTE\"}");

    assertThat(tratado)
        .containsEntry("id", 7)
        .containsEntry("versao", "0.1.0")
        .containsEntry("saudavel", true)
        .containsEntry("matricula", "PR-ABC")
        .containsEntry("verificadoEm", "2026-09-04T12:00:00Z")
        .containsEntry("situacao", "OPERANTE");
  }

  @Test
  @DisplayName("resume lista grande sem perder os campos irmãos")
  void resumeListaGrandePreservandoIrmaos() {
    String itens =
        IntStream.rangeClosed(1, 12)
            .mapToObj(numero -> "{\"componente\":\"c" + numero + "\"}")
            .reduce((a, b) -> a + "," + b)
            .orElseThrow();
    Map<String, Object> tratado =
        comoMapa("{\"versao\":\"0.1.0\",\"componentes\":[" + itens + "]}");

    assertThat(tratado).containsEntry("versao", "0.1.0");
    assertThat(tratado.get("componentes"))
        .asInstanceOf(InstanceOfAssertFactories.map(String.class, Object.class))
        .containsEntry("_total", 12)
        .hasEntrySatisfying(
            "itens",
            itensTratados ->
                assertThat((List<?>) itensTratados).hasSize(SanitizadorDeLog.ITENS_DA_LISTA));
  }

  @Test
  @DisplayName("mantém lista pequena inteira, sem resumo")
  void mantemListaPequena() {
    Map<String, Object> tratado =
        comoMapa("{\"componentes\":[{\"componente\":\"api\"},{\"componente\":\"banco\"}]}");

    assertThat(tratado.get("componentes")).isInstanceOf(List.class);
    assertThat((List<?>) tratado.get("componentes")).hasSize(2);
  }

  @Test
  @DisplayName("trunca string longa dizendo o tamanho original")
  void truncaStringLonga() {
    String longa = "a".repeat(2310);
    Map<String, Object> tratado = comoMapa("{\"detail\":\"" + longa + "\"}");

    String valor = String.valueOf(tratado.get("detail"));
    assertThat(valor)
        .hasSize(SanitizadorDeLog.LIMITE_DE_TEXTO + "…[truncado, 2310 chars]".length());
    assertThat(valor).endsWith("…[truncado, 2310 chars]");
  }

  @Test
  @DisplayName("não processa conteúdo que não é JSON: registra só tipo e tamanho")
  void naoProcessaConteudoBinario() {
    byte[] binario = new byte[] {1, 2, 3, 4};

    Object tratado = sanitizador.sanitizarCorpo(binario, "multipart/form-data; boundary=xyz");

    assertThat(tratado)
        .asInstanceOf(InstanceOfAssertFactories.map(String.class, Object.class))
        .containsEntry("tamanho_bytes", 4)
        .containsEntry("content_type", "multipart/form-data; boundary=xyz");
  }

  @Test
  @DisplayName("para de descer depois da profundidade máxima")
  void limitaProfundidade() {
    String aninhado = "{\"componente\":".repeat(9) + "\"fim\"" + "}".repeat(9);

    assertThat(String.valueOf(comoMapa(aninhado))).contains("profundidade máxima");
  }

  @Test
  @DisplayName("esconde por inteiro senha, código de recuperação e e-mail")
  void escondeCredenciaisEEmail() {
    Map<String, Object> entrada =
        comoMapa("{\"email\":\"leonardo@administraair.com.br\",\"senha\":\"aether-dev-2026\"}");

    assertThat(entrada).containsEntry("email", "***").containsEntry("senha", "***");
    assertThat(String.valueOf(entrada))
        .doesNotContain("aether-dev-2026")
        .doesNotContain("leonardo@administraair.com.br");

    Map<String, Object> recuperacao =
        comoMapa("{\"codigo\":\"519274\",\"novaSenha\":\"senha-nova-longa\"}");

    assertThat(recuperacao).containsEntry("codigo", "***").containsEntry("novaSenha", "***");
    assertThat(String.valueOf(recuperacao))
        .doesNotContain("519274")
        .doesNotContain("senha-nova-longa");
  }

  @Test
  @DisplayName("corpo vazio não vira campo")
  void corpoVazioEhIgnorado() {
    assertThat(sanitizador.sanitizarCorpo(new byte[0], JSON)).isNull();
    assertThat(sanitizador.sanitizarCorpo(null, JSON)).isNull();
  }

  @SuppressWarnings("unchecked")
  private Map<String, Object> comoMapa(String corpo) {
    Object tratado = sanitizador.sanitizarCorpo(corpo.getBytes(StandardCharsets.UTF_8), JSON);
    assertThat(tratado).isInstanceOf(Map.class);
    return (Map<String, Object>) tratado;
  }
}
