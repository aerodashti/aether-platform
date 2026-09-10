package br.com.aerodash.aether.tripulante;

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

@WebMvcTest(TripulanteController.class)
@DisplayName("TripulanteController")
class TripulanteControllerTest {

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
  private static final UsuarioAutenticado PILOTO =
      new UsuarioAutenticado(3L, "Caio", PapelDoUsuario.PILOTO);
  private static final TripulanteResponse MARCOS =
      new TripulanteResponse(
          7L,
          "Marcos Vilela",
          "112233",
          FuncaoDoTripulante.COMANDANTE,
          LocalDate.parse("2027-04-01"),
          false,
          LocalDate.parse("2026-08-29"),
          true,
          new BigDecimal("8420.0"),
          null,
          null,
          SituacaoDoTripulante.ATIVO);

  @Autowired private MockMvc mockMvc;

  @MockitoBean private TripulanteService tripulantes;
  @MockitoBean private AutenticacaoService autenticacao;

  @Test
  @DisplayName("qualquer papel vê a tripulação, com os vencimentos já julgados")
  void qualquerPapelLe() throws Exception {
    when(autenticacao.autenticar(TOKEN)).thenReturn(Optional.of(PILOTO));
    when(tripulantes.listar(1L)).thenReturn(List.of(MARCOS));

    mockMvc
        .perform(get("/aeronaves/1/tripulantes").cookie(new Cookie("aether_sessao", TOKEN)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].nome").value("Marcos Vilela"))
        .andExpect(jsonPath("$[0].chtVencido").value(true));
  }

  @Test
  @DisplayName("piloto não vincula tripulante: 403 antes do service")
  void pilotoNaoEscreve() throws Exception {
    when(autenticacao.autenticar(TOKEN)).thenReturn(Optional.of(PILOTO));

    mockMvc
        .perform(
            post("/aeronaves/1/tripulantes")
                .cookie(new Cookie("aether_sessao", TOKEN))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"nome":"Marcos Vilela","funcao":"COMANDANTE","situacao":"ATIVO"}
                    """))
        .andExpect(status().isForbidden());

    verify(tripulantes, never()).criar(any(), any());
  }

  @Test
  @DisplayName("o gestor vincula e recebe 201")
  void gestorVincula() throws Exception {
    when(autenticacao.autenticar(TOKEN)).thenReturn(Optional.of(GESTOR));
    when(tripulantes.criar(eq(1L), any())).thenReturn(MARCOS);

    mockMvc
        .perform(
            post("/aeronaves/1/tripulantes")
                .cookie(new Cookie("aether_sessao", TOKEN))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"nome":"Marcos Vilela","canac":"112233","funcao":"COMANDANTE",
                     "situacao":"ATIVO"}
                    """))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.id").value(7));
  }

  @Test
  @DisplayName("sem função nem situação a validação barra antes do service")
  void validacaoBarra() throws Exception {
    when(autenticacao.autenticar(TOKEN)).thenReturn(Optional.of(GESTOR));

    mockMvc
        .perform(
            post("/aeronaves/1/tripulantes")
                .cookie(new Cookie("aether_sessao", TOKEN))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"nome":"Marcos Vilela"}
                    """))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.campos.funcao").exists())
        .andExpect(jsonPath("$.campos.situacao").exists());

    verify(tripulantes, never()).criar(any(), any());
  }
}
