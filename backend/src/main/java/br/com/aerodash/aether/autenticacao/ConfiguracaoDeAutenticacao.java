package br.com.aerodash.aether.autenticacao;

import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mail.MailSender;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

/** Beans da feature: o codificador de senha e por onde o código de recuperação sai. */
@Configuration
@EnableConfigurationProperties(PropriedadesDeAutenticacao.class)
public class ConfiguracaoDeAutenticacao {

  /**
   * Custo 12: cerca de 250 ms por verificação em hardware de servidor atual. É o bastante para
   * tornar força bruta cara sem que a espera apareça na tela de quem está entrando.
   */
  private static final int CUSTO_DO_BCRYPT = 12;

  @Bean
  public PasswordEncoder codificadorDeSenha() {
    return new BCryptPasswordEncoder(CUSTO_DO_BCRYPT);
  }

  @Bean
  @ConditionalOnProperty("spring.mail.host")
  public EnviadorDeCodigoDeRecuperacao enviadorPorEmail(
      MailSender correio, PropriedadesDeAutenticacao propriedades) {
    return new EnviadorPorEmail(correio, propriedades.remetente(), propriedades.validadeDoCodigo());
  }

  /**
   * Só entra quando o bean acima não foi criado — isto é, quando não há SMTP configurado. A ordem
   * de declaração dentro da mesma classe é o que garante essa avaliação.
   */
  @Bean
  @ConditionalOnMissingBean(EnviadorDeCodigoDeRecuperacao.class)
  public EnviadorDeCodigoDeRecuperacao enviadorParaLog() {
    return new EnviadorParaLog();
  }
}
