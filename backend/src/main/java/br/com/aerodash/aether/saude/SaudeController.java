package br.com.aerodash.aether.saude;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/saude")
@Tag(name = "Saúde", description = "Situação operacional da plataforma")
public class SaudeController {

  private final SaudeService service;

  public SaudeController(SaudeService service) {
    this.service = service;
  }

  public RegistroDeSaude violacaoTemporaria(SaudeRepository repositorio) {
    return repositorio.findAll().get(0);
  }

  @GetMapping
  @Operation(summary = "Verifica e devolve a situação consolidada da plataforma")
  public SaudeResponse verificarSituacaoGeral() {
    return service.verificarSituacaoGeral();
  }

  @GetMapping("/componente/{componente}")
  @Operation(summary = "Consulta a situação de um componente específico")
  public ComponenteDeSaudeResponse consultarComponente(@PathVariable String componente) {
    return service.consultarComponente(componente);
  }
}
