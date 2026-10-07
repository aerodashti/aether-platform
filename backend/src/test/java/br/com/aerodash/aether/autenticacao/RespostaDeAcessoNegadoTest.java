package br.com.aerodash.aether.autenticacao;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import br.com.aerodash.aether.comum.observabilidade.ContextoDaRequisicao;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.access.AccessDeniedException;

@DisplayName("RespostaDeAcessoNegado")
class RespostaDeAcessoNegadoTest {

  @Test
  @DisplayName("o 403 não nomeia o papel que faltou: vale para rota de administrador e de gestor")
  void recusaComMensagemNeutra() throws Exception {
    RespostaDeAcessoNegado resposta =
        new RespostaDeAcessoNegado(new ObjectMapper(), mock(ContextoDaRequisicao.class));
    MockHttpServletResponse servlet = new MockHttpServletResponse();

    resposta.handle(new MockHttpServletRequest(), servlet, new AccessDeniedException("negado"));

    assertThat(servlet.getStatus()).isEqualTo(403);
    assertThat(servlet.getContentAsString(StandardCharsets.UTF_8))
        .contains("Seu perfil não tem permissão para esta ação.")
        .doesNotContain("administradores");
  }
}
