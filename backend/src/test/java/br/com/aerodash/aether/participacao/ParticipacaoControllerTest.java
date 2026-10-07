package br.com.aerodash.aether.participacao;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.startsWith;
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
import br.com.aerodash.aether.proprietario.CorDeIdentificacao;
import io.opentelemetry.api.OpenTelemetry;
import jakarta.servlet.http.Cookie;
import java.math.BigDecimal;
import java.time.Instant;
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

@WebMvcTest(ParticipacaoController.class)
@DisplayName("ParticipacaoController")
class ParticipacaoControllerTest {

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
      new UsuarioAutenticado(9L, "Rubens", PapelDoUsuario.PROPRIETARIO);

  private static final ContratosDaAeronaveResponse CONTRATOS =
      new ContratosDaAeronaveResponse(
          new ContratosDaAeronaveResponse.ContratoResponse(
              10L,
              Instant.parse("2026-07-01T12:00:00Z"),
              null,
              "Leonardo Andrade",
              List.of(
                  new ContratosDaAeronaveResponse.ParticipacaoResponse(
                      1L,
                      "Ricardo Meirelles",
                      CorDeIdentificacao.PETROLEO,
                      new BigDecimal("60.00")))),
          List.of());

  @Autowired private MockMvc mockMvc;

  @MockitoBean private ParticipacaoService participacoes;
  @MockitoBean private AutenticacaoService autenticacao;

  @Test
  @DisplayName("qualquer papel lê o contrato: o proprietário vê o que é dele")
  void qualquerPapelLe() throws Exception {
    when(autenticacao.autenticar(TOKEN)).thenReturn(Optional.of(PROPRIETARIO));
    when(participacoes.consultar(1L)).thenReturn(CONTRATOS);

    mockMvc
        .perform(get("/aeronaves/1/contratos").cookie(new Cookie("aether_sessao", TOKEN)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.vigente.criadoPor").value("Leonardo Andrade"))
        .andExpect(jsonPath("$.vigente.participacoes[0].percentual").value(60.00));
  }

  @Test
  @DisplayName("proprietário não define contrato: 403 antes do service")
  void proprietarioNaoEscreve() throws Exception {
    when(autenticacao.autenticar(TOKEN)).thenReturn(Optional.of(PROPRIETARIO));

    mockMvc
        .perform(
            post("/aeronaves/1/contratos")
                .cookie(new Cookie("aether_sessao", TOKEN))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"participacoes":[{"proprietarioId":1,"percentual":100.00}]}
                    """))
        .andExpect(status().isForbidden());

    verify(participacoes, never()).definir(any(), any(), any());
  }

  @Test
  @DisplayName("o gestor define, e o nome de quem salvou vem da sessão, não do corpo")
  void gestorDefine() throws Exception {
    when(autenticacao.autenticar(TOKEN)).thenReturn(Optional.of(GESTOR));
    when(participacoes.definir(eq(1L), any(), eq("Patrícia"))).thenReturn(CONTRATOS);

    mockMvc
        .perform(
            post("/aeronaves/1/contratos")
                .cookie(new Cookie("aether_sessao", TOKEN))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"participacoes":[{"proprietarioId":1,"percentual":100.00}]}
                    """))
        .andExpect(status().isOk());

    verify(participacoes).definir(eq(1L), any(), eq("Patrícia"));
  }

  @Test
  @DisplayName("participação zerada é barrada pela validação, antes do service")
  void percentualZeradoEhBarrado() throws Exception {
    when(autenticacao.autenticar(TOKEN)).thenReturn(Optional.of(GESTOR));

    mockMvc
        .perform(
            post("/aeronaves/1/contratos")
                .cookie(new Cookie("aether_sessao", TOKEN))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"participacoes":[{"proprietarioId":1,"percentual":0}]}
                    """))
        .andExpect(status().isBadRequest());

    verify(participacoes, never()).definir(any(), any(), any());
  }

  private ResultActions definir(String corpo) throws Exception {
    when(autenticacao.autenticar(TOKEN)).thenReturn(Optional.of(GESTOR));
    return mockMvc.perform(
        post("/aeronaves/1/contratos")
            .cookie(new Cookie("aether_sessao", TOKEN))
            .contentType(MediaType.APPLICATION_JSON)
            .content(corpo));
  }

  @Test
  @DisplayName("participação nula na lista é 400 no campo dela, não 500")
  void participacaoNulaEh400() throws Exception {
    definir(
            """
            {"participacoes":[null]}
            """)
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.campos['participacoes[0]']").value("Informe a participação."));

    verify(participacoes, never()).definir(any(), any(), any());
  }

  @Test
  @DisplayName("participação acima de 100 diz o limite, não as casas decimais")
  void percentualAcimaDeCemDizOLimite() throws Exception {
    definir(
            """
            {"participacoes":[{"proprietarioId":1,"percentual":1000}]}
            """)
        .andExpect(status().isBadRequest())
        .andExpect(
            jsonPath("$.campos['participacoes[0].percentual']")
                .value(startsWith("A participação vai até 100%")));
  }

  @Test
  @DisplayName("três casas decimais são recusadas no campo da linha")
  void tresCasasSaoRecusadas() throws Exception {
    definir(
            """
            {"participacoes":[{"proprietarioId":1,"percentual":33.333},
                              {"proprietarioId":2,"percentual":66.667}]}
            """)
        .andExpect(status().isBadRequest())
        .andExpect(
            jsonPath("$.campos['participacoes[1].percentual']")
                .value("A participação vai até 100%, com no máximo duas casas decimais."));
  }

  @Test
  @DisplayName("a edição que perdeu a corrida para outro contrato recebe 409")
  void edicaoDesatualizadaEh409() throws Exception {
    when(participacoes.definir(eq(1L), any(), eq("Patrícia")))
        .thenThrow(new ContratoDesatualizadoException("PS-MEP"));

    definir(
            """
            {"participacoes":[{"proprietarioId":1,"percentual":100}],"contratoVigenteId":9}
            """)
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.detail").value(containsString("PS-MEP")));
  }
}
