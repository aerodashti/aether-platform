package br.com.aerodash.aether.comum.observabilidade;

import io.opentelemetry.context.Context;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.task.TaskDecorator;

/**
 * Configuração do que não vem pronto do {@code opentelemetry-spring-boot-starter}.
 *
 * <p>O SDK, o exporter e a instrumentação são configurados por propriedades em {@code
 * application.yml} — não por Java Agent — para que tudo esteja visível no repositório.
 */
@Configuration
public class ConfiguracaoDeObservabilidade {

  /**
   * Faz o contexto do OpenTelemetry atravessar a fronteira de thread do {@code @Async} e de
   * qualquer {@code TaskExecutor} do Spring. Como o estado do {@link ContextoDaRequisicao} vive
   * dentro desse contexto, o span e os atributos acumulados vão junto.
   *
   * <p>O Spring Boot aplica automaticamente um único bean de {@link TaskDecorator} ao executor que
   * ele mesmo configura, então não é preciso declarar o executor aqui.
   */
  @Bean
  public TaskDecorator decoradorDeContextoOtel() {
    return tarefa -> Context.current().wrap(tarefa);
  }
}
