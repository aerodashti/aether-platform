package br.com.aerodash.aether.troca;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * As trocas de KM. Ler é de quem tem sessão — o proprietário vê o que deve e o que lhe devem;
 * registrar, corrigir, concluir e reabrir é de quem gere a conta.
 */
@RestController
@RequestMapping("/trocas")
@Tag(name = "Trocas de KM", description = "Horas cedidas entre proprietários, a devolver")
public class TrocaController {

  private final TrocaService trocas;

  public TrocaController(TrocaService trocas) {
    this.trocas = trocas;
  }

  @GetMapping
  @Operation(summary = "As trocas de uma situação, com as contagens e o saldo do proprietário")
  public TrocasResponse listar(
      @RequestParam(name = "aeronave", required = false) Long aeronaveId,
      @RequestParam(name = "proprietario", required = false) Long proprietarioId,
      @RequestParam(name = "situacao", required = false) SituacaoDaTroca situacao) {
    return trocas.listar(aeronaveId, proprietarioId, situacao);
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  @Operation(summary = "Registra uma troca, pendente até a devolução")
  public TrocaResponse registrar(@Valid @RequestBody TrocaRequest request) {
    return trocas.registrar(request);
  }

  @PutMapping("/{id}")
  @Operation(summary = "Corrige uma troca")
  public TrocaResponse atualizar(@PathVariable Long id, @Valid @RequestBody TrocaRequest request) {
    return trocas.atualizar(id, request);
  }

  @PostMapping("/{id}/conclusao")
  @Operation(summary = "Registra a devolução das horas")
  public TrocaResponse concluir(@PathVariable Long id) {
    return trocas.concluir(id);
  }

  @PostMapping("/{id}/reabertura")
  @Operation(summary = "Volta a troca para pendente — para o engano")
  public TrocaResponse reabrir(@PathVariable Long id) {
    return trocas.reabrir(id);
  }
}
