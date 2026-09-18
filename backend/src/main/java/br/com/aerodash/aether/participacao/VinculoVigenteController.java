package br.com.aerodash.aether.participacao;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * As participações vigentes vistas pelo lado do proprietário.
 *
 * <p>Fica numa rota própria porque não é "de uma aeronave": a grade de proprietários precisa de
 * todos os contratos em vigor numa chamada só. Ler exige só sessão, como a lista de proprietários.
 */
@RestController
@RequestMapping("/participacoes/vigentes")
@Tag(name = "Participações", description = "Contratos de participação por aeronave")
public class VinculoVigenteController {

  private final ParticipacaoService participacoes;

  public VinculoVigenteController(ParticipacaoService participacoes) {
    this.participacoes = participacoes;
  }

  @GetMapping
  @Operation(summary = "Lista as participações de todos os contratos vigentes")
  public List<VinculoVigenteResponse> listar() {
    return participacoes.listarVinculosVigentes();
  }
}
