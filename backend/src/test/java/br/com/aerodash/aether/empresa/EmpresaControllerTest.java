package br.com.aerodash.aether.empresa;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
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

@WebMvcTest(EmpresaController.class)
@DisplayName("EmpresaController")
class EmpresaControllerTest {

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
  private static final UsuarioAutenticado GESTOR =
      new UsuarioAutenticado(2L, "Patrícia", PapelDoUsuario.GESTOR);
  private static final EmpresaResponse EMPRESA =
      new EmpresaResponse(
          "Administra Air",
          "Administra Air Gestão de Aeronaves LTDA",
          "19274653000188",
          "contato@administraair.com.br",
          "+55 11 3000-0000",
          30);

  @Autowired private MockMvc mockMvc;

  @MockitoBean private EmpresaService empresa;
  @MockitoBean private AutenticacaoService autenticacao;

  @Test
  @DisplayName("qualquer papel lê os dados da empresa: o nome aparece na interface inteira")
  void qualquerPapelLe() throws Exception {
    when(autenticacao.autenticar(TOKEN)).thenReturn(Optional.of(GESTOR));
    when(empresa.consultar()).thenReturn(EMPRESA);

    mockMvc
        .perform(get("/empresa").cookie(new Cookie("aether_sessao", TOKEN)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.nomeFantasia").value("Administra Air"))
        .andExpect(jsonPath("$.diasDeAviso").value(30));
  }

  @Test
  @DisplayName("só administrador escreve: gestor recebe 403")
  void soAdministradorEscreve() throws Exception {
    when(autenticacao.autenticar(TOKEN)).thenReturn(Optional.of(GESTOR));

    mockMvc
        .perform(
            put("/empresa")
                .cookie(new Cookie("aether_sessao", TOKEN))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"nomeFantasia":"X","razaoSocial":"X LTDA","email":"x@x.com.br",
                     "telefone":"+55 11 3000-0000"}
                    """))
        .andExpect(status().isForbidden());

    verify(empresa, never()).alterarDados(any());
  }

  @Test
  @DisplayName("o administrador altera os dados de contato")
  void administradorAltera() throws Exception {
    when(autenticacao.autenticar(TOKEN)).thenReturn(Optional.of(ADMINISTRADOR));
    when(empresa.alterarDados(any())).thenReturn(EMPRESA);

    mockMvc
        .perform(
            put("/empresa")
                .cookie(new Cookie("aether_sessao", TOKEN))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"nomeFantasia":"Administra Air","razaoSocial":"Administra Air LTDA",
                     "email":"contato@administraair.com.br","telefone":"+55 11 3000-0000"}
                    """))
        .andExpect(status().isOk());
  }

  @Test
  @DisplayName("telefone sem formato e e-mail sem domínio completo voltam cada um no seu campo")
  void telefoneEEmailForaDoFormato() throws Exception {
    when(autenticacao.autenticar(TOKEN)).thenReturn(Optional.of(ADMINISTRADOR));

    alterarDados(
            """
            {"nomeFantasia":"Administra Air","razaoSocial":"Administra Air LTDA",
             "email":"contato@exemplo","telefone":"abc"}
            """)
        .andExpect(status().isBadRequest())
        .andExpect(
            jsonPath("$.campos.email")
                .value("Informe um e-mail completo, como nome@empresa.com.br."))
        .andExpect(
            jsonPath("$.campos.telefone")
                .value(
                    "Use só números, com +, espaço, parênteses ou hífen, como +55 11 98888-0000."));

    verify(empresa, never()).alterarDados(any());
  }

  @Test
  @DisplayName(
      "nome feito de caractere invisível é recusado, e o resto chega sem espaços nas pontas")
  void textosChegamLimpos() throws Exception {
    when(autenticacao.autenticar(TOKEN)).thenReturn(Optional.of(ADMINISTRADOR));
    when(empresa.alterarDados(any())).thenReturn(EMPRESA);

    alterarDados(
            """
            {"nomeFantasia":"\\u200b","razaoSocial":"X LTDA",
             "email":"x@x.com.br","telefone":"+55 11 3000-0000"}
            """)
        .andExpect(status().isBadRequest())
        .andExpect(
            jsonPath("$.campos.nomeFantasia")
                .value("Use letras ou números, e não só espaços ou sinais."));

    alterarDados(
            """
            {"nomeFantasia":"  Administra Air ","razaoSocial":" Administra Air LTDA",
             "email":" contato@administraair.com.br ","telefone":" +55 11 3000-0000 "}
            """)
        .andExpect(status().isOk());

    verify(empresa)
        .alterarDados(
            new AlterarEmpresaRequest(
                "Administra Air",
                "Administra Air LTDA",
                "contato@administraair.com.br",
                "+55 11 3000-0000"));
  }

  @Test
  @DisplayName("aviso ausente pede a antecedência, em vez de dizer \"pelo menos 1 dia\"")
  void avisoAusentePedeAAntecedencia() throws Exception {
    when(autenticacao.autenticar(TOKEN)).thenReturn(Optional.of(ADMINISTRADOR));

    alterarAviso("{}")
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.campos.diasDeAviso").value("Informe a antecedência, em dias."));
    alterarAviso("{\"diasDeAviso\":30.9}")
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.campos.diasDeAviso").value("Informe um número inteiro."));

    verify(empresa, never()).alterarAviso(anyInt());
  }

  @Test
  @DisplayName("aviso fora da faixa é barrado pela validação, antes do service")
  void avisoForaDaFaixaEhBarrado() throws Exception {
    when(autenticacao.autenticar(TOKEN)).thenReturn(Optional.of(ADMINISTRADOR));

    mockMvc
        .perform(
            put("/empresa/aviso-de-vencimento")
                .cookie(new Cookie("aether_sessao", TOKEN))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"diasDeAviso":0}
                    """))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.campos.diasDeAviso").exists());

    verify(empresa, never()).alterarAviso(0);
  }

  private ResultActions alterarDados(String corpo) throws Exception {
    return mockMvc.perform(
        put("/empresa")
            .cookie(new Cookie("aether_sessao", TOKEN))
            .contentType(MediaType.APPLICATION_JSON)
            .content(corpo));
  }

  private ResultActions alterarAviso(String corpo) throws Exception {
    return mockMvc.perform(
        put("/empresa/aviso-de-vencimento")
            .cookie(new Cookie("aether_sessao", TOKEN))
            .contentType(MediaType.APPLICATION_JSON)
            .content(corpo));
  }
}
