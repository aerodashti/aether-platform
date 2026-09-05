package br.com.aerodash.aether.saude;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.com.aerodash.aether.comum.erro.RecursoNaoEncontradoException;
import br.com.aerodash.aether.comum.observabilidade.ContextoDaRequisicao;
import br.com.aerodash.aether.comum.observabilidade.PoliticaDeCamposPermitidos;
import br.com.aerodash.aether.comum.observabilidade.SanitizadorDeLog;
import io.opentelemetry.api.OpenTelemetry;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(SaudeController.class)
@DisplayName("SaudeController")
class SaudeControllerTest {

  /**
   * O slice do {@code @WebMvcTest} já traz o FiltroDeLinhaCanonica, porque ele é um Filter; o que
   * falta são as colaborações dele. O OpenTelemetry entra como no-op: aqui o que se testa é o
   * contrato HTTP, não a exportação de spans.
   */
  @TestConfiguration
  @Import({ContextoDaRequisicao.class, SanitizadorDeLog.class, PoliticaDeCamposPermitidos.class})
  static class ObservabilidadeDeTeste {

    @Bean
    OpenTelemetry openTelemetry() {
      return OpenTelemetry.noop();
    }
  }

  private static final Instant AGORA = Instant.parse("2026-09-04T12:00:00Z");

  @Autowired private MockMvc mockMvc;

  @MockitoBean private SaudeService service;

  @Test
  @DisplayName("devolve a situação consolidada em JSON")
  void devolveSituacaoConsolidada() throws Exception {
    when(service.verificarSituacaoGeral())
        .thenReturn(
            new SaudeResponse(
                SituacaoDeSaude.OPERANTE,
                "0.1.0",
                List.of(
                    new ComponenteDeSaudeResponse(
                        "banco", SituacaoDeSaude.OPERANTE, AGORA, true))));

    mockMvc
        .perform(get("/saude"))
        .andExpect(status().isOk())
        .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
        .andExpect(jsonPath("$.situacaoGeral").value("OPERANTE"))
        .andExpect(jsonPath("$.versao").value("0.1.0"))
        .andExpect(jsonPath("$.componentes[0].componente").value("banco"))
        .andExpect(jsonPath("$.componentes[0].saudavel").value(true));
  }

  @Test
  @DisplayName("devolve o mesmo X-Request-Id recebido")
  void devolveOIdentificadorDeCorrelacao() throws Exception {
    when(service.verificarSituacaoGeral())
        .thenReturn(new SaudeResponse(SituacaoDeSaude.OPERANTE, "0.1.0", List.of()));

    mockMvc
        .perform(get("/saude").header("X-Request-Id", "abc-123"))
        .andExpect(status().isOk())
        .andExpect(header().string("X-Request-Id", "abc-123"));
  }

  @Test
  @DisplayName("traduz componente inexistente em Problem Details 404")
  void componenteInexistenteViraProblemDetails() throws Exception {
    when(service.consultarComponente(any()))
        .thenThrow(
            new RecursoNaoEncontradoException(
                "O componente informado não é monitorado pela plataforma."));

    mockMvc
        .perform(get("/saude/componente/inexistente").header("X-Request-Id", "abc-123"))
        .andExpect(status().isNotFound())
        .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
        .andExpect(jsonPath("$.title").value("Recurso não encontrado"))
        .andExpect(
            jsonPath("$.detail").value("O componente informado não é monitorado pela plataforma."))
        .andExpect(jsonPath("$.requisicao").value("abc-123"));
  }
}
