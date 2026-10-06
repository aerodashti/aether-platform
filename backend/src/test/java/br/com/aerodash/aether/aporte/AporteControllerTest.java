package br.com.aerodash.aether.aporte;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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
import java.math.BigDecimal;
import java.time.LocalDate;
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
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest({AporteController.class, RendimentoController.class})
@DisplayName("AporteController e RendimentoController")
class AporteControllerTest {

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
  private static final UsuarioAutenticado GESTOR =
      new UsuarioAutenticado(2L, "Patrícia", PapelDoUsuario.GESTOR);
  private static final UsuarioAutenticado PROPRIETARIO =
      new UsuarioAutenticado(4L, "Rubens", PapelDoUsuario.PROPRIETARIO);

  private static final AporteResponse APORTE =
      new AporteResponse(
          5L,
          1L,
          "PS-MEP",
          7L,
          "Ricardo Meirelles",
          null,
          LocalDate.parse("2026-10-03"),
          YearMonth.of(2026, 9),
          new BigDecimal("25000.00"));

  @Autowired private MockMvc mockMvc;

  @MockitoBean private AporteService aportes;
  @MockitoBean private RendimentoService rendimentos;
  @MockitoBean private AutenticacaoService autenticacao;

  @Test
  @DisplayName("o proprietário lê os aportes, e a competência sai como AAAA-MM")
  void proprietarioLe() throws Exception {
    when(autenticacao.autenticar(TOKEN)).thenReturn(Optional.of(PROPRIETARIO));
    when(aportes.listar(eq(1L), eq(YearMonth.of(2026, 7)), eq(YearMonth.of(2026, 9))))
        .thenReturn(new AportesResponse(List.of(APORTE), new BigDecimal("25000.00")));

    mockMvc
        .perform(
            get("/aportes?aeronave=1&de=2026-07&ate=2026-09")
                .cookie(new Cookie("aether_sessao", TOKEN)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.aportes[0].competencia").value("2026-09"))
        .andExpect(jsonPath("$.total").value(25000.00));
  }

  @Test
  @DisplayName("o proprietário não registra aporte nem rendimento: 403 antes do service")
  void proprietarioNaoRegistra() throws Exception {
    when(autenticacao.autenticar(TOKEN)).thenReturn(Optional.of(PROPRIETARIO));

    for (String rota : List.of("/aportes", "/rendimentos")) {
      mockMvc
          .perform(
              post(rota)
                  .cookie(new Cookie("aether_sessao", TOKEN))
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("{}"))
          .andExpect(status().isForbidden());
    }
    verify(aportes, never()).criar(any());
    verify(rendimentos, never()).criar(any());
  }

  @Test
  @DisplayName("o gestor registra; a competência chega como AAAA-MM no corpo")
  void gestorRegistra() throws Exception {
    when(autenticacao.autenticar(TOKEN)).thenReturn(Optional.of(GESTOR));
    when(aportes.criar(any())).thenReturn(APORTE);

    mockMvc
        .perform(
            post("/aportes")
                .cookie(new Cookie("aether_sessao", TOKEN))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"aeronaveId":1,"proprietarioId":7,"data":"2026-10-03",
                     "competencia":"2026-09","valor":25000.00}
                    """))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.id").value(5));
  }

  @Test
  @DisplayName("aporte sem valor é recusado pela validação, em português")
  void validacao() throws Exception {
    when(autenticacao.autenticar(TOKEN)).thenReturn(Optional.of(GESTOR));

    mockMvc
        .perform(
            post("/aportes")
                .cookie(new Cookie("aether_sessao", TOKEN))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"aeronaveId":1,"proprietarioId":7,"data":"2026-10-03","competencia":"2026-09"}
                    """))
        .andExpect(status().isBadRequest());
    verify(aportes, never()).criar(any());
  }
}
