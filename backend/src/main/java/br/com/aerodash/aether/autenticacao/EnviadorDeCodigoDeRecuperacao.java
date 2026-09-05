package br.com.aerodash.aether.autenticacao;

/**
 * Por onde o código de seis dígitos chega até a pessoa.
 *
 * <p>É uma porta, e não uma chamada direta ao {@code JavaMailSender}, para que o serviço de
 * recuperação possa ser testado sem servidor de e-mail e para que trocar SMTP por um provedor de
 * API não toque em nenhuma regra.
 */
public interface EnviadorDeCodigoDeRecuperacao {

  void enviar(Usuario usuario, String codigo);
}
