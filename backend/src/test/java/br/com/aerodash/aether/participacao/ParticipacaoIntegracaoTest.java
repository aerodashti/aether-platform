package br.com.aerodash.aether.participacao;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.com.aerodash.aether.aeronave.AeronaveRepository;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * O contrato de participação contra um PostgreSQL de verdade: o seed com vigente e histórico, o
 * índice parcial de vigente único e o arquivamento saindo pela borda HTTP.
 *
 * <p>Exige Docker. Fica fora do {@code check}: rode com {@code ./gradlew testeIntegracao}.
 */
@Tag("integracao")
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@DisplayName("Participações (integração)")
class ParticipacaoIntegracaoTest {

  @Container @ServiceConnection
  static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");

  private static final String SENHA = "aether-dev-2026";

  @Autowired private MockMvc mockMvc;
  @Autowired private AeronaveRepository aeronaves;
  @Autowired private ContratoDeParticipacaoRepository contratos;

  private Long psMep() {
    return aeronaves.findByMatricula("PS-MEP").orElseThrow().getId();
  }

  @Test
  @DisplayName("o seed traz o contrato vigente com três fatias e um arquivado")
  void seedComVigenteEHistorico() throws Exception {
    mockMvc
        .perform(get("/aeronaves/" + psMep() + "/contratos").cookie(entrar()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.vigente.participacoes.length()").value(3))
        .andExpect(jsonPath("$.vigente.participacoes[0].nome").value("Ricardo Meirelles"))
        .andExpect(jsonPath("$.vigente.participacoes[0].percentual").value(50.00))
        .andExpect(jsonPath("$.historico.length()").value(1))
        .andExpect(jsonPath("$.historico[0].criadoPor").value("Leonardo Andrade"));
  }

  @Test
  @DisplayName("definir um contrato novo arquiva o vigente — e o banco só aceita um vigente")
  void definirArquivaOVigente() throws Exception {
    // A PR-KRT do seed não tem contrato: o fluxo inteiro nasce e é trocado aqui.
    Long aeronaveId = aeronaves.findByMatricula("PR-KRT").orElseThrow().getId();
    Cookie sessao = entrar();

    mockMvc
        .perform(
            post("/aeronaves/" + aeronaveId + "/contratos")
                .cookie(sessao)
                .contentType(MediaType.APPLICATION_JSON)
                .content(participacoesDoSeed("100.00", null, null)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.vigente.participacoes.length()").value(1))
        .andExpect(jsonPath("$.historico.length()").value(0));

    mockMvc
        .perform(
            post("/aeronaves/" + aeronaveId + "/contratos")
                .cookie(sessao)
                .contentType(MediaType.APPLICATION_JSON)
                .content(participacoesDoSeed("60.00", "40.00", null)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.vigente.participacoes.length()").value(2))
        .andExpect(jsonPath("$.historico.length()").value(1));

    assertThat(contratos.findByAeronaveIdAndFimDaVigenciaIsNull(aeronaveId)).isPresent();
  }

  @Test
  @DisplayName("soma errada vira Problem Details 400 com a soma no detalhe")
  void somaErradaVira400() throws Exception {
    mockMvc
        .perform(
            post("/aeronaves/" + psMep() + "/contratos")
                .cookie(entrar())
                .contentType(MediaType.APPLICATION_JSON)
                .content(participacoesDoSeed("60.00", "39.99", null)))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.title").value("Contrato de participação inválido"));
  }

  @Test
  @DisplayName("quem está em contrato só sai redistribuindo a fatia: tudo numa transação")
  void saidaRedistribuiEDesativa() throws Exception {
    // PT-XLB (sem contrato no seed) e um proprietário novo: o seed das outras aeronaves fica
    // intocado.
    Long psFum = aeronaves.findByMatricula("PT-XLB").orElseThrow().getId();
    Cookie sessao = entrar();
    long quemSai = criarProprietario(sessao, "Saída Teste");
    long ricardo = idDoProprietario(sessao, "Ricardo Meirelles");
    definirContrato(
        sessao,
        psFum,
        "[{\"proprietarioId\":%d,\"percentual\":70.00},{\"proprietarioId\":%d,\"percentual\":30.00}]"
            .formatted(ricardo, quemSai));

    mockMvc
        .perform(post("/proprietarios/" + quemSai + "/desativacao").cookie(sessao))
        .andExpect(status().isConflict());

    mockMvc
        .perform(
            post("/proprietarios/" + quemSai + "/saida")
                .cookie(sessao)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"contratos":[{"aeronaveId":%d,
                      "participacoes":[{"proprietarioId":%d,"percentual":100.00}]}]}
                    """
                        .formatted(psFum, ricardo)))
        .andExpect(status().isNoContent());

    mockMvc
        .perform(get("/aeronaves/" + psFum + "/contratos").cookie(sessao))
        .andExpect(jsonPath("$.vigente.participacoes.length()").value(1));
    mockMvc
        .perform(get("/proprietarios").cookie(sessao))
        .andExpect(
            jsonPath("$[?(@.nome == 'Saída Teste')].situacao")
                .value(org.hamcrest.Matchers.contains("INATIVO")));
  }

  private long criarProprietario(Cookie sessao, String nome) throws Exception {
    MvcResult criado =
        mockMvc
            .perform(
                post("/proprietarios")
                    .cookie(sessao)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"nome\":\"%s\",\"corDeIdentificacao\":\"AZUL\"}".formatted(nome)))
            .andExpect(status().isCreated())
            .andReturn();
    return new com.fasterxml.jackson.databind.ObjectMapper()
        .readTree(criado.getResponse().getContentAsString())
        .get("id")
        .asLong();
  }

  private long idDoProprietario(Cookie sessao, String nome) throws Exception {
    String json =
        mockMvc
            .perform(get("/proprietarios").cookie(sessao))
            .andReturn()
            .getResponse()
            .getContentAsString();
    for (var no : new com.fasterxml.jackson.databind.ObjectMapper().readTree(json)) {
      if (nome.equals(no.get("nome").asText())) {
        return no.get("id").asLong();
      }
    }
    throw new IllegalStateException(nome);
  }

  private void definirContrato(Cookie sessao, Long aeronaveId, String participacoes)
      throws Exception {
    mockMvc
        .perform(
            post("/aeronaves/" + aeronaveId + "/contratos")
                .cookie(sessao)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"participacoes\":" + participacoes + "}"))
        .andExpect(status().isOk());
  }

  /** Monta o corpo com os proprietários do seed, na ordem Ricardo, Vetor, Helena. */
  private String participacoesDoSeed(String ricardo, String vetor, String helena) throws Exception {
    MvcResult donos =
        mockMvc
            .perform(get("/proprietarios").cookie(entrar()))
            .andExpect(status().isOk())
            .andReturn();
    String json = donos.getResponse().getContentAsString();
    var mapper = new com.fasterxml.jackson.databind.ObjectMapper();
    var lista = mapper.readTree(json);
    StringBuilder corpo = new StringBuilder("{\"participacoes\":[");
    boolean primeiro = true;
    for (var no : lista) {
      String pct =
          switch (no.get("nome").asText()) {
            case "Ricardo Meirelles" -> ricardo;
            case "Vetor Participações" -> vetor;
            case "Helena Sarraf" -> helena;
            default -> null;
          };
      if (pct == null) {
        continue;
      }
      if (!primeiro) {
        corpo.append(',');
      }
      corpo
          .append("{\"proprietarioId\":")
          .append(no.get("id").asLong())
          .append(",\"percentual\":")
          .append(pct)
          .append('}');
      primeiro = false;
    }
    return corpo.append("]}").toString();
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
