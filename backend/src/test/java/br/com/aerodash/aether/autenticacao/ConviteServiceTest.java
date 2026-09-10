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
import org.mockito.ArgumentCaptor;

@DisplayName("ConviteService")
class ConviteServiceTest {

  private static final Instant AGORA = Instant.parse("2026-09-04T12:00:00Z");
  private static final Duration VALIDADE = Duration.ofDays(2);
  private static final String TOKEN = "token-sorteado";

  private ConviteRepository convites;
  private EnviadorDeConvite enviador;
  private CofreDeSegredos cofre;
  private ConviteService service;

  @BeforeEach
  void montar() {
    convites = mock(ConviteRepository.class);
    enviador = mock(EnviadorDeConvite.class);
    cofre = mock(CofreDeSegredos.class);
    PoliticaDeAcesso politica = mock(PoliticaDeAcesso.class);
    when(politica.agora()).thenReturn(AGORA);
    when(politica.validadeDoConvite()).thenReturn(VALIDADE);
    when(cofre.novoTokenDeSessao()).thenReturn(TOKEN);
    when(cofre.resumir(TOKEN)).thenReturn("hash-do-token");
    when(convites.save(any())).thenAnswer(chamada -> chamada.getArgument(0));
    service =
        new ConviteService(convites, enviador, cofre, politica, mock(ContextoDaRequisicao.class));
  }

  @Test
  @DisplayName("emitir grava o convite e manda o token em claro — só o hash fica no banco")
  void emitirGravaOHashEEnviaOToken() {
    Usuario convidado = convidado();

    service.emitir(convidado, AGORA);

    ArgumentCaptor<Convite> gravado = ArgumentCaptor.forClass(Convite.class);
    verify(convites).save(gravado.capture());
    assertThat(gravado.getValue().estaVigente(AGORA)).isTrue();
    assertThat(gravado.getValue().getExpiraEm()).isEqualTo(AGORA.plus(VALIDADE));
    verify(enviador).enviar(convidado, TOKEN);
  }

  @Test
  @DisplayName("reenviar mata o convite anterior: dois links vivos seriam dois segredos soltos")
  void reenviarInvalidaOAnterior() {
    Usuario convidado = convidado();
    Convite anterior = new Convite(convidado, "hash-antigo", AGORA, VALIDADE);
    when(convites.findFirstByUsuarioOrderByCriadoEmDesc(convidado))
        .thenReturn(Optional.of(anterior));

    service.emitir(convidado, AGORA.plusSeconds(60));

    assertThat(anterior.foiUsado()).isTrue();
    assertThat(anterior.estaVigente(AGORA.plusSeconds(61))).isFalse();
  }

  @Test
  @DisplayName("concluir define a senha da própria pessoa, ativa a conta e gasta o link")
  void concluirAtivaAConta() {
    Usuario convidado = convidado();
    Convite convite = new Convite(convidado, "hash-do-token", AGORA, VALIDADE);
    when(convites.findByToken("hash-do-token")).thenReturn(Optional.of(convite));
    when(cofre.codificar("minha-senha-nova")).thenReturn("hash-da-senha");

    service.concluir(TOKEN, "minha-senha-nova");

    assertThat(convidado.getSituacao()).isEqualTo(SituacaoDoUsuario.ATIVO);
    assertThat(convidado.possuiSenha()).isTrue();
    assertThat(convite.foiUsado()).isTrue();
  }

  @Test
  @DisplayName("convite já usado é recusado e nenhuma senha é trocada")
  void conviteJaUsadoEhRecusado() {
    Usuario convidado = convidado();
    Convite convite = new Convite(convidado, "hash-do-token", AGORA, VALIDADE);
    convite.marcarComoUsado(AGORA.plusSeconds(10));
    when(convites.findByToken("hash-do-token")).thenReturn(Optional.of(convite));

    assertThatThrownBy(() -> service.concluir(TOKEN, "minha-senha-nova"))
        .isInstanceOf(ConviteInvalidoException.class);

    assertThat(convidado.possuiSenha()).isFalse();
    verify(cofre, never()).codificar(any());
  }

  @Test
  @DisplayName("chamada sem token é recusada antes de consultar o banco")
  void semTokenNaoConsultaOBanco() {
    assertThatThrownBy(() -> service.concluir("  ", "minha-senha-nova"))
        .isInstanceOf(ConviteInvalidoException.class);

    verify(convites, never()).findByToken(any());
  }

  private static Usuario convidado() {
    return new Usuario(
        "Camila Nogueira", "camila@administraair.com.br", PapelDoUsuario.GESTOR, AGORA);
  }
}
