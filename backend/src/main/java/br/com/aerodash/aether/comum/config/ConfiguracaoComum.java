package br.com.aerodash.aether.comum.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import java.time.Clock;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Beans transversais da aplicação: metadados do OpenAPI e a fonte de tempo. */
@Configuration
public class ConfiguracaoComum {

  @Bean
  public OpenAPI openApi(@Value("${aether.versao}") String versao) {
    return new OpenAPI()
        .info(
            new Info()
                .title("Aether")
                .version(versao)
                .description(
                    "API do Aether: gestão de aeronaves particulares e da camada regulatória"
                        + " brasileira."));
  }

  /**
   * A fonte de tempo é injetada para que regras que dependem de "agora" possam ser testadas sem
   * esperar o relógio.
   */
  @Bean
  public Clock relogio() {
    return Clock.systemUTC();
  }
}
