package br.com.aerodash.aether.fechamento;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.com.aerodash.aether.aeronave.BaseDoRateio;
import br.com.aerodash.aether.aeronave.ModeloDeAporte;
import br.com.aerodash.aether.autenticacao.AutenticacaoService;
import br.com.aerodash.aether.autenticacao.ConfiguracaoDeSeguranca;
import br.com.aerodash.aether.autenticacao.PapelDoUsuario;
import br.com.aerodash.aether.autenticacao.RespostaDeAcessoNegado;
import br.com.aerodash.aether.autenticacao.UsuarioAutenticado;
import br.com.aerodash.aether.comum.observabilidade.ContextoDaRequisicao;
import br.com.aerodash.aether.comum.observabilidade.PoliticaDeCamposSensiveis;
import br.com.aerodash.aether.comum.observabilidade.SanitizadorDeLog;
import io.opentelemetry.api.OpenTelemetry;
import jakarta.servlet.http.Cookie;
import java.time.YearMonth;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(FechamentoController.class)
@DisplayName("FechamentoController")
class FechamentoControllerTest {

  @TestConfiguration
  @Import({
    ContextoDaRequisicao.class,
    SanitizadorDeLog.class,
    PoliticaDeCamposSensiveis.class,
    ConfiguracaoDeSeguranca.class,
    RespostaDeAcessoNegado.class
  })
  static class Dependencias {

    @Bean
    OpenTelemetry openTelemetry() {
      return OpenTelemetry.noop();
    }
  }

  private static final String TOKEN = "token-de-sessao";
  private static final UsuarioAutenticado PROPRIETARIO =
      new UsuarioAutenticado(4L, "Rubens", PapelDoUsuario.PROPRIETARIO);

  @Autowired private MockMvc mockMvc;

  @MockitoBean private FechamentoService fechamentos;
  @MockitoBean private ResumoDaFrotaService frota;
  @MockitoBean private AutenticacaoService autenticacao;

  @Test
  @DisplayName("o proprietário lê o fechamento do período")
  void proprietarioLe() throws Exception {
    when(autenticacao.autenticar(TOKEN)).thenReturn(Optional.of(PROPRIETARIO));
    when(fechamentos.periodo(eq(1L), eq(YearMonth.of(2026, 1)), eq(YearMonth.of(2026, 9))))
        .thenReturn(
            new FechamentoDoPeriodoResponse(
                1L,
                "PS-MEP",
                YearMonth.of(2026, 1),
                YearMonth.of(2026, 9),
                BaseDoRateio.POR_USO,
                ModeloDeAporte.FIXO,
                List.of(),
                null));

    mockMvc
        .perform(
            get("/fechamentos/periodo?aeronave=1&de=2026-01&ate=2026-09")
                .cookie(new Cookie("aether_sessao", TOKEN)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.matricula").value("PS-MEP"))
        .andExpect(jsonPath("$.de").value("2026-01"))
        .andExpect(jsonPath("$.baseDoRateio").value("POR_USO"))
        .andExpect(jsonPath("$.modeloDeAporte").value("FIXO"));
  }

  @Test
  @DisplayName("o resumo da frota aceita a competência ausente: o service escolhe a corrente")
  void resumoDaFrota() throws Exception {
    when(autenticacao.autenticar(TOKEN)).thenReturn(Optional.of(PROPRIETARIO));
    when(frota.frota(null))
        .thenReturn(
            List.of(
                new ResumoDaAeronaveResponse(
                    1L,
                    "PS-MEP",
                    YearMonth.of(2026, 10),
                    new java.math.BigDecimal("131945.81"),
                    java.math.BigDecimal.ZERO,
                    java.math.BigDecimal.ZERO,
                    java.math.BigDecimal.ZERO,
                    new java.math.BigDecimal("4.2"))));

    mockMvc
        .perform(get("/fechamentos/frota").cookie(new Cookie("aether_sessao", TOKEN)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].matricula").value("PS-MEP"))
        .andExpect(jsonPath("$[0].coberturaEmMeses").value(4.2));
  }

  @Test
  @DisplayName("a competência fora da janela volta no campo do parâmetro")
  void recusaNoParametro() throws Exception {
    when(autenticacao.autenticar(TOKEN)).thenReturn(Optional.of(PROPRIETARIO));
    when(fechamentos.mensal(1L, YearMonth.of(9999, 12)))
        .thenThrow(
            new FechamentoInvalidoException(
                "Use uma competência de 01/2000 até 10/2027.", "competencia"));

    mockMvc
        .perform(
            get("/fechamentos/mensal?aeronave=1&competencia=9999-12")
                .cookie(new Cookie("aether_sessao", TOKEN)))
        .andExpect(status().isBadRequest())
        .andExpect(
            jsonPath("$.campos.competencia").value("Use uma competência de 01/2000 até 10/2027."));
  }

  @Test
  @DisplayName("sem sessão, 401; sem competência, 400 antes do service")
  void exigeSessaoECompetencia() throws Exception {
    mockMvc
        .perform(get("/fechamentos/mensal?aeronave=1&competencia=2026-09"))
        .andExpect(status().isUnauthorized());

    when(autenticacao.autenticar(TOKEN)).thenReturn(Optional.of(PROPRIETARIO));
    mockMvc
        .perform(get("/fechamentos/mensal?aeronave=1").cookie(new Cookie("aether_sessao", TOKEN)))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.detail").value("Informe o parâmetro \"competencia\"."));
    mockMvc
        .perform(
            get("/fechamentos/mensal?aeronave=1&competencia=setembro")
                .cookie(new Cookie("aether_sessao", TOKEN)))
        .andExpect(status().isBadRequest());
    verify(fechamentos, never()).mensal(any(), any());
  }
}
