package br.com.aerodash.aether.troca;

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

@WebMvcTest(TrocaController.class)
@DisplayName("TrocaController")
class TrocaControllerTest {

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
  private static final UsuarioAutenticado GESTOR =
      new UsuarioAutenticado(2L, "Patrícia", PapelDoUsuario.GESTOR);

  /** Uma troca válida com um trecho trocado no lugar de {@code %s}. */
  private static String trocaCom(String campos) {
    return """
        {"aeronaveId":1,"data":"2026-09-20","cedenteId":1,"recebedorId":2,%s}
        """
        .formatted(campos);
  }

  @Autowired private MockMvc mockMvc;

  @MockitoBean private TrocaService trocas;
  @MockitoBean private AutenticacaoService autenticacao;

  @Test
  @DisplayName("o proprietário lê as trocas, e a situação chega como enum")
  void proprietarioLe() throws Exception {
    when(autenticacao.autenticar(TOKEN)).thenReturn(Optional.of(PROPRIETARIO));
    when(trocas.listar(null, 7L, SituacaoDaTroca.CONCLUIDA))
        .thenReturn(new TrocasResponse(List.of(), 2, 0, null));

    mockMvc
        .perform(
            get("/trocas?proprietario=7&situacao=CONCLUIDA")
                .cookie(new Cookie("aether_sessao", TOKEN)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.pendentes").value(2));
  }

  @Test
  @DisplayName("o proprietário não conclui troca: 403 antes do service")
  void proprietarioNaoConclui() throws Exception {
    when(autenticacao.autenticar(TOKEN)).thenReturn(Optional.of(PROPRIETARIO));

    mockMvc
        .perform(post("/trocas/5/conclusao").cookie(new Cookie("aether_sessao", TOKEN)))
        .andExpect(status().isForbidden());
    verify(trocas, never()).concluir(any(), any());
  }

  @Test
  @DisplayName("horas, KM e R$/hora fora da coluna voltam 400 no campo, com o limite na mensagem")
  void numerosForaDaColuna() throws Exception {
    when(autenticacao.autenticar(TOKEN)).thenReturn(Optional.of(GESTOR));

    for (String corpo :
        List.of(
            trocaCom("\"horas\":0.04,\"km\":1320.05,\"valorPorHora\":0.001"),
            trocaCom("\"horas\":100000,\"km\":1000000000,\"valorPorHora\":10000000000"))) {
      mockMvc
          .perform(
              post("/trocas")
                  .cookie(new Cookie("aether_sessao", TOKEN))
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(corpo))
          .andExpect(status().isBadRequest())
          .andExpect(jsonPath("$.campos.horas").value(TrocaRequest.MENSAGEM_DAS_HORAS))
          .andExpect(jsonPath("$.campos.km").value(TrocaRequest.MENSAGEM_DO_KM))
          .andExpect(
              jsonPath("$.campos.valorPorHora").value(TrocaRequest.MENSAGEM_DO_VALOR_POR_HORA));
    }
    verify(trocas, never()).registrar(any());
  }

  @Test
  @DisplayName("mais de 1.000 horas numa troca é dígito a mais: 400 no campo horas")
  void horasAcimaDoTeto() throws Exception {
    when(autenticacao.autenticar(TOKEN)).thenReturn(Optional.of(GESTOR));

    mockMvc
        .perform(
            post("/trocas")
                .cookie(new Cookie("aether_sessao", TOKEN))
                .contentType(MediaType.APPLICATION_JSON)
                .content(trocaCom("\"horas\":1000.1")))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.campos.horas").value(TrocaRequest.MENSAGEM_DAS_HORAS));
    verify(trocas, never()).registrar(any());
  }

  @Test
  @DisplayName("caractere de controle no texto volta 400 no campo, em vez de 500 do banco")
  void caractereDeControle() throws Exception {
    when(autenticacao.autenticar(TOKEN)).thenReturn(Optional.of(GESTOR));

    mockMvc
        .perform(
            post("/trocas")
                .cookie(new Cookie("aether_sessao", TOKEN))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    trocaCom(
                        "\"horas\":2.5,\"relatorioDeVoo\":\"RV\\u0000\","
                            + "\"observacao\":\"Traslado\\u0000x\"")))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.campos.relatorioDeVoo").value(TrocaRequest.MENSAGEM_DE_CONTROLE))
        .andExpect(jsonPath("$.campos.observacao").value(TrocaRequest.MENSAGEM_DE_CONTROLE));
    verify(trocas, never()).registrar(any());
  }

  @Test
  @DisplayName("a observação aceita quebra de linha")
  void observacaoComQuebraDeLinha() throws Exception {
    when(autenticacao.autenticar(TOKEN)).thenReturn(Optional.of(GESTOR));

    mockMvc
        .perform(
            post("/trocas")
                .cookie(new Cookie("aether_sessao", TOKEN))
                .contentType(MediaType.APPLICATION_JSON)
                .content(trocaCom("\"horas\":2.5,\"observacao\":\"Ida\\nVolta\"")))
        .andExpect(status().isCreated());
  }

  @Test
  @DisplayName("ano de cinco dígitos volta 400 no campo data, não corpo ilegível")
  void anoDeCincoDigitos() throws Exception {
    when(autenticacao.autenticar(TOKEN)).thenReturn(Optional.of(GESTOR));

    mockMvc
        .perform(
            post("/trocas")
                .cookie(new Cookie("aether_sessao", TOKEN))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"aeronaveId":1,"data":"20261-01-01","cedenteId":1,"recebedorId":2,"horas":2.5}
                    """))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.campos.data").exists());
  }

  @Test
  @DisplayName("a recusa de regra chega em campos, com o nome do campo do JSON")
  void recusaDeRegraNoCampo() throws Exception {
    when(autenticacao.autenticar(TOKEN)).thenReturn(Optional.of(GESTOR));
    when(trocas.registrar(any()))
        .thenThrow(
            new TrocaInvalidaException(
                "Quem cede e quem recebe precisam ser proprietários diferentes.", "recebedorId"));

    mockMvc
        .perform(
            post("/trocas")
                .cookie(new Cookie("aether_sessao", TOKEN))
                .contentType(MediaType.APPLICATION_JSON)
                .content(trocaCom("\"horas\":2.5")))
        .andExpect(status().isBadRequest())
        .andExpect(
            jsonPath("$.campos.recebedorId")
                .value("Quem cede e quem recebe precisam ser proprietários diferentes."));
  }

  @Test
  @DisplayName("concluir pede a data da devolução: sem ela, 400 no campo concluidaEm")
  void concluirSemData() throws Exception {
    when(autenticacao.autenticar(TOKEN)).thenReturn(Optional.of(GESTOR));

    mockMvc
        .perform(
            post("/trocas/5/conclusao")
                .cookie(new Cookie("aether_sessao", TOKEN))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.campos.concluidaEm").value("Informe a data da devolução."));
    verify(trocas, never()).concluir(any(), any());
  }
}
