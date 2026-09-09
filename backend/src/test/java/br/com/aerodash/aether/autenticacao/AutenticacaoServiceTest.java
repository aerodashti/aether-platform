package br.com.aerodash.aether.autenticacao;

import static org.assertj.core.api.Assertions.assertThat;
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
@DisplayName("AutenticacaoService")
class AutenticacaoServiceTest {

  private static final Instant AGORA = Instant.parse("2026-09-04T12:00:00Z");
  private static final String EMAIL = "leonardo@administraair.com.br";
  private static final String SENHA = "senha-correta";
  private static final String HASH = "$2a$12$hash";
  private static final String TOKEN = "token-em-claro";
  private static final String RESUMO = "resumo-do-token";
  private static final int LIMITE = 5;
  private static final Duration BLOQUEIO = Duration.ofMinutes(15);
  private static final Duration SESSAO = Duration.ofHours(12);

  @Mock private UsuarioRepository usuarios;
  @Mock private SessaoDeAcessoRepository sessoes;
  @Mock private UsuarioMapper mapper;
  @Mock private CofreDeSegredos cofre;
  @Mock private ContextoDaRequisicao contexto;

  private AutenticacaoService service;

  @BeforeEach
  void montar() {
    PoliticaDeAcesso politica =
        new PoliticaDeAcesso(
            new PropriedadesDeAutenticacao(
                SESSAO,
                LIMITE,
                BLOQUEIO,
                Duration.ofMinutes(10),
                LIMITE,
                Duration.ofMinutes(1),
                "nao-responda@aether.com.br",
                false),
            Clock.fixed(AGORA, ZoneOffset.UTC));
    service = new AutenticacaoService(usuarios, sessoes, mapper, cofre, politica, contexto);
    when(cofre.novoTokenDeSessao()).thenReturn(TOKEN);
    when(cofre.resumir(TOKEN)).thenReturn(RESUMO);
    when(mapper.paraResponse(any())).thenReturn(new SessaoResponse("Leonardo Andrade", EMAIL));
  }

  @Test
  @DisplayName("abre sessão quando a senha confere")
  void abreSessaoComSenhaCorreta() {
    Usuario usuario = ativo();
    when(usuarios.findByEmail(EMAIL)).thenReturn(Optional.of(usuario));
    when(cofre.confere(SENHA, HASH)).thenReturn(true);

    SessaoAberta aberta = service.entrar(EMAIL, SENHA);

    assertThat(aberta.token()).isEqualTo(TOKEN);
    assertThat(aberta.duracao()).isEqualTo(SESSAO);
    assertThat(aberta.usuario().nome()).isEqualTo("Leonardo Andrade");
    verify(sessoes).save(any(SessaoDeAcesso.class));
    assertThat(usuario.getTentativas()).isZero();
  }

  @Test
  @DisplayName("aceita o e-mail digitado com maiúsculas e espaços")
  void normalizaOEmailAntesDeBuscar() {
    when(usuarios.findByEmail(EMAIL)).thenReturn(Optional.of(ativo()));
    when(cofre.confere(SENHA, HASH)).thenReturn(true);

    assertThat(service.entrar("  Leonardo@AdministraAir.COM.BR ", SENHA)).isNotNull();

    verify(usuarios).findByEmail(EMAIL);
  }

  @Test
  @DisplayName("e-mail desconhecido responde igual a senha errada, e ainda assim gasta o hash")
  void emailDesconhecidoNaoSeDenuncia() {
    when(usuarios.findByEmail(EMAIL)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.entrar(EMAIL, SENHA))
        .isInstanceOf(CredenciaisInvalidasException.class)
        .hasMessage("E-mail ou senha incorretos.");

    // Sem esta codificação descartada, a resposta imediata denunciaria que o e-mail não existe.
    verify(cofre).gastarTempoDeCodificacao(SENHA);
    verify(sessoes, never()).save(any());
  }

  @Test
  @DisplayName("senha errada conta a falha e recusa")
  void senhaErradaContaAFalha() {
    Usuario usuario = ativo();
    when(usuarios.findByEmail(EMAIL)).thenReturn(Optional.of(usuario));
    when(cofre.confere(anyString(), anyString())).thenReturn(false);

    assertThatThrownBy(() -> service.entrar(EMAIL, "errada"))
        .isInstanceOf(CredenciaisInvalidasException.class);

    assertThat(usuario.getTentativas()).isEqualTo(1);
    verify(sessoes, never()).save(any());
  }

  @Test
  @DisplayName("usuário pendente recebe a mesma recusa de credencial inválida")
  void pendenteNaoEntra() {
    when(usuarios.findByEmail(EMAIL)).thenReturn(Optional.of(new Usuario("Camila", EMAIL, AGORA)));

    assertThatThrownBy(() -> service.entrar(EMAIL, SENHA))
        .isInstanceOf(CredenciaisInvalidasException.class);
  }

  @Test
  @DisplayName("conta bloqueada responde bloqueio, e a senha nem chega a ser conferida")
  void bloqueadaRecusaComBloqueio() {
    Usuario usuario = ativo();
    for (int tentativa = 0; tentativa < LIMITE; tentativa++) {
      usuario.registrarFalhaDeEntrada(AGORA, LIMITE, BLOQUEIO);
    }
    when(usuarios.findByEmail(EMAIL)).thenReturn(Optional.of(usuario));

    assertThatThrownBy(() -> service.entrar(EMAIL, SENHA))
        .isInstanceOf(AcessoBloqueadoException.class);

    verify(cofre, never()).confere(anyString(), anyString());
  }

  @Test
  @DisplayName("consulta a sessão vigente pelo resumo do token")
  void consultaSessaoVigente() {
    when(sessoes.findByToken(RESUMO)).thenReturn(Optional.of(sessao(AGORA)));

    assertThat(service.consultarSessao(TOKEN).email()).isEqualTo(EMAIL);
  }

  @Test
  @DisplayName("sem cookie, token desconhecido e sessão expirada recusam igual")
  void sessaoInvalidaEmTodosOsCasos() {
    when(sessoes.findByToken(RESUMO)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.consultarSessao(null))
        .isInstanceOf(SessaoInvalidaException.class);
    assertThatThrownBy(() -> service.consultarSessao("  "))
        .isInstanceOf(SessaoInvalidaException.class);
    assertThatThrownBy(() -> service.consultarSessao(TOKEN))
        .isInstanceOf(SessaoInvalidaException.class);

    when(sessoes.findByToken(RESUMO))
        .thenReturn(Optional.of(sessao(AGORA.minus(Duration.ofHours(13)))));
    assertThatThrownBy(() -> service.consultarSessao(TOKEN))
        .isInstanceOf(SessaoInvalidaException.class);
  }

  @Test
  @DisplayName("sair encerra a sessão e não faz nada quando não há cookie")
  void sairEncerraEAceitaAusencia() {
    SessaoDeAcesso aberta = sessao(AGORA);
    when(sessoes.findByToken(RESUMO)).thenReturn(Optional.of(aberta));

    service.sair(TOKEN);
    assertThat(aberta.estaVigente(AGORA)).isFalse();

    service.sair(null);
    verify(sessoes, never()).findByToken(null);
  }

  private static Usuario ativo() {
    Usuario usuario = new Usuario("Leonardo Andrade", EMAIL, AGORA);
    usuario.definirSenha(HASH, AGORA);
    return usuario;
  }

  private static SessaoDeAcesso sessao(Instant criadaEm) {
    return new SessaoDeAcesso(ativo(), RESUMO, criadaEm, Duration.ofHours(12));
  }
}
