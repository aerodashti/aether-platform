package br.com.aerodash.aether.aeronave;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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

@WebMvcTest(AeronaveController.class)
@DisplayName("AeronaveController")
class AeronaveControllerTest {

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
      new UsuarioAutenticado(9L, "Rubens Salvador", PapelDoUsuario.PROPRIETARIO);

  @Autowired private MockMvc mockMvc;

  @MockitoBean private AeronaveService aeronaves;
  @MockitoBean private AutenticacaoService autenticacao;

  @Test
  @DisplayName("sem sessão responde 401 — a frota não é pública")
  void semSessaoResponde401() throws Exception {
    mockMvc.perform(get("/aeronaves")).andExpect(status().isUnauthorized());
  }

  @Test
  @DisplayName("qualquer papel vê a frota: ela é o chão da operação, não área restrita")
  void qualquerPapelVeAFrota() throws Exception {
    when(autenticacao.autenticar(TOKEN)).thenReturn(Optional.of(PROPRIETARIO));
    when(aeronaves.listar())
        .thenReturn(
            List.of(
                new AeronaveResponse(
                    1L,
                    "PS-MEP",
                    "Cessna Citation XLS+",
                    "SBSP",
                    SituacaoRegular.ATENCAO,
                    DocumentoDaAeronave.RETA,
                    LocalDate.of(2026, 9, 21),
                    12,
                    true)));

    mockMvc
        .perform(get("/aeronaves").cookie(new Cookie("aether_sessao", TOKEN)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].matricula").value("PS-MEP"))
        .andExpect(jsonPath("$[0].situacaoRegular").value("ATENCAO"))
        .andExpect(jsonPath("$[0].documentoDoProximoVencimento").value("RETA"))
        .andExpect(jsonPath("$[0].diasAteOProximoVencimento").value(12))
        .andExpect(jsonPath("$[0].podeVoar").value(true));
  }

  @Test
  @DisplayName("proprietário não edita a ficha técnica: 403 antes do service")
  void proprietarioNaoEditaFicha() throws Exception {
    when(autenticacao.autenticar(TOKEN)).thenReturn(Optional.of(PROPRIETARIO));

    mockMvc
        .perform(
            put("/aeronaves/1/ficha-tecnica")
                .cookie(new Cookie("aether_sessao", TOKEN))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"modelo":"Citation XLS+","base":"SBSP"}
                    """))
        .andExpect(status().isForbidden());
  }

  @Test
  @DisplayName("corrigir contadores é de administrador: gestor recebe 403")
  void gestorNaoCorrigeContadores() throws Exception {
    when(autenticacao.autenticar(TOKEN))
        .thenReturn(Optional.of(new UsuarioAutenticado(2L, "Patrícia", PapelDoUsuario.GESTOR)));

    mockMvc
        .perform(
            put("/aeronaves/1/contadores")
                .cookie(new Cookie("aether_sessao", TOKEN))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"horasDeCelula":3412.5,"ciclos":2890,"kmVoados":1482300}
                    """))
        .andExpect(status().isForbidden());
  }

  @Test
  @DisplayName("o administrador corrige contadores; negativo é barrado pela validação")
  void administradorCorrigeContadores() throws Exception {
    UsuarioAutenticado administrador =
        new UsuarioAutenticado(1L, "Leonardo", PapelDoUsuario.ADMINISTRADOR);
    when(autenticacao.autenticar(TOKEN)).thenReturn(Optional.of(administrador));

    mockMvc
        .perform(
            put("/aeronaves/1/contadores")
                .cookie(new Cookie("aether_sessao", TOKEN))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"horasDeCelula":-1,"ciclos":2890,"kmVoados":1482300}
                    """))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.campos.horasDeCelula").exists());
  }
}
