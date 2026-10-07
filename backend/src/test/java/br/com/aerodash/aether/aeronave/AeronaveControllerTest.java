package br.com.aerodash.aether.aeronave;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
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
  private static final UsuarioAutenticado ADMINISTRADOR =
      new UsuarioAutenticado(1L, "Leonardo", PapelDoUsuario.ADMINISTRADOR);

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
                    true,
                    List.of(
                        new PendenciaResponse(
                            "Trem de pouso perto do limite", SituacaoRegular.ATENCAO)))));

    mockMvc
        .perform(get("/aeronaves").cookie(new Cookie("aether_sessao", TOKEN)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].matricula").value("PS-MEP"))
        .andExpect(jsonPath("$[0].pendencias[0].descricao").value("Trem de pouso perto do limite"))
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

  @Test
  @DisplayName("proprietário não cadastra aeronave: 403 antes do service")
  void proprietarioNaoCadastra() throws Exception {
    when(autenticacao.autenticar(TOKEN)).thenReturn(Optional.of(PROPRIETARIO));

    mockMvc
        .perform(
            post("/aeronaves")
                .cookie(new Cookie("aether_sessao", TOKEN))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
        .andExpect(status().isForbidden());
  }

  @Test
  @DisplayName("matrícula fora do padrão do RAB é barrada pela validação")
  void matriculaForaDoPadrao() throws Exception {
    when(autenticacao.autenticar(TOKEN))
        .thenReturn(Optional.of(new UsuarioAutenticado(2L, "Patrícia", PapelDoUsuario.GESTOR)));

    mockMvc
        .perform(
            post("/aeronaves")
                .cookie(new Cookie("aether_sessao", TOKEN))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"matricula":"N123AB","modelo":"G280","base":"KTEB",
                     "vencimentoCva":"2027-06-01","vencimentoReta":"2027-08-01",
                     "contadores":{"horasDeCelula":0,"ciclos":0,"kmVoados":0},
                     "configuracaoFinanceira":{"baseDoRateio":"POR_USO","modeloDeAporte":"FIXO",
                       "periodicidadeDoAporteMeses":1,"diaDeFechamento":1,"saldoDeAbertura":0}}
                    """))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.campos.matricula").exists());
  }

  @ParameterizedTest(name = "PUT {0} recusa o que a tela recusa, em campos.{2}")
  @DisplayName("os limites da tela se repetem no servidor, com o campo nomeado")
  @CsvSource(
      delimiter = '|',
      textBlock =
          """
          ficha-tecnica | {"modelo":"PC-12","base":"SBPS","pesoMaxDecolagemKg":5.67} \
            | pesoMaxDecolagemKg
          ficha-tecnica | {"modelo":"PC-12","base":"SBPS","pesoMaxPousoKg":600001} | pesoMaxPousoKg
          ficha-tecnica | {"modelo":"PC-12","base":"SBPS","pesoMaxPousoKg":3000000000} \
            | pesoMaxPousoKg
          contadores | {"horasDeCelula":1234.56,"ciclos":1,"kmVoados":0} | horasDeCelula
          contadores | {"horasDeCelula":0,"ciclos":12.5,"kmVoados":0} | ciclos
          contadores | {"horasDeCelula":0,"ciclos":1,"kmVoados":1E12} | kmVoados
          configuracao-financeira | {"baseDoRateio":"POR_USO","modeloDeAporte":"FIXO", \
            "periodicidadeDoAporteMeses":1,"diaDeFechamento":5,"saldoDeAbertura":1E13} \
            | saldoDeAbertura
          configuracao-financeira | {"baseDoRateio":"POR_USO","modeloDeAporte":"FIXO", \
            "periodicidadeDoAporteMeses":1,"valorDoAporte":1.239,"diaDeFechamento":5, \
            "saldoDeAbertura":0} | valorDoAporte
          configuracao-financeira | {"baseDoRateio":"POR_USO","modeloDeAporte":"FIXO", \
            "periodicidadeDoAporteMeses":1,"diaDeFechamento":28.9,"saldoDeAbertura":0} \
            | diaDeFechamento
          """)
  void limitesNoServidor(String rota, String corpo, String campo) throws Exception {
    when(autenticacao.autenticar(TOKEN)).thenReturn(Optional.of(ADMINISTRADOR));

    mockMvc
        .perform(
            put("/aeronaves/1/" + rota)
                .cookie(new Cookie("aether_sessao", TOKEN))
                .contentType(MediaType.APPLICATION_JSON)
                .content(corpo))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.campos." + campo).exists());
  }

  @Test
  @DisplayName("contadores que mudaram desde a leitura voltam como 409, sem campo")
  void contadoresDesatualizadosSao409() throws Exception {
    when(autenticacao.autenticar(TOKEN)).thenReturn(Optional.of(ADMINISTRADOR));
    when(aeronaves.corrigirContadores(eq(1L), any()))
        .thenThrow(new ContadoresDesatualizadosException());

    mockMvc
        .perform(
            put("/aeronaves/1/contadores")
                .cookie(new Cookie("aether_sessao", TOKEN))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"horasDeCelula":3500,"ciclos":2950,"kmVoados":1500000,
                     "lidos":{"horasDeCelula":3412.5,"ciclos":2890,"kmVoados":1482300}}
                    """))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.title").value("Contadores desatualizados"))
        .andExpect(jsonPath("$.campos").doesNotExist());
  }
}
