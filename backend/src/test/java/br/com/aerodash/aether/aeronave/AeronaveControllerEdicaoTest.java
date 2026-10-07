package br.com.aerodash.aether.aeronave;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
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

/** As três edições do detalhe: os limites das colunas e a trava dos contadores. */
@WebMvcTest(AeronaveController.class)
@DisplayName("AeronaveController — edições do detalhe")
class AeronaveControllerEdicaoTest {

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
  private static final UsuarioAutenticado ADMINISTRADOR =
      new UsuarioAutenticado(1L, "Leonardo", PapelDoUsuario.ADMINISTRADOR);

  @Autowired private MockMvc mockMvc;

  @MockitoBean private AeronaveService aeronaves;
  @MockitoBean private AutenticacaoService autenticacao;

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
