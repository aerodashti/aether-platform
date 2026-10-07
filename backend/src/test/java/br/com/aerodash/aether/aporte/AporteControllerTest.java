package br.com.aerodash.aether.aporte;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
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

  @ParameterizedTest(name = "valor {0} é recusado no campo, sem chegar ao banco")
  @CsvSource({"0.001", "100.999", "1000000000000000", "1e20"})
  @DisplayName("valor do aporte com casas demais ou maior que a coluna: 400 em campos.valor")
  void valorForaDaColuna(String valor) throws Exception {
    when(autenticacao.autenticar(TOKEN)).thenReturn(Optional.of(GESTOR));

    mockMvc
        .perform(
            post("/aportes")
                .cookie(new Cookie("aether_sessao", TOKEN))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"aeronaveId":1,"proprietarioId":7,"data":"2026-10-03",
                     "competencia":"2026-09","valor":%s}
                    """
                        .formatted(valor)))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.campos.valor").value(AporteRequest.MENSAGEM_DO_VALOR));
    verify(aportes, never()).criar(any());
  }

  @Test
  @DisplayName("competência fora do formato AAAA-MM é recusada no próprio campo")
  void competenciaIlegivel() throws Exception {
    when(autenticacao.autenticar(TOKEN)).thenReturn(Optional.of(GESTOR));

    mockMvc
        .perform(
            post("/aportes")
                .cookie(new Cookie("aether_sessao", TOKEN))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"aeronaveId":1,"proprietarioId":7,"data":"2026-10-03",
                     "competencia":"09/2026","valor":10}
                    """))
        .andExpect(status().isBadRequest())
        .andExpect(
            jsonPath("$.campos.competencia").value("Informe a competência no formato AAAA-MM."));
  }

  @Test
  @DisplayName("a recusa de domínio de um campo volta em campos, com o nome do JSON")
  void recusaDeDominioNoCampo() throws Exception {
    when(autenticacao.autenticar(TOKEN)).thenReturn(Optional.of(GESTOR));
    when(aportes.atualizar(eq(5L), any()))
        .thenThrow(
            new AporteInvalidoException(
                "Aporte inválido", "Use uma competência de 01/2000 até 10/2027.", "competencia"));

    mockMvc
        .perform(
            put("/aportes/5")
                .cookie(new Cookie("aether_sessao", TOKEN))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"aeronaveId":1,"proprietarioId":7,"data":"2026-10-03",
                     "competencia":"2027-11","valor":10}
                    """))
        .andExpect(status().isBadRequest())
        .andExpect(
            jsonPath("$.campos.competencia").value("Use uma competência de 01/2000 até 10/2027."));
  }

  private static final Map<String, String> MENSAGENS_DO_RENDIMENTO =
      Map.of(
          "taxa", RendimentoRequest.MENSAGEM_DA_TAXA,
          "saldoAplicado", RendimentoRequest.MENSAGEM_DO_SALDO,
          "valor", RendimentoRequest.MENSAGEM_DO_VALOR);

  @ParameterizedTest(name = "{0} = {1} é recusado em campos.{0}")
  @CsvSource({
    "taxa, 1000",
    "taxa, 10.5",
    "taxa, 0.00001",
    "saldoAplicado, 100.555",
    "saldoAplicado, 1000000000000000",
    "valor, 1.239",
    "valor, 1000000000000000"
  })
  @DisplayName("rendimento com número fora da coluna ou taxa acima de 10%: 400 no campo")
  void rendimentoForaDosLimites(String campo, String numero) throws Exception {
    when(autenticacao.autenticar(TOKEN)).thenReturn(Optional.of(GESTOR));
    String corpo =
        """
        {"aeronaveId":1,"data":"2026-10-03","aplicacao":"CDB DI",
         "saldoAplicado":104200,"taxa":0.91,"valor":948.22}
        """
            .replaceFirst("\"" + campo + "\":[0-9.]+", "\"" + campo + "\":" + numero);

    mockMvc
        .perform(
            post("/rendimentos")
                .cookie(new Cookie("aether_sessao", TOKEN))
                .contentType(MediaType.APPLICATION_JSON)
                .content(corpo))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.campos." + campo).value(MENSAGENS_DO_RENDIMENTO.get(campo)));
    verify(rendimentos, never()).criar(any());
  }
}
