package br.com.aerodash.aether.documento;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
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
import java.nio.charset.StandardCharsets;
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
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(DocumentoController.class)
@DisplayName("DocumentoController")
class DocumentoControllerTest {

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
  private static final Cookie SESSAO = new Cookie("aether_sessao", TOKEN);
  private static final MockMultipartFile PDF =
      new MockMultipartFile(
          "arquivos", "CVA.pdf", "application/pdf", "%PDF-1.7".getBytes(StandardCharsets.US_ASCII));

  @Autowired private MockMvc mockMvc;

  @MockitoBean private DocumentoService documentos;
  @MockitoBean private AutenticacaoService autenticacao;

  @BeforeEach
  void entrarComoGestor() {
    when(autenticacao.autenticar(TOKEN))
        .thenReturn(Optional.of(new UsuarioAutenticado(2L, "Patrícia", PapelDoUsuario.GESTOR)));
  }

  @Test
  @DisplayName("a recusa do envio chega no campo arquivos, para a tela marcá-lo")
  void recusaNoCampo() throws Exception {
    when(documentos.enviar(eq(1L), anyList(), eq("Patrícia")))
        .thenThrow(new DocumentoInvalidoException("Envie até 10 arquivos por vez."));

    mockMvc
        .perform(multipart("/aeronaves/1/documentos").file(PDF).cookie(SESSAO))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.campos.arquivos").value("Envie até 10 arquivos por vez."));
  }

  @Test
  @DisplayName("sem a parte arquivos, 400 dizendo o nome dela; corpo JSON, 415 — nunca 500")
  void multipartMalformado() throws Exception {
    mockMvc
        .perform(
            multipart("/aeronaves/1/documentos")
                .file(
                    new MockMultipartFile(
                        "arquivo",
                        "CVA.pdf",
                        "application/pdf",
                        "%PDF-1.7".getBytes(StandardCharsets.US_ASCII)))
                .cookie(SESSAO))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.detail").value("Envie os arquivos no campo \"arquivos\"."));

    mockMvc
        .perform(
            post("/aeronaves/1/documentos")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}")
                .cookie(SESSAO))
        .andExpect(status().isUnsupportedMediaType());

    verify(documentos, never()).enviar(any(), any(), any());
  }

  @Test
  @DisplayName("o proprietário lê, mas não envia")
  void proprietarioNaoEnvia() throws Exception {
    when(autenticacao.autenticar(TOKEN))
        .thenReturn(Optional.of(new UsuarioAutenticado(4L, "Rubens", PapelDoUsuario.PROPRIETARIO)));

    mockMvc
        .perform(multipart("/aeronaves/1/documentos").file(PDF).cookie(SESSAO))
        .andExpect(status().isForbidden());
    verify(documentos, never()).enviar(any(), any(), any());
  }
}
