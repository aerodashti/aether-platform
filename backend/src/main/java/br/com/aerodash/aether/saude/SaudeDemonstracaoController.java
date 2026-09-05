package br.com.aerodash.aether.saude;

import br.com.aerodash.aether.comum.observabilidade.ContextoDaRequisicao;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Endpoint que existe só para demonstrar a observabilidade: ele falha de propósito para mostrar as
 * duas linhas de log de um request com erro (o ERROR com stack trace e a canônica com {@code
 * erro=true}), com o mesmo {@code trace_id} nas duas.
 *
 * <p>Fora de produção, por isso o {@code @Profile}. Não copie este padrão em feature de verdade.
 */
@RestController
@RequestMapping("/saude")
@Profile("!prod")
@Tag(name = "Saúde", description = "Situação operacional da plataforma")
public class SaudeDemonstracaoController {

  private final ContextoDaRequisicao contexto;

  public SaudeDemonstracaoController(ContextoDaRequisicao contexto) {
    this.contexto = contexto;
  }

  @GetMapping("/falha-proposital")
  @Operation(summary = "Falha de propósito, para demonstrar as duas linhas de log de um erro")
  public void falharDeProposito() {
    contexto.registrar("saude.demonstracao", "linha canônica com erro");
    contexto.decisao("saude.deve_falhar", true);
    throw new IllegalStateException("Falha proposital para demonstrar a observabilidade.");
  }
}
