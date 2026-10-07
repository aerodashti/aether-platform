package br.com.aerodash.aether.participacao;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
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
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
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

@WebMvcTest(SaidaDeProprietarioController.class)
@DisplayName("SaidaDeProprietarioController")
class SaidaDeProprietarioControllerTest {

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

  @Autowired private MockMvc mockMvc;

  @MockitoBean private SaidaDeProprietarioService saidas;
  @MockitoBean private AutenticacaoService autenticacao;

  @BeforeEach
  void entrar() {
    when(autenticacao.autenticar(TOKEN)).thenReturn(Optional.of(GESTOR));
  }

  private ResultActions sair(String corpo) throws Exception {
    return mockMvc.perform(
        post("/proprietarios/3/saida")
            .cookie(new Cookie("aether_sessao", TOKEN))
            .contentType(MediaType.APPLICATION_JSON)
            .content(corpo));
  }

  @Test
  @DisplayName("a saída completa chega ao service com quem salvou vindo da sessão")
  void saidaCompleta() throws Exception {
    sair("""
            {"contratos":[{"aeronaveId":1,"contratoVigenteId":10,
              "participacoes":[{"proprietarioId":1,"percentual":100}]}]}
            """)
        .andExpect(status().isNoContent());

    verify(saidas).sair(eq(3L), any(), eq("Patrícia"));
  }

  @Test
  @DisplayName("contrato nulo na lista é 400 no campo dele, não 500")
  void contratoNuloEh400() throws Exception {
    sair("""
        {"contratos":[null]}
        """)
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.campos['contratos[0]']").value("Informe o contrato novo."));

    verify(saidas, never()).sair(any(), any(), any());
  }

  @Test
  @DisplayName("participação nula ou lista vazia são recusadas no campo, como na definição direta")
  void participacoesVaziasOuNulasSao400() throws Exception {
    sair("""
            {"contratos":[{"aeronaveId":1,"contratoVigenteId":10,"participacoes":[null]}]}
            """)
        .andExpect(status().isBadRequest())
        .andExpect(
            jsonPath("$.campos['contratos[0].participacoes[0]']").value("Informe a participação."));

    sair("""
            {"contratos":[{"aeronaveId":1,"contratoVigenteId":10,"participacoes":[]}]}
            """)
        .andExpect(status().isBadRequest())
        .andExpect(
            jsonPath("$.campos['contratos[0].participacoes']")
                .value("O contrato precisa de ao menos um proprietário."));

    verify(saidas, never()).sair(any(), any(), any());
  }

  @Test
  @DisplayName("sem o contrato vigente em que se baseou, a saída é recusada antes do service")
  void exigeOContratoVigente() throws Exception {
    sair("""
            {"contratos":[{"aeronaveId":1,
              "participacoes":[{"proprietarioId":1,"percentual":100}]}]}
            """)
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.campos['contratos[0].contratoVigenteId']").exists());

    verify(saidas, never()).sair(any(), any(), any());
  }
}
