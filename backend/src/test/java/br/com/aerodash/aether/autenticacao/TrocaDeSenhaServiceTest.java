package br.com.aerodash.aether.autenticacao;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import br.com.aerodash.aether.comum.erro.ExcecaoDeDominio;
import br.com.aerodash.aether.comum.observabilidade.ContextoDaRequisicao;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

@DisplayName("TrocaDeSenhaService")
class TrocaDeSenhaServiceTest {

  private static final Instant AGORA = Instant.parse("2026-09-09T12:00:00Z");
  private static final Duration VALIDADE = Duration.ofMinutes(10);
  private static final Duration BLOQUEIO = Duration.ofMinutes(15);
  private static final long ID = 1L;
  private static final int LIMITE = 5;
  private static final String SESSAO = "token-da-sessao";

  private UsuarioRepository usuarios;
  private CodigoDeRecuperacaoRepository codigos;
  private SessaoDeAcessoRepository sessoes;
  private EnviadorDeCodigoDeRecuperacao enviador;
  private CofreDeSegredos cofre;
  private TrocaDeSenhaService service;
  private Usuario usuario;

  @BeforeEach
  void montar() {
    usuarios = mock(UsuarioRepository.class);
    codigos = mock(CodigoDeRecuperacaoRepository.class);
    sessoes = mock(SessaoDeAcessoRepository.class);
    enviador = mock(EnviadorDeCodigoDeRecuperacao.class);
    cofre = mock(CofreDeSegredos.class);
    PoliticaDeAcesso politica = mock(PoliticaDeAcesso.class);
    when(politica.agora()).thenReturn(AGORA);
    when(politica.validadeDoCodigo()).thenReturn(VALIDADE);
    when(politica.tentativasPorCodigo()).thenReturn(LIMITE);
    when(politica.intervaloEntreCodigos()).thenReturn(Duration.ofMinutes(1));
    when(politica.tentativasAteBloquear()).thenReturn(LIMITE);
    when(politica.duracaoDoBloqueio()).thenReturn(BLOQUEIO);
    when(codigos.save(any())).thenAnswer(chamada -> chamada.getArgument(0));
    when(cofre.resumir(SESSAO)).thenReturn("hash-da-sessao");

    usuario =
        new Usuario("Leonardo", "leonardo@administraair.com.br", PapelDoUsuario.GESTOR, AGORA);
    usuario.definirSenha("hash-da-atual", AGORA);
    ReflectionTestUtils.setField(usuario, "id", ID);
    when(usuarios.findById(ID)).thenReturn(Optional.of(usuario));

    ContextoDaRequisicao contexto = mock(ContextoDaRequisicao.class);
    CodigoDaTrocaDeSenha codigo =
        new CodigoDaTrocaDeSenha(codigos, enviador, cofre, politica, contexto);
    service = new TrocaDeSenhaService(usuarios, codigo, sessoes, cofre, politica, contexto);
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
    provasConferem();

    service.trocar(ID, SESSAO, "a-atual", "a-nova-senha", "042917");

    assertThat(usuario.getSenha()).contains("hash-da-nova");
  }

  @Test
  @DisplayName("trocar encerra as outras sessões e mantém a de quem pediu")
  void trocarEncerraAsOutrasSessoes() {
    provasConferem();
    SessaoDeAcesso atual =
        new SessaoDeAcesso(usuario, "hash-da-sessao", AGORA, Duration.ofHours(12));
    SessaoDeAcesso outra =
        new SessaoDeAcesso(usuario, "hash-de-outra", AGORA, Duration.ofHours(12));
    when(sessoes.findByUsuarioAndEncerradaEmIsNull(usuario)).thenReturn(List.of(atual, outra));

    service.trocar(ID, SESSAO, "a-atual", "a-nova-senha", "042917");

    assertThat(outra.estaEncerrada()).isTrue();
    assertThat(atual.estaEncerrada()).isFalse();
  }

  @Test
  @DisplayName("senha atual errada é recusada antes de olhar o código, no campo senhaAtual")
  void senhaAtualErradaEhRecusadaAntes() {
    when(cofre.confere("errada", "hash-da-atual")).thenReturn(false);

    assertThatThrownBy(() -> service.trocar(ID, SESSAO, "errada", "a-nova-senha", "042917"))
        .isInstanceOf(SenhaAtualIncorretaException.class)
        .satisfies(erro -> assertThat(campoDe(erro)).contains("senhaAtual"));

    verify(codigos, never()).findFirstByUsuarioOrderByCriadoEmDesc(any());
    assertThat(usuario.getSenha()).contains("hash-da-atual");
  }

  @Test
  @DisplayName("senha atual errada conta na mesma tentativa da entrada")
  void senhaAtualErradaContaTentativa() {
    when(cofre.confere("errada", "hash-da-atual")).thenReturn(false);

    assertThatThrownBy(() -> service.trocar(ID, SESSAO, "errada", "a-nova-senha", "042917"))
        .isInstanceOf(SenhaAtualIncorretaException.class);

    assertThat(usuario.getTentativas()).isEqualTo(1);
  }

  @Test
  @DisplayName("a quinta senha atual errada tranca a conta e diz por quanto tempo")
  void quintaSenhaErradaTranca() {
    when(cofre.confere("errada", "hash-da-atual")).thenReturn(false);
    for (int tentativa = 1; tentativa < LIMITE; tentativa++) {
      assertThatThrownBy(() -> service.trocar(ID, SESSAO, "errada", "a-nova-senha", "042917"))
          .isInstanceOf(SenhaAtualIncorretaException.class);
    }

    assertThatThrownBy(() -> service.trocar(ID, SESSAO, "errada", "a-nova-senha", "042917"))
        .isInstanceOf(TrocaDeSenhaBloqueadaException.class)
        .hasMessage(
            "A conta está bloqueada por tentativas erradas de senha. Tente de novo em 15 minutos.");

    assertThat(usuario.estaBloqueado(AGORA)).isTrue();
  }

  @Test
  @DisplayName("conta trancada não troca a senha nem confere o palpite")
  void contaTrancadaNaoConfereOPalpite() {
    usuario.registrarFalhaDeEntrada(AGORA.minus(Duration.ofMinutes(5)), 1, BLOQUEIO);

    assertThatThrownBy(() -> service.trocar(ID, SESSAO, "a-atual", "a-nova-senha", "042917"))
        .isInstanceOf(TrocaDeSenhaBloqueadaException.class)
        .hasMessageContaining("10 minutos");

    verify(cofre, never()).confere(anyString(), anyString());
  }

  @Test
  @DisplayName("nova senha igual à atual é recusada no campo novaSenha, sem gastar o código")
  void novaSenhaIgualAAtualEhRecusada() {
    when(cofre.confere("a-atual", "hash-da-atual")).thenReturn(true);

    assertThatThrownBy(() -> service.trocar(ID, SESSAO, "a-atual", "a-atual", "042917"))
        .isInstanceOf(SenhaRepetidaException.class)
        .satisfies(erro -> assertThat(campoDe(erro)).contains("novaSenha"));

    verify(codigos, never()).findFirstByUsuarioOrderByCriadoEmDesc(any());
  }

  @Test
  @DisplayName("código errado conta tentativa, não troca a senha e cai no campo codigo")
  void codigoErradoContaTentativa() {
    CodigoDeRecuperacao vigente = codigoVigente();
    when(cofre.confere("a-atual", "hash-da-atual")).thenReturn(true);
    when(cofre.confere("000000", "hash-do-codigo")).thenReturn(false);
    when(codigos.findFirstByUsuarioOrderByCriadoEmDesc(usuario)).thenReturn(Optional.of(vigente));

    assertThatThrownBy(() -> service.trocar(ID, SESSAO, "a-atual", "a-nova-senha", "000000"))
        .isInstanceOf(CodigoInvalidoException.class)
        .satisfies(erro -> assertThat(campoDe(erro)).contains("codigo"));

    assertThat(vigente.getTentativas()).isEqualTo(1);
    assertThat(usuario.getSenha()).contains("hash-da-atual");
  }

  @Test
  @DisplayName("sem código pedido, não há o que confirmar")
  void semCodigoPedidoNaoHaOQueConfirmar() {
    when(cofre.confere("a-atual", "hash-da-atual")).thenReturn(true);
    when(codigos.findFirstByUsuarioOrderByCriadoEmDesc(usuario)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.trocar(ID, SESSAO, "a-atual", "a-nova-senha", "042917"))
        .isInstanceOf(CodigoInvalidoException.class);
  }

  private void provasConferem() {
    when(cofre.confere("a-atual", "hash-da-atual")).thenReturn(true);
    when(cofre.confere("042917", "hash-do-codigo")).thenReturn(true);
    when(cofre.codificar("a-nova-senha")).thenReturn("hash-da-nova");
    when(codigos.findFirstByUsuarioOrderByCriadoEmDesc(usuario))
        .thenReturn(Optional.of(codigoVigente()));
  }

  private CodigoDeRecuperacao codigoVigente() {
    return new CodigoDeRecuperacao(usuario, "hash-do-codigo", AGORA, VALIDADE);
  }

  private static Optional<String> campoDe(Throwable erro) {
    return ((ExcecaoDeDominio) erro).getCampo();
  }
}
