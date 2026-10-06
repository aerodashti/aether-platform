package br.com.aerodash.aether.documento;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.com.aerodash.aether.aeronave.AeronaveRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * Os documentos com banco e disco de verdade: envio de vários, download como anexo, isolamento
 * entre aeronaves e a remoção que apaga o arquivo depois do commit.
 *
 * <p>Exige Docker. Fica fora do {@code check}: rode com {@code ./gradlew testeIntegracao}.
 */
@Tag("integracao")
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@DisplayName("Documentos (integração)")
class DocumentoIntegracaoTest {

  @Container @ServiceConnection
  static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");

  @TempDir static Path pasta;

  @DynamicPropertySource
  static void armazenamento(DynamicPropertyRegistry propriedades) {
    propriedades.add("aether.documentos.diretorio", () -> pasta.toString());
  }

  private static final String SENHA = "aether-dev-2026";

  @Autowired private MockMvc mockMvc;
  @Autowired private AeronaveRepository aeronaves;
  @Autowired private ObjectMapper json;

  @Test
  @DisplayName("envia dois, baixa como anexo, não vaza para outra aeronave e remove do disco")
  void ciclo() throws Exception {
    Long psMep = aeronaves.findByMatricula("PS-MEP").orElseThrow().getId();
    Long prKrt = aeronaves.findByMatricula("PR-KRT").orElseThrow().getId();
    Cookie sessao = entrar();
    byte[] pdf = "%PDF-1.4 apólice".getBytes(StandardCharsets.UTF_8);

    long id = enviarDois(psMep, pdf, sessao);
    assertThat(arquivosNoDisco()).isEqualTo(2);

    mockMvc
        .perform(get("/aeronaves/%d/documentos".formatted(psMep)).cookie(sessao))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.documentos.length()").value(2))
        .andExpect(jsonPath("$.tamanhoTotal").value(pdf.length + 1));

    MvcResult baixado =
        mockMvc
            .perform(
                get("/aeronaves/%d/documentos/%d/conteudo".formatted(psMep, id)).cookie(sessao))
            .andExpect(status().isOk())
            .andExpect(header().string("Content-Type", "application/pdf"))
            .andExpect(header().string("X-Content-Type-Options", "nosniff"))
            .andReturn();
    assertThat(baixado.getResponse().getHeader("Content-Disposition")).startsWith("attachment");
    assertThat(baixado.getResponse().getContentAsByteArray()).isEqualTo(pdf);

    mockMvc
        .perform(get("/aeronaves/%d/documentos/%d/conteudo".formatted(prKrt, id)).cookie(sessao))
        .andExpect(status().isNotFound());

    mockMvc
        .perform(delete("/aeronaves/%d/documentos/%d".formatted(psMep, id)).cookie(sessao))
        .andExpect(status().isNoContent());
    assertThat(arquivosNoDisco()).isEqualTo(1);
  }

  /** Envia o PDF e uma foto; devolve o id do PDF. */
  private long enviarDois(Long aeronaveId, byte[] pdf, Cookie sessao) throws Exception {
    MvcResult enviados =
        mockMvc
            .perform(
                multipart("/aeronaves/%d/documentos".formatted(aeronaveId))
                    .file(
                        new MockMultipartFile(
                            "arquivos", "Apólice RETA.pdf", "application/pdf", pdf))
                    .file(
                        new MockMultipartFile("arquivos", "foto.jpg", "image/jpeg", new byte[] {1}))
                    .cookie(sessao))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.length()").value(2))
            .andReturn();
    return json.readTree(enviados.getResponse().getContentAsString()).get(0).get("id").asLong();
  }

  private static long arquivosNoDisco() throws Exception {
    try (var arquivos = Files.list(pasta)) {
      return arquivos.filter(Files::isRegularFile).count();
    }
  }

  @Test
  @DisplayName("HTML é recusado com a lista do que é aceito")
  void recusaHtml() throws Exception {
    Long psMep = aeronaves.findByMatricula("PS-MEP").orElseThrow().getId();

    mockMvc
        .perform(
            multipart("/aeronaves/%d/documentos".formatted(psMep))
                .file(new MockMultipartFile("arquivos", "x.html", "text/html", new byte[] {1}))
                .cookie(entrar()))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.detail").value(org.hamcrest.Matchers.containsString("PDF")));
  }

  private Cookie entrar() throws Exception {
    MvcResult resultado =
        mockMvc
            .perform(
                post("/autenticacao/entrar")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {"email":"leonardo@administraair.com.br","senha":"%s"}
                        """
                            .formatted(SENHA)))
            .andExpect(status().isOk())
            .andReturn();
    return resultado.getResponse().getCookie("aether_sessao");
  }
}
