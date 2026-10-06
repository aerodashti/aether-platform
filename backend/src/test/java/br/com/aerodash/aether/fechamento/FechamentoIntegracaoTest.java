package br.com.aerodash.aether.fechamento;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.com.aerodash.aether.aeronave.AeronaveRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.YearMonth;
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
 * O fechamento contra o seed num PostgreSQL de verdade. O seed é relativo a "hoje", então o teste
 * confere as invariantes do rateio, não números fixos: as linhas somam o total da aeronave, os
 * saldos dos proprietários somam o saldo do fundo, e o total de custos é o mesmo de Lançamentos.
 *
 * <p>Exige Docker. Fica fora do {@code check}: rode com {@code ./gradlew testeIntegracao}.
 */
@Tag("integracao")
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@DisplayName("Fechamento (integração)")
class FechamentoIntegracaoTest {

  @Container @ServiceConnection
  static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");

  @Autowired private MockMvc mockMvc;
  @Autowired private AeronaveRepository aeronaves;
  @Autowired private ObjectMapper json;
  @Autowired private Clock relogio;

  @Test
  @DisplayName("o mês fecha: linhas somam o total e os saldos somam o fundo")
  void mesFecha() throws Exception {
    Long psMep = aeronaves.findByMatricula("PS-MEP").orElseThrow().getId();
    YearMonth agora = YearMonth.now(relogio);
    Cookie sessao = entrar();

    JsonNode mes =
        ler("/fechamentos/mensal?aeronave=%d&competencia=%s".formatted(psMep, agora), sessao);
    JsonNode lancamentos =
        ler("/custos?aeronave=%d&competencia=%s".formatted(psMep, agora), sessao);

    BigDecimal totalDeCustos = mes.at("/indicadores/totalDeCustos").decimalValue();
    assertThat(totalDeCustos).isEqualByComparingTo(lancamentos.at("/totais/total").decimalValue());
    assertThat(mes.at("/totais/totalDoMes").decimalValue()).isEqualByComparingTo(totalDeCustos);
    assertThat(mes.at("/totais/saldoAcumulado").decimalValue())
        .isEqualByComparingTo(mes.at("/saldoFinalDoFundo").decimalValue());
    assertThat(mes.at("/totais/percentual").decimalValue()).isEqualByComparingTo("100");
  }

  @Test
  @DisplayName("o período encadeia os saldos: o final de um mês é o inicial do seguinte")
  void periodoEncadeia() throws Exception {
    Long psMep = aeronaves.findByMatricula("PS-MEP").orElseThrow().getId();
    YearMonth agora = YearMonth.now(relogio);
    Cookie sessao = entrar();

    JsonNode periodo =
        ler(
            "/fechamentos/periodo?aeronave=%d&de=%s&ate=%s"
                .formatted(psMep, agora.minusMonths(3), agora),
            sessao);
    JsonNode competencias = periodo.get("competencias");
    assertThat(competencias).hasSize(4);
    for (int i = 1; i < competencias.size(); i++) {
      BigDecimal anterior = competencias.get(i - 1).get("saldoFinal").decimalValue();
      BigDecimal resultado = competencias.get(i).get("resultado").decimalValue();
      assertThat(competencias.get(i).get("saldoFinal").decimalValue())
          .isEqualByComparingTo(anterior.add(resultado));
    }
    assertThat(periodo.at("/totais/aportes").decimalValue()).isEqualByComparingTo("140000.00");
  }

  private JsonNode ler(String url, Cookie sessao) throws Exception {
    MvcResult resultado =
        mockMvc.perform(get(url).cookie(sessao)).andExpect(status().isOk()).andReturn();
    return json.readTree(resultado.getResponse().getContentAsString());
  }

  private Cookie entrar() throws Exception {
    MvcResult resultado =
        mockMvc
            .perform(
                post("/autenticacao/entrar")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {"email":"leonardo@administraair.com.br","senha":"aether-dev-2026"}
                        """))
            .andExpect(status().isOk())
            .andReturn();
    return resultado.getResponse().getCookie("aether_sessao");
  }
}
