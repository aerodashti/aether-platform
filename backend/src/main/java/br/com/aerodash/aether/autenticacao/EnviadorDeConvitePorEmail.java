package br.com.aerodash.aether.autenticacao;

import java.time.Duration;
import org.springframework.mail.MailSender;
import org.springframework.mail.SimpleMailMessage;

/** Envia o link do convite pelo SMTP configurado em {@code spring.mail}. */
public class EnviadorDeConvitePorEmail implements EnviadorDeConvite {

  private static final String ASSUNTO = "Seu acesso ao Aether";

  private final MailSender correio;
  private final String remetente;
  private final String enderecoBase;
  private final Duration validade;

  public EnviadorDeConvitePorEmail(
      MailSender correio, String remetente, String enderecoBase, Duration validade) {
    this.correio = correio;
    this.remetente = remetente;
    this.enderecoBase = enderecoBase;
    this.validade = validade;
  }

  @Override
  public void enviar(Usuario usuario, String token) {
    SimpleMailMessage mensagem = new SimpleMailMessage();
    mensagem.setFrom(remetente);
    mensagem.setTo(usuario.getEmail());
    mensagem.setSubject(ASSUNTO);
    mensagem.setText(corpo(usuario, token));
    correio.send(mensagem);
  }

  private String corpo(Usuario usuario, String token) {
    return """
        Olá, %s.

        Você recebeu acesso ao Aether. Para começar, crie sua senha:

            %s?convite=%s

        O link vale por %d horas e só pode ser usado uma vez.

        Ninguém, nem o administrador que criou seu acesso, define sua senha por você.
        """
        .formatted(usuario.getNome(), enderecoBase, token, validade.toHours());
  }
}
