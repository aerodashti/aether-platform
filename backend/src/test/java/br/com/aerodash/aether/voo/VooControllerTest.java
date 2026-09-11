package br.com.aerodash.aether.voo;

import static org.mockito.ArgumentMatchers.any;
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

@WebMvcTest(VooController.class)
@DisplayName("VooController")
class VooControllerTest {

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
  private static final UsuarioAutenticado PILOTO =
      new UsuarioAutenticado(3L, "Caio", PapelDoUsuario.PILOTO);
  private static final UsuarioAutenticado PROPRIETARIO =
      new UsuarioAutenticado(9L, "Rubens", PapelDoUsuario.PROPRIETARIO);

  private static final TrechoResponse TRECHO =
      new TrechoResponse(
          5L,
          1L,
          "PS-MEP",
          "RV-2026-041",
          1,
          LocalDate.parse("2026-09-08"),
          "SBSP",
          "SBRJ",
          new BigDecimal("0.8"),
          new BigDecimal("365.0"),
          null,
          null,
          null,
          null,
          7L,
          "Ricardo Meirelles",
          null,
          false,
          null);

  @Autowired private MockMvc mockMvc;

  @MockitoBean private VooService voos;
  @MockitoBean private AutenticacaoService autenticacao;

  @Test
  @DisplayName("qualquer papel lê o diário, com os totais somados no servidor")
  void qualquerPapelLe() throws Exception {
    when(autenticacao.autenticar(TOKEN)).thenReturn(Optional.of(PROPRIETARIO));
    when(voos.listar(any(), any()))
        .thenReturn(
            new DiarioDeVoosResponse(
                List.of(TRECHO),
                new DiarioDeVoosResponse.Totais(
                    new BigDecimal("0.8"), new BigDecimal("365.0"), 1)));

    mockMvc
        .perform(
            get("/voos?aeronave=1&competencia=2026-09").cookie(new Cookie("aether_sessao", TOKEN)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.trechos[0].relatorioDeVoo").value("RV-2026-041"))
        .andExpect(jsonPath("$.totais.pousos").value(1));
  }

  @Test
  @DisplayName("o piloto lança trecho: é ele quem volta do voo com os horários")
  void pilotoLanca() throws Exception {
    when(autenticacao.autenticar(TOKEN)).thenReturn(Optional.of(PILOTO));
    when(voos.criar(any())).thenReturn(TRECHO);

    mockMvc
        .perform(
            post("/voos")
                .cookie(new Cookie("aether_sessao", TOKEN))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"aeronaveId":1,"relatorioDeVoo":"RV-2026-041","numeroDoTrecho":1,
                     "data":"2026-09-08","origem":"SBSP","destino":"SBRJ","km":365.0,
                     "proprietarioId":7}
                    """))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.id").value(5));
  }

  @Test
  @DisplayName("proprietário não escreve no diário: 403 antes do service")
  void proprietarioNaoEscreve() throws Exception {
    when(autenticacao.autenticar(TOKEN)).thenReturn(Optional.of(PROPRIETARIO));

    mockMvc
        .perform(
            post("/voos")
                .cookie(new Cookie("aether_sessao", TOKEN))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
        .andExpect(status().isForbidden());

    verify(voos, never()).criar(any());
  }

  @Test
  @DisplayName("origem fora do padrão ICAO é barrada pela validação")
  void origemInvalida() throws Exception {
    when(autenticacao.autenticar(TOKEN)).thenReturn(Optional.of(PILOTO));

    mockMvc
        .perform(
            post("/voos")
                .cookie(new Cookie("aether_sessao", TOKEN))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"aeronaveId":1,"relatorioDeVoo":"RV-1","numeroDoTrecho":1,
                     "data":"2026-09-08","origem":"SP","destino":"SBRJ","km":365.0}
                    """))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.campos.origem").exists());

    verify(voos, never()).criar(any());
  }
}
