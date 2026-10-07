package br.com.aerodash.aether.autenticacao;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Onde os segredos de acesso são sorteados, guardados e conferidos.
 *
 * <p>Senha, código de recuperação e token de sessão têm exigências diferentes, e concentrá-los aqui
 * é o que permite ler as três decisões lado a lado em vez de espalhá-las pelos serviços.
 */
@Component
public class CofreDeSegredos {

  private static final SecureRandom SORTEIO = new SecureRandom();
  private static final int DIGITOS_DO_CODIGO = 6;
  private static final int LIMITE_DO_CODIGO = 1_000_000;
  private static final int BYTES_DO_TOKEN = 32;

  /** Um segredo qualquer: só o custo de conferi-lo importa. */
  private static final String SEGREDO_DE_REFERENCIA = "referencia-de-tempo";

  private final PasswordEncoder codificador;
  private final String hashDeReferencia;

  public CofreDeSegredos(PasswordEncoder codificador) {
    this.codificador = codificador;
    this.hashDeReferencia = codificador.encode(SEGREDO_DE_REFERENCIA);
  }

  /** BCrypt, para senha e para código de recuperação: os dois têm pouca entropia. */
  public String codificar(String segredo) {
    return codificador.encode(segredo);
  }

  public boolean confere(String informado, String codificado) {
    return codificador.matches(informado, codificado);
  }

  /**
   * Gasta o tempo de uma conferência e descarta o resultado. Serve para que a recusa que não chega
   * a conferir nada — e-mail inexistente, conta inativa ou pendente — custe o mesmo que a que
   * confere: sem isso, a diferença de latência entrega quais endereços têm conta, por mais genérica
   * que seja a mensagem de erro.
   *
   * <p>Confere um segredo fixo, e não o que a pessoa digitou: o BCrypt recusa com exceção o que
   * passa de 72 bytes, e a recusa viraria um 500 justamente para quem não tem conta.
   */
  public void gastarTempoDeConferencia() {
    codificador.matches(SEGREDO_DE_REFERENCIA, hashDeReferencia);
  }

  /**
   * Código de seis dígitos com os zeros à esquerda preservados: {@code 042917} é tão válido quanto
   * {@code 519274}, e descartá-lo encolheria o espaço de busca sem ninguém perceber.
   */
  public String novoCodigoDeRecuperacao() {
    return String.format("%0" + DIGITOS_DO_CODIGO + "d", SORTEIO.nextInt(LIMITE_DO_CODIGO));
  }

  /** 256 bits de entropia em base64 sem padding — cabe num cookie sem escape. */
  public String novoTokenDeSessao() {
    byte[] bytes = new byte[BYTES_DO_TOKEN];
    SORTEIO.nextBytes(bytes);
    return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
  }

  /**
   * SHA-256 do token de sessão. Aqui hash rápido basta, ao contrário da senha: o token é sorteado
   * com 256 bits, então não existe dicionário a percorrer — o resumo serve para que ler a tabela
   * não entregue sessões abertas.
   */
  public String resumir(String token) {
    try {
      MessageDigest algoritmo = MessageDigest.getInstance("SHA-256");
      return HexFormat.of().formatHex(algoritmo.digest(token.getBytes(StandardCharsets.UTF_8)));
    } catch (NoSuchAlgorithmException impossivel) {
      throw new IllegalStateException("SHA-256 é exigido por toda JVM", impossivel);
    }
  }
}
