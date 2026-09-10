package br.com.aerodash.aether.autenticacao;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import br.com.aerodash.aether.comum.observabilidade.ContextoDaRequisicao;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

@DisplayName("TrocaDeSenhaService")
class TrocaDeSenhaServiceTest {

  private static final Instant AGORA = Instant.parse("2026-09-09T12:00:00Z");
  private static final Duration VALIDADE = Duration.ofMinutes(10);
  private static final long ID = 1L;
  private static final int LIMITE = 5;

  private UsuarioRepository usuarios;
  private CodigoDeRecuperacaoRepository codigos;
  private EnviadorDeCodigoDeRecuperacao enviador;
  private CofreDeSegredos cofre;
  private TrocaDeSenhaService service;
  private Usuario usuario;

  @BeforeEach
  void montar() {
    usuarios = mock(UsuarioRepository.class);
    codigos = mock(CodigoDeRecuperacaoRepository.class);
    enviador = mock(EnviadorDeCodigoDeRecuperacao.class);
    cofre = mock(CofreDeSegredos.class);
    PoliticaDeAcesso politica = mock(PoliticaDeAcesso.class);
    when(politica.agora()).thenReturn(AGORA);
    when(politica.validadeDoCodigo()).thenReturn(VALIDADE);
    when(politica.tentativasPorCodigo()).thenReturn(LIMITE);
    when(politica.intervaloEntreCodigos()).thenReturn(Duration.ofMinutes(1));
    when(codigos.save(any())).thenAnswer(chamada -> chamada.getArgument(0));

    usuario =
        new Usuario("Leonardo", "leonardo@administraair.com.br", PapelDoUsuario.GESTOR, AGORA);
    usuario.definirSenha("hash-da-atual", AGORA);
    ReflectionTestUtils.setField(usuario, "id", ID);
    when(usuarios.findById(ID)).thenReturn(Optional.of(usuario));

    service =
        new TrocaDeSenhaService(
            usuarios, codigos, enviador, cofre, politica, mock(ContextoDaRequisicao.class));
  }

  @Test
  @DisplayName("pedir o token grava o código e manda para o e-mail cadastrado")
  void pedirTokenEnviaOCodigo() {
    when(cofre.novoCodigoDeRecuperacao()).thenReturn("042917");
    when(cofre.codificar("042917")).thenReturn("hash-do-codigo");

    service.solicitarToken(ID);

    verify(codigos).save(any());
    verify(enviador).enviar(usuario, "042917");
  }

  @Test
  @DisplayName("trocar exige as duas provas: saber a senha atual e ter o e-mail")
  void trocarExigeAsDuasProvas() {
    when(cofre.confere("a-atual", "hash-da-atual")).thenReturn(true);
    when(cofre.confere("042917", "hash-do-codigo")).thenReturn(true);
    when(cofre.codificar("a-nova-senha")).thenReturn("hash-da-nova");
    when(codigos.findFirstByUsuarioOrderByCriadoEmDesc(usuario))
        .thenReturn(Optional.of(codigoVigente()));

    service.trocar(ID, "a-atual", "a-nova-senha", "042917");

    assertThat(usuario.getSenha()).contains("hash-da-nova");
  }

  @Test
  @DisplayName("senha atual errada é recusada antes de olhar o código")
  void senhaAtualErradaEhRecusadaAntes() {
    when(cofre.confere("errada", "hash-da-atual")).thenReturn(false);

    assertThatThrownBy(() -> service.trocar(ID, "errada", "a-nova-senha", "042917"))
        .isInstanceOf(SenhaAtualIncorretaException.class);

    verify(codigos, never()).findFirstByUsuarioOrderByCriadoEmDesc(any());
    assertThat(usuario.getSenha()).contains("hash-da-atual");
  }

  @Test
  @DisplayName("código errado conta tentativa e não troca a senha")
  void codigoErradoContaTentativa() {
    CodigoDeRecuperacao vigente = codigoVigente();
    when(cofre.confere("a-atual", "hash-da-atual")).thenReturn(true);
    when(cofre.confere("000000", "hash-do-codigo")).thenReturn(false);
    when(codigos.findFirstByUsuarioOrderByCriadoEmDesc(usuario)).thenReturn(Optional.of(vigente));

    assertThatThrownBy(() -> service.trocar(ID, "a-atual", "a-nova-senha", "000000"))
        .isInstanceOf(CodigoInvalidoException.class);

    assertThat(vigente.getTentativas()).isEqualTo(1);
    assertThat(usuario.getSenha()).contains("hash-da-atual");
  }

  @Test
  @DisplayName("sem código pedido, não há o que confirmar")
  void semCodigoPedidoNaoHaOQueConfirmar() {
    when(cofre.confere("a-atual", "hash-da-atual")).thenReturn(true);
    when(codigos.findFirstByUsuarioOrderByCriadoEmDesc(usuario)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.trocar(ID, "a-atual", "a-nova-senha", "042917"))
        .isInstanceOf(CodigoInvalidoException.class);
  }

  private CodigoDeRecuperacao codigoVigente() {
    return new CodigoDeRecuperacao(usuario, "hash-do-codigo", AGORA, VALIDADE);
  }
}
