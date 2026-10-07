package br.com.aerodash.aether.tripulante;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
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
import java.util.List;
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
import org.springframework.test.web.servlet.ResultActions;

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

  @ParameterizedTest(name = "{0} = {1}")
  @CsvSource(
      delimiter = '|',
      value = {
        "canac       | \"ABCDEF\"       | O CANAC tem 6 dígitos, como 123456.",
        "canac       | \"12345678901\"  | O CANAC tem 6 dígitos, como 123456.",
        "horasTotais | 10000000000      | ",
        "horasTotais | 60000.1          | Use até 60.000 h.",
        "horasTotais | 12.35            | Use até 60.000 h, com no máximo 1 casa decimal.",
        "telefone    | \"abc-xyz\"      | ",
        "email       | \"a@b\"          | Informe um e-mail válido, como nome@empresa.com.br.",
        "validadeCma | \"20271-01-01\"  | "
      })
  @DisplayName("o que não cabe na regra ou na coluna é 400 no próprio campo, não 500")
  void recusaNoCampo(String campo, String valor, String mensagem) throws Exception {
    when(autenticacao.autenticar(TOKEN)).thenReturn(Optional.of(GESTOR));

    ResultActions resposta =
        mockMvc
            .perform(
                put("/aeronaves/1/tripulantes/7")
                    .cookie(new Cookie("aether_sessao", TOKEN))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {"nome":"Marcos Vilela","funcao":"COMANDANTE","situacao":"ATIVO","%s":%s}
                        """
                            .formatted(campo, valor)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.campos." + campo).exists());
    if (mensagem != null) {
      resposta.andExpect(jsonPath("$.campos." + campo).value(mensagem));
    }

    verify(tripulantes, never()).atualizar(any(), any(), any());
  }

  @Test
  @DisplayName("CANAC com máscara passa: o que conta são os seis dígitos")
  void canacComMascaraPassa() throws Exception {
    when(autenticacao.autenticar(TOKEN)).thenReturn(Optional.of(GESTOR));
    when(tripulantes.criar(eq(1L), any())).thenReturn(MARCOS);

    mockMvc
        .perform(
            post("/aeronaves/1/tripulantes")
                .cookie(new Cookie("aether_sessao", TOKEN))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"nome":"Marcos Vilela","canac":"11.22-33","funcao":"COMANDANTE",
                     "horasTotais":60000.0,"telefone":"+55 11 97777-0001",
                     "email":"marcos@exemplo.com.br","situacao":"ATIVO"}
                    """))
        .andExpect(status().isCreated());
  }

  @Test
  @DisplayName("a recusa da janela de validade chega em campos, com o nome do JSON")
  void recusaDoServiceNoCampo() throws Exception {
    when(autenticacao.autenticar(TOKEN)).thenReturn(Optional.of(GESTOR));
    when(tripulantes.criar(eq(1L), any()))
        .thenThrow(
            new TripulanteInvalidoException(
                "validadeCma", "Use uma data de 01/01/2000 a 10/09/2031."));

    mockMvc
        .perform(
            post("/aeronaves/1/tripulantes")
                .cookie(new Cookie("aether_sessao", TOKEN))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"nome":"Marcos Vilela","funcao":"COMANDANTE","validadeCma":"2062-01-01",
                     "situacao":"ATIVO"}
                    """))
        .andExpect(status().isBadRequest())
        .andExpect(
            jsonPath("$.campos.validadeCma").value("Use uma data de 01/01/2000 a 10/09/2031."));
  }

  @Test
  @DisplayName("verbo que a rota não tem é 405, não 500")
  void verboInexistente() throws Exception {
    when(autenticacao.autenticar(TOKEN)).thenReturn(Optional.of(GESTOR));

    mockMvc
        .perform(delete("/aeronaves/1/tripulantes/7").cookie(new Cookie("aether_sessao", TOKEN)))
        .andExpect(status().isMethodNotAllowed());
  }
}
