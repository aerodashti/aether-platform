package br.com.aerodash.aether.autenticacao;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.time.Duration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** A área não logada: entrar, sair e recuperar a senha. */
@RestController
@RequestMapping("/autenticacao")
@Tag(name = "Autenticação", description = "Entrada, sessão e recuperação de senha")
public class AutenticacaoController {

  static final String COOKIE_DE_SESSAO = "aether_sessao";

  private final AutenticacaoService autenticacao;
  private final RecuperacaoDeSenhaService recuperacao;
  private final PropriedadesDeAutenticacao propriedades;

  public AutenticacaoController(
      AutenticacaoService autenticacao,
      RecuperacaoDeSenhaService recuperacao,
      PropriedadesDeAutenticacao propriedades) {
    this.autenticacao = autenticacao;
    this.recuperacao = recuperacao;
    this.propriedades = propriedades;
  }

  @PostMapping("/entrar")
  @Operation(summary = "Abre uma sessão a partir de e-mail e senha")
  public ResponseEntity<SessaoResponse> entrar(@Valid @RequestBody EntrarRequest requisicao) {
    SessaoAberta aberta = autenticacao.entrar(requisicao.email(), requisicao.senha());
    return ResponseEntity.ok()
        .header(HttpHeaders.SET_COOKIE, cookie(aberta.token(), aberta.duracao()).toString())
        .body(aberta.usuario());
  }

  @GetMapping("/sessao")
  @Operation(summary = "Devolve o usuário da sessão corrente")
  public SessaoResponse consultarSessao(
      @CookieValue(name = COOKIE_DE_SESSAO, required = false) String token) {
    return autenticacao.consultarSessao(token);
  }

  @DeleteMapping("/sessao")
  @Operation(summary = "Encerra a sessão corrente")
  public ResponseEntity<Void> sair(
      @CookieValue(name = COOKIE_DE_SESSAO, required = false) String token) {
    autenticacao.sair(token);
    return ResponseEntity.noContent()
        .header(HttpHeaders.SET_COOKIE, cookie("", Duration.ZERO).toString())
        .build();
  }

  /**
   * Responde 202 mesmo para e-mail que não existe: a tela não pode servir de consulta a quem tem
   * conta. Quem tem cadastro recebe o código; quem não tem recebe a mesma resposta.
   */
  @PostMapping("/recuperacao")
  @Operation(summary = "Envia um código de seis dígitos para o e-mail informado")
  public ResponseEntity<Void> solicitarCodigo(
      @Valid @RequestBody SolicitarRecuperacaoRequest requisicao) {
    recuperacao.solicitarCodigo(requisicao.email());
    return ResponseEntity.accepted().build();
  }

  @PostMapping("/recuperacao/codigo")
  @Operation(summary = "Confere o código antes de permitir a troca da senha")
  public ResponseEntity<Void> validarCodigo(@Valid @RequestBody ValidarCodigoRequest requisicao) {
    recuperacao.validarCodigo(requisicao.email(), requisicao.codigo());
    return ResponseEntity.noContent().build();
  }

  @PostMapping("/recuperacao/senha")
  @Operation(summary = "Troca a senha usando o código recebido por e-mail")
  public ResponseEntity<Void> redefinirSenha(@Valid @RequestBody RedefinirSenhaRequest requisicao) {
    recuperacao.redefinirSenha(requisicao.email(), requisicao.codigo(), requisicao.novaSenha());
    return ResponseEntity.noContent().build();
  }

  /**
   * {@code HttpOnly} tira o token do alcance de qualquer script na página, o que resolve o roubo
   * por XSS que um token guardado em {@code localStorage} não resolve. {@code SameSite=Lax} basta
   * porque nenhum fluxo do produto depende de request entre sites.
   */
  private ResponseCookie cookie(String valor, Duration duracao) {
    return ResponseCookie.from(COOKIE_DE_SESSAO, valor)
        .httpOnly(true)
        .secure(propriedades.cookieSeguro())
        .sameSite("Lax")
        .path("/")
        .maxAge(duracao)
        .build();
  }
}
