package br.com.aerodash.aether.autenticacao;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import br.com.aerodash.aether.comum.observabilidade.ContextoDaRequisicao;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("SolicitacaoDeCodigoService")
class SolicitacaoDeCodigoServiceTest {

  private static final Instant AGORA = Instant.parse("2026-09-04T12:00:00Z");
  private static final String EMAIL = "leonardo@administraair.com.br";
  private static final String CODIGO = "519274";
  private static final String HASH_DO_CODIGO = "$2a$12$codigo";
  private static final Duration VALIDADE = Duration.ofMinutes(10);
  private static final int LIMITE = 5;

  @Mock private UsuarioRepository usuarios;
  @Mock private CodigoDeRecuperacaoRepository codigos;
  @Mock private EnviadorDeCodigoDeRecuperacao enviador;
  @Mock private CofreDeSegredos cofre;
  @Mock private ContextoDaRequisicao contexto;

  private SolicitacaoDeCodigoService service;

  @BeforeEach
  void montar() {
    PoliticaDeAcesso politica =
        new PoliticaDeAcesso(
            new PropriedadesDeAutenticacao(
                Duration.ofHours(12),
                LIMITE,
                Duration.ofMinutes(15),
                VALIDADE,
                LIMITE,
                Duration.ofMinutes(1),
                Duration.ofDays(2),
                "http://localhost:5173/entrar",
                "nao-responda@aether.com.br",
                false),
            Clock.fixed(AGORA, ZoneOffset.UTC));
    service =
        new SolicitacaoDeCodigoService(usuarios, codigos, enviador, cofre, politica, contexto);
    when(cofre.novoCodigoDeRecuperacao()).thenReturn(CODIGO);
    when(cofre.codificar(CODIGO)).thenReturn(HASH_DO_CODIGO);
  }

  @Test
  @DisplayName("grava e envia o código para quem está ativo")
  void enviaParaUsuarioAtivo() {
    Usuario usuario = ativo();
    when(usuarios.findByEmail(EMAIL)).thenReturn(Optional.of(usuario));
    when(codigos.findFirstByUsuarioOrderByCriadoEmDesc(usuario)).thenReturn(Optional.empty());

    service.solicitar(EMAIL);

    verify(codigos).save(any(CodigoDeRecuperacao.class));
    verify(enviador).enviar(usuario, CODIGO);
  }

  @Test
  @DisplayName("e-mail desconhecido não falha e não envia nada — a tela não vira consulta")
  void emailDesconhecidoNaoSeDenuncia() {
    when(usuarios.findByEmail(EMAIL)).thenReturn(Optional.empty());

    assertThatCode(() -> service.solicitar(EMAIL)).doesNotThrowAnyException();

    verify(enviador, never()).enviar(any(), anyString());
    verify(codigos, never()).save(any());
    // Sem gastar o tempo do BCrypt que o código novo gastaria, a resposta rápida denunciaria a
    // conta.
    verify(cofre).gastarTempoDeConferencia();
  }

  @Test
  @DisplayName("usuário pendente não recebe código — o caminho dele é o convite")
  void pendenteNaoRecebeCodigo() {
    when(usuarios.findByEmail(EMAIL))
        .thenReturn(Optional.of(new Usuario("Camila", EMAIL, PapelDoUsuario.GESTOR, AGORA)));

    assertThatCode(() -> service.solicitar(EMAIL)).doesNotThrowAnyException();

    verify(enviador, never()).enviar(any(), anyString());
  }

  @Test
  @DisplayName("reenvio antes do intervalo mínimo não dispara outro e-mail")
  void respeitaOIntervaloEntreEnvios() {
    Usuario usuario = ativo();
    when(usuarios.findByEmail(EMAIL)).thenReturn(Optional.of(usuario));
    when(codigos.findFirstByUsuarioOrderByCriadoEmDesc(usuario))
        .thenReturn(Optional.of(new CodigoDeRecuperacao(usuario, HASH_DO_CODIGO, AGORA, VALIDADE)));

    service.solicitar(EMAIL);

    verify(enviador, never()).enviar(any(), anyString());
    verify(codigos, never()).save(any());
    verify(cofre).gastarTempoDeConferencia();
  }

  private static Usuario ativo() {
    Usuario usuario = new Usuario("Leonardo Andrade", EMAIL, PapelDoUsuario.GESTOR, AGORA);
    usuario.definirSenha("$2a$12$hash", AGORA);
    return usuario;
  }
}
