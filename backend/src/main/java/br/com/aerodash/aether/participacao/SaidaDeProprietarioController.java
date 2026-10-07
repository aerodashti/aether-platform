package br.com.aerodash.aether.participacao;

import br.com.aerodash.aether.autenticacao.UsuarioAutenticado;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * A saída do proprietário que está em contrato vigente. Fica sob {@code /proprietarios} porque é o
 * que a pessoa faz na tela de Proprietários — e herda dali a autorização de quem gere a conta.
 */
@RestController
@Tag(name = "Participações", description = "Contratos de participação por aeronave")
public class SaidaDeProprietarioController {

  private final SaidaDeProprietarioService saidas;

  public SaidaDeProprietarioController(SaidaDeProprietarioService saidas) {
    this.saidas = saidas;
  }

  @PostMapping("/proprietarios/{proprietarioId}/saida")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  @Operation(summary = "Redistribui a participação de quem sai e o desativa")
  public void sair(
      @PathVariable Long proprietarioId,
      @Valid @RequestBody SaidaDeProprietarioRequest request,
      @AuthenticationPrincipal UsuarioAutenticado solicitante) {
    saidas.sair(proprietarioId, request, solicitante.nome());
  }
}
