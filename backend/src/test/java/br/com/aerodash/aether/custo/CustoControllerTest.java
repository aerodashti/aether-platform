package br.com.aerodash.aether.custo;

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

@WebMvcTest(CustoController.class)
@DisplayName("CustoController")
class CustoControllerTest {

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

  private static final CustoResponse LANCAMENTO =
      new CustoResponse(
          5L,
          1L,
          "PS-MEP",
          TipoDeCusto.VARIAVEL,
          CategoriaDeCusto.ABASTECIMENTO,
          LocalDate.parse("2026-09-08"),
          "Jet A-1",
          "RV-2026-041",
          7L,
          "Ricardo Meirelles",
          null,
          false,
          "NF 88.213",
          MoedaDoCusto.BRL,
          null,
          null,
          new BigDecimal("15725.00"));

  @Autowired private MockMvc mockMvc;

  @MockitoBean private CustoService custos;
  @MockitoBean private AutenticacaoService autenticacao;

  @Test
  @DisplayName("qualquer papel lê os lançamentos: o proprietário vê o que paga")
  void qualquerPapelLe() throws Exception {
    when(autenticacao.autenticar(TOKEN)).thenReturn(Optional.of(PILOTO));
    when(custos.listar(any(), any()))
        .thenReturn(
            new LancamentosResponse(
                List.of(LANCAMENTO),
                new LancamentosResponse.TotaisDosLancamentos(
                    BigDecimal.ZERO, new BigDecimal("15725.00"), new BigDecimal("15725.00"))));

    mockMvc
        .perform(get("/custos?competencia=2026-09").cookie(new Cookie("aether_sessao", TOKEN)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.custos[0].categoria").value("ABASTECIMENTO"))
        .andExpect(jsonPath("$.totais.total").value(15725.00));
  }

  @Test
  @DisplayName("piloto não lança custo: 403 antes do service")
  void pilotoNaoLanca() throws Exception {
    when(autenticacao.autenticar(TOKEN)).thenReturn(Optional.of(PILOTO));

    mockMvc
        .perform(
            post("/custos")
                .cookie(new Cookie("aether_sessao", TOKEN))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
        .andExpect(status().isForbidden());

    verify(custos, never()).criar(any());
  }

  @Test
  @DisplayName("o gestor lança e recebe 201")
  void gestorLanca() throws Exception {
    when(autenticacao.autenticar(TOKEN)).thenReturn(Optional.of(GESTOR));
    when(custos.criar(any())).thenReturn(LANCAMENTO);

    mockMvc
        .perform(
            post("/custos")
                .cookie(new Cookie("aether_sessao", TOKEN))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"aeronaveId":1,"categoria":"ABASTECIMENTO","data":"2026-09-08",
                     "descricao":"Jet A-1","moeda":"BRL","valor":15725.00}
                    """))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.id").value(5));
  }

  @Test
  @DisplayName("sem categoria nem valor a validação barra antes do service")
  void validacaoBarra() throws Exception {
    when(autenticacao.autenticar(TOKEN)).thenReturn(Optional.of(GESTOR));

    mockMvc
        .perform(
            post("/custos")
                .cookie(new Cookie("aether_sessao", TOKEN))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"aeronaveId":1,"data":"2026-09-08","descricao":"x","moeda":"BRL"}
                    """))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.campos.categoria").exists())
        .andExpect(jsonPath("$.campos.valor").exists());

    verify(custos, never()).criar(any());
  }
}
