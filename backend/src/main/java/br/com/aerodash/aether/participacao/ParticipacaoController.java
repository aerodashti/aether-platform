package br.com.aerodash.aether.participacao;

import br.com.aerodash.aether.autenticacao.UsuarioAutenticado;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Os contratos de participação de uma aeronave. As rotas moram sob {@code /aeronaves} porque é lá
 * que a tela pergunta; a autorização vem junto: leitura de quem tem sessão, escrita de quem gere.
 */
@RestController
@RequestMapping("/aeronaves/{aeronaveId}/contratos")
@Tag(name = "Participações", description = "Contratos de participação por aeronave")
public class ParticipacaoController {

  private final ParticipacaoService participacoes;

  public ParticipacaoController(ParticipacaoService participacoes) {
    this.participacoes = participacoes;
  }

  @GetMapping
  @Operation(summary = "Devolve o contrato vigente e o histórico")
  public ContratosDaAeronaveResponse consultar(@PathVariable Long aeronaveId) {
    return participacoes.consultar(aeronaveId);
  }

  @PostMapping
  @Operation(summary = "Define um novo contrato e arquiva o vigente")
  public ContratosDaAeronaveResponse definir(
      @PathVariable Long aeronaveId,
      @Valid @RequestBody DefinirContratoRequest request,
      @AuthenticationPrincipal UsuarioAutenticado solicitante) {
    return participacoes.definir(aeronaveId, request, solicitante.nome());
  }
}
