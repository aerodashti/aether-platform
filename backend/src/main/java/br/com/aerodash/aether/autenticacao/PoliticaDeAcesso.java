package br.com.aerodash.aether.autenticacao;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import org.springframework.stereotype.Component;

/**
 * A política de acesso vigente, com o relógio que ela usa.
 *
 * <p>Os números vêm de {@link PropriedadesDeAutenticacao} e o "agora" vem do {@code Clock}
 * injetado. Andam juntos porque toda pergunta que a política responde é sobre um instante: quanto
 * tempo o bloqueio dura a partir de agora, se o código ainda vale agora. Manter os dois num objeto
 * só também evita que cada serviço receba a configuração e o relógio como parâmetros separados.
 */
@Component
public class PoliticaDeAcesso {

  private final PropriedadesDeAutenticacao propriedades;
  private final Clock relogio;

  public PoliticaDeAcesso(PropriedadesDeAutenticacao propriedades, Clock relogio) {
    this.propriedades = propriedades;
    this.relogio = relogio;
  }

  public Instant agora() {
    return Instant.now(relogio);
  }

  public Duration duracaoDaSessao() {
    return propriedades.duracaoDaSessao();
  }

  public int tentativasAteBloquear() {
    return propriedades.tentativasAteBloquear();
  }

  public Duration duracaoDoBloqueio() {
    return propriedades.duracaoDoBloqueio();
  }

  public Duration validadeDoCodigo() {
    return propriedades.validadeDoCodigo();
  }

  public int tentativasPorCodigo() {
    return propriedades.tentativasPorCodigo();
  }

  public Duration intervaloEntreCodigos() {
    return propriedades.intervaloEntreCodigos();
  }
}
