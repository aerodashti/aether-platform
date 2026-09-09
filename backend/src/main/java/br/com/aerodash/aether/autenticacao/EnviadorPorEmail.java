package br.com.aerodash.aether.autenticacao;

import java.time.Duration;
import org.springframework.mail.MailSender;
import org.springframework.mail.SimpleMailMessage;

/** Envia o código pelo SMTP configurado em {@code spring.mail}. */
public class EnviadorPorEmail implements EnviadorDeCodigoDeRecuperacao {

  private static final String ASSUNTO = "Seu código de acesso ao Aether";

  private final MailSender correio;
  private final String remetente;
  private final Duration validade;

  public EnviadorPorEmail(MailSender correio, String remetente, Duration validade) {
    this.correio = correio;
    this.remetente = remetente;
    this.validade = validade;
  }

  @Override
  public void enviar(Usuario usuario, String codigo) {
    SimpleMailMessage mensagem = new SimpleMailMessage();
    mensagem.setFrom(remetente);
    mensagem.setTo(usuario.getEmail());
    mensagem.setSubject(ASSUNTO);
    mensagem.setText(corpo(usuario, codigo));
    correio.send(mensagem);
  }

  private String corpo(Usuario usuario, String codigo) {
    return """
        Olá, %s.

        Seu código para redefinir a senha do Aether é:

            %s

        Ele vale por %d minutos e só pode ser usado uma vez.

        Se não foi você quem pediu, ignore esta mensagem — sua senha atual continua valendo.
        """
        .formatted(usuario.getNome(), codigo, validade.toMinutes());
  }
}
