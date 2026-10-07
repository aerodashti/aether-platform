package br.com.aerodash.aether.manutencao;

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
import org.springframework.test.web.servlet.ResultActions;

@WebMvcTest(ManutencaoController.class)
@DisplayName("ManutencaoController")
class ManutencaoControllerTest {

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

  @Autowired private MockMvc mockMvc;

  @MockitoBean private ManutencaoService manutencoes;
  @MockitoBean private AutenticacaoService autenticacao;

  @Test
  @DisplayName("qualquer papel vê o painel, com os parâmetros já julgados")
  void qualquerPapelLe() throws Exception {
    when(autenticacao.autenticar(TOKEN)).thenReturn(Optional.of(PILOTO));
    when(manutencoes.painel(1L))
        .thenReturn(
            new PainelDeManutencaoResponse(
                new BigDecimal("3412.5"),
                2890,
                List.of(
                    new ParametroResponse(
                        9L,
                        1L,
                        "Trem de pouso",
                        TipoDeParametro.CICLOS,
                        new BigDecimal("3000"),
                        null,
                        new BigDecimal("200"),
                        new BigDecimal("2890"),
                        new BigDecimal("110"),
                        SituacaoDoParametro.ATENCAO)),
                List.of(),
                List.of()));

    mockMvc
        .perform(get("/manutencoes?aeronave=1").cookie(new Cookie("aether_sessao", TOKEN)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.parametros[0].situacao").value("ATENCAO"))
        .andExpect(jsonPath("$.parametros[0].restante").value(110));
  }

  @Test
  @DisplayName("piloto não agenda manutenção: 403 antes do service")
  void pilotoNaoAgenda() throws Exception {
    when(autenticacao.autenticar(TOKEN)).thenReturn(Optional.of(PILOTO));

    mockMvc
        .perform(
            post("/manutencoes")
                .cookie(new Cookie("aether_sessao", TOKEN))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
        .andExpect(status().isForbidden());

    verify(manutencoes, never()).agendar(any());
  }

  @Test
  @DisplayName("o gestor agenda e recebe 201")
  void gestorAgenda() throws Exception {
    when(autenticacao.autenticar(TOKEN)).thenReturn(Optional.of(GESTOR));
    when(manutencoes.agendar(any()))
        .thenReturn(
            new ManutencaoResponse(
                5L,
                1L,
                LocalDate.parse("2026-09-22"),
                null,
                null,
                "Inspeção de 100 h",
                null,
                StatusDaManutencao.PROGRAMADA,
                null));

    mockMvc
        .perform(
            post("/manutencoes")
                .cookie(new Cookie("aether_sessao", TOKEN))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"aeronaveId":1,"data":"2026-09-22","descricao":"Inspeção de 100 h"}
                    """))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.status").value("PROGRAMADA"));
  }

  @Test
  @DisplayName("sem data nem descrição a validação barra antes do service")
  void validacaoBarra() throws Exception {
    when(autenticacao.autenticar(TOKEN)).thenReturn(Optional.of(GESTOR));

    mockMvc
        .perform(
            post("/manutencoes")
                .cookie(new Cookie("aether_sessao", TOKEN))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"aeronaveId":1}
                    """))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.campos.data").exists())
        .andExpect(jsonPath("$.campos.descricao").exists());
  }

  private ResultActions postar(String caminho, String corpo) throws Exception {
    when(autenticacao.autenticar(TOKEN)).thenReturn(Optional.of(GESTOR));
    return mockMvc.perform(
        post(caminho)
            .cookie(new Cookie("aether_sessao", TOKEN))
            .contentType(MediaType.APPLICATION_JSON)
            .content(corpo));
  }

  @Test
  @DisplayName("valor com casa a mais ou maior que a coluna é 400 no campo, não 500")
  void valorForaDaColuna() throws Exception {
    postar(
            "/manutencoes",
            """
            {"aeronaveId":1,"data":"2026-09-22","descricao":"Inspeção","valor":0.001}
            """)
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.campos.valor").value(ManutencaoRequest.MENSAGEM_DO_VALOR));
    postar(
            "/manutencoes",
            """
            {"aeronaveId":1,"data":"2026-09-22","descricao":"Inspeção","valor":10000000000000}
            """)
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.campos.valor").exists());
    verify(manutencoes, never()).agendar(any());
  }

  @Test
  @DisplayName("descrição só de espaço não separável é recusada como vazia")
  void descricaoEmBranco() throws Exception {
    postar(
            "/manutencoes",
            """
            {"aeronaveId":1,"data":"2026-09-22","descricao":"\u00a0\u00a0"}
            """)
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.campos.descricao").value("Informe a descrição."));
  }

  @Test
  @DisplayName("limite e aviso fora de NUMERIC(10,1) são 400 no campo")
  void limiteEAvisoForaDaColuna() throws Exception {
    postar(
            "/manutencoes/parametros",
            """
            {"aeronaveId":1,"nome":"Célula","tipo":"HORAS","limite":0.01,"aviso":10000000000}
            """)
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.campos.limite").value(ParametroRequest.MENSAGEM_DO_LIMITE))
        .andExpect(jsonPath("$.campos.aviso").value(ParametroRequest.MENSAGEM_DO_AVISO));
    verify(manutencoes, never()).criarParametro(any());
  }

  @Test
  @DisplayName("concluir exige o dia da conclusão")
  void conclusaoSemData() throws Exception {
    postar("/manutencoes/5/conclusao", "{}")
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.campos.concluidaEm").value("Informe a data da conclusão."));
  }

  @Test
  @DisplayName("o nome repetido volta 409 com o campo nome")
  void nomeRepetido() throws Exception {
    when(manutencoes.criarParametro(any())).thenThrow(new ParametroDuplicadoException());

    postar(
            "/manutencoes/parametros",
            """
            {"aeronaveId":1,"nome":"Célula","tipo":"HORAS","limite":4000,"aviso":100}
            """)
        .andExpect(status().isConflict())
        .andExpect(
            jsonPath("$.campos.nome")
                .value("Já existe um parâmetro com este nome nesta aeronave."));
  }
}
