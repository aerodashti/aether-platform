package br.com.aerodash.aether.tripulante;

/**
 * O CANAC aceito no cadastro: seis dígitos, com ponto, hífen ou espaço opcionais entre eles — a
 * máscara é redação de tela e sai na gravação. Letras são recusadas em vez de descartadas: "ABCDEF"
 * viraria um CANAC nulo sem ninguém saber. Em branco é "não informado".
 *
 * <p>A mesma regra está em {@code features/aeronaves/componentes/validacaoDoTripulante.ts}.
 */
final class FormatoDoCanac {

  static final String EXPRESSAO = "^\\s*$|^[ .-]*(?:[0-9][ .-]*){6}$";

  static final String MENSAGEM = "O CANAC tem 6 dígitos, como 123456.";

  private FormatoDoCanac() {}
}
