package br.com.aerodash.aether.autenticacao;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
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
import java.util.List;
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
@DisplayName("RecuperacaoDeSenhaService")
class RecuperacaoDeSenhaServiceTest {

  private static final Instant AGORA = Instant.parse("2026-09-04T12:00:00Z");
  private static final String EMAIL = "leonardo@administraair.com.br";
  private static final String CODIGO = "519274";
  private static final String HASH_DO_CODIGO = "$2a$12$codigo";
  private static final Duration VALIDADE = Duration.ofMinutes(10);
  private static final int LIMITE = 5;

  @Mock private UsuarioRepository usuarios;
  @Mock private CodigoDeRecuperacaoRepository codigos;
  @Mock private SessaoDeAcessoRepository sessoes;
  @Mock private EnviadorDeCodigoDeRecuperacao enviador;
  @Mock private CofreDeSegredos cofre;
  @Mock private ContextoDaRequisicao contexto;

  private RecuperacaoDeSenhaService service;

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
        new RecuperacaoDeSenhaService(
            usuarios, codigos, sessoes, enviador, cofre, politica, contexto);
    when(cofre.novoCodigoDeRecuperacao()).thenReturn(CODIGO);
    when(cofre.codificar(CODIGO)).thenReturn(HASH_DO_CODIGO);
  }

  @Test
  @DisplayName("grava e envia o código para quem está ativo")
  void enviaParaUsuarioAtivo() {
    Usuario usuario = ativo();
    when(usuarios.findByEmail(EMAIL)).thenReturn(Optional.of(usuario));
    when(codigos.findFirstByUsuarioOrderByCriadoEmDesc(usuario)).thenReturn(Optional.empty());

    service.solicitarCodigo(EMAIL);

    verify(codigos).save(any(CodigoDeRecuperacao.class));
    verify(enviador).enviar(usuario, CODIGO);
  }

  @Test
  @DisplayName("e-mail desconhecido não falha e não envia nada — a tela não vira consulta")
  void emailDesconhecidoNaoSeDenuncia() {
    when(usuarios.findByEmail(EMAIL)).thenReturn(Optional.empty());

    assertThatCode(() -> service.solicitarCodigo(EMAIL)).doesNotThrowAnyException();

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

    assertThatCode(() -> service.solicitarCodigo(EMAIL)).doesNotThrowAnyException();

    verify(enviador, never()).enviar(any(), anyString());
  }

  @Test
  @DisplayName("reenvio antes do intervalo mínimo não dispara outro e-mail")
  void respeitaOIntervaloEntreEnvios() {
    Usuario usuario = ativo();
    when(usuarios.findByEmail(EMAIL)).thenReturn(Optional.of(usuario));
    when(codigos.findFirstByUsuarioOrderByCriadoEmDesc(usuario))
        .thenReturn(Optional.of(new CodigoDeRecuperacao(usuario, HASH_DO_CODIGO, AGORA, VALIDADE)));

    service.solicitarCodigo(EMAIL);

    verify(enviador, never()).enviar(any(), anyString());
    verify(codigos, never()).save(any());
    verify(cofre).gastarTempoDeConferencia();
  }

  @Test
  @DisplayName("valida o código correto sem consumi-lo")
  void validaSemConsumir() {
    CodigoDeRecuperacao vigente = prepararCodigoVigente();
    when(cofre.confere(CODIGO, HASH_DO_CODIGO)).thenReturn(true);

    service.validarCodigo(EMAIL, CODIGO);

    assertThat(vigente.foiUsado()).isFalse();
    assertThat(vigente.getTentativas()).isZero();
  }

  @Test
  @DisplayName("código errado conta a tentativa e recusa")
  void codigoErradoContaTentativa() {
    CodigoDeRecuperacao vigente = prepararCodigoVigente();
    when(cofre.confere(anyString(), anyString())).thenReturn(false);

    assertThatThrownBy(() -> service.validarCodigo(EMAIL, "000000"))
        .isInstanceOf(CodigoInvalidoException.class);

    assertThat(vigente.getTentativas()).isEqualTo(1);
  }

  @Test
  @DisplayName("código expirado recusa sem sequer comparar o valor")
  void codigoExpiradoRecusa() {
    Usuario usuario = ativo();
    CodigoDeRecuperacao expirado =
        new CodigoDeRecuperacao(
            usuario, HASH_DO_CODIGO, AGORA.minus(Duration.ofHours(1)), VALIDADE);
    when(usuarios.findByEmail(EMAIL)).thenReturn(Optional.of(usuario));
    when(codigos.findFirstByUsuarioOrderByCriadoEmDesc(usuario)).thenReturn(Optional.of(expirado));

    assertThatThrownBy(() -> service.validarCodigo(EMAIL, CODIGO))
        .isInstanceOf(CodigoInvalidoException.class);

    verify(cofre, never()).confere(anyString(), anyString());
  }

  @Test
  @DisplayName("e-mail sem código pedido recusa com a mesma mensagem de código inválido")
  void semCodigoPedidoRecusaIgual() {
    Usuario usuario = ativo();
    when(usuarios.findByEmail(EMAIL)).thenReturn(Optional.of(usuario));
    when(codigos.findFirstByUsuarioOrderByCriadoEmDesc(usuario)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.validarCodigo(EMAIL, CODIGO))
        .isInstanceOf(CodigoInvalidoException.class);
  }

  @Test
  @DisplayName("redefinir troca a senha e queima o código")
  void redefinirTrocaSenhaEQueimaOCodigo() {
    CodigoDeRecuperacao vigente = prepararCodigoVigente();
    when(cofre.confere(CODIGO, HASH_DO_CODIGO)).thenReturn(true);
    when(cofre.codificar("senha-nova-longa")).thenReturn("$2a$12$nova");

    service.redefinirSenha(EMAIL, CODIGO, "senha-nova-longa");

    assertThat(vigente.foiUsado()).isTrue();
    assertThat(vigente.getUsuario().getSenha()).contains("$2a$12$nova");
    assertThat(vigente.estaVigente(AGORA, LIMITE)).isFalse();
  }

  @Test
  @DisplayName("o mesmo código não serve duas vezes")
  void codigoNaoServeDuasVezes() {
    prepararCodigoVigente();
    when(cofre.confere(CODIGO, HASH_DO_CODIGO)).thenReturn(true);

    service.redefinirSenha(EMAIL, CODIGO, "senha-nova-longa");

    assertThatThrownBy(() -> service.redefinirSenha(EMAIL, CODIGO, "outra-senha-longa"))
        .isInstanceOf(CodigoInvalidoException.class);
  }

  @Test
  @DisplayName("o código de quem foi desativado depois de pedi-lo não confere nem redefine")
  void desativadoNaoUsaOCodigo() {
    CodigoDeRecuperacao vigente = prepararCodigoVigente();
    vigente.getUsuario().desativar(AGORA);
    when(cofre.confere(CODIGO, HASH_DO_CODIGO)).thenReturn(true);

    assertThatThrownBy(() -> service.validarCodigo(EMAIL, CODIGO))
        .isInstanceOf(CodigoInvalidoException.class);
    assertThatThrownBy(() -> service.redefinirSenha(EMAIL, CODIGO, "senha-nova-longa"))
        .isInstanceOf(CodigoInvalidoException.class);

    assertThat(vigente.getUsuario().getSituacao()).isEqualTo(SituacaoDoUsuario.INATIVO);
    verify(cofre, never()).codificar("senha-nova-longa");
  }

  @Test
  @DisplayName("a nova senha igual à atual é recusada no campo e o código continua valendo")
  void senhaIgualAAtualEhRecusada() {
    CodigoDeRecuperacao vigente = prepararCodigoVigente();
    when(cofre.confere(CODIGO, HASH_DO_CODIGO)).thenReturn(true);
    when(cofre.confere("senha-de-agora", "$2a$12$hash")).thenReturn(true);

    assertThatThrownBy(() -> service.redefinirSenha(EMAIL, CODIGO, "senha-de-agora"))
        .isInstanceOf(SenhaRepetidaException.class)
        .satisfies(
            falha -> assertThat(((SenhaRepetidaException) falha).getCampo()).contains("novaSenha"));

    assertThat(vigente.foiUsado()).isFalse();
  }

  @Test
  @DisplayName("redefinir encerra todas as sessões abertas do usuário")
  void redefinirEncerraAsSessoes() {
    CodigoDeRecuperacao vigente = prepararCodigoVigente();
    Usuario usuario = vigente.getUsuario();
    SessaoDeAcesso aberta = new SessaoDeAcesso(usuario, "resumo", AGORA, Duration.ofHours(12));
    when(sessoes.findByUsuarioAndEncerradaEmIsNull(usuario)).thenReturn(List.of(aberta));
    when(cofre.confere(CODIGO, HASH_DO_CODIGO)).thenReturn(true);

    service.redefinirSenha(EMAIL, CODIGO, "senha-nova-longa");

    assertThat(aberta.estaVigente(AGORA)).isFalse();
  }

  private CodigoDeRecuperacao prepararCodigoVigente() {
    Usuario usuario = ativo();
    CodigoDeRecuperacao vigente = new CodigoDeRecuperacao(usuario, HASH_DO_CODIGO, AGORA, VALIDADE);
    when(usuarios.findByEmail(EMAIL)).thenReturn(Optional.of(usuario));
    when(codigos.findFirstByUsuarioOrderByCriadoEmDesc(usuario)).thenReturn(Optional.of(vigente));
    return vigente;
  }

  private static Usuario ativo() {
    Usuario usuario = new Usuario("Leonardo Andrade", EMAIL, PapelDoUsuario.GESTOR, AGORA);
    usuario.definirSenha("$2a$12$hash", AGORA);
    return usuario;
  }
}
