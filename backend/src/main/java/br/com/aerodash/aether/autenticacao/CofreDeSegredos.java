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

  private final PasswordEncoder codificador;

  public CofreDeSegredos(PasswordEncoder codificador) {
    this.codificador = codificador;
  }

  /** BCrypt, para senha e para código de recuperação: os dois têm pouca entropia. */
  public String codificar(String segredo) {
    return codificador.encode(segredo);
  }

  public boolean confere(String informado, String codificado) {
    return codificador.matches(informado, codificado);
  }

  /**
   * Gasta uma codificação e descarta o resultado. Serve para que responder a um e-mail inexistente
   * custe o mesmo tempo que responder a um existente — sem isso, a diferença de latência entrega
   * quais endereços têm conta, por mais genérica que seja a mensagem de erro.
   */
  public void gastarTempoDeCodificacao(String segredo) {
    codificador.encode(segredo);
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
