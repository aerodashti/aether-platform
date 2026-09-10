package br.com.aerodash.aether.tripulante;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * A tripulação de uma aeronave. Sob {@code /aeronaves} porque o vínculo é com ela — e porque a
 * autorização da frota (leitura com sessão, escrita de quem gere) já cobre estas rotas.
 */
@RestController
@RequestMapping("/aeronaves/{aeronaveId}/tripulantes")
@Tag(name = "Tripulação", description = "Pilotos vinculados a cada aeronave")
public class TripulanteController {

  private final TripulanteService tripulantes;

  public TripulanteController(TripulanteService tripulantes) {
    this.tripulantes = tripulantes;
  }

  @GetMapping
  @Operation(summary = "Lista a tripulação em ordem de nome, com CMA e CHT julgados")
  public List<TripulanteResponse> listar(@PathVariable Long aeronaveId) {
    return tripulantes.listar(aeronaveId);
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  @Operation(summary = "Vincula um tripulante à aeronave")
  public TripulanteResponse criar(
      @PathVariable Long aeronaveId, @Valid @RequestBody TripulanteRequest request) {
    return tripulantes.criar(aeronaveId, request);
  }

  @PutMapping("/{id}")
  @Operation(summary = "Atualiza um tripulante, situação incluída")
  public TripulanteResponse atualizar(
      @PathVariable Long aeronaveId,
      @PathVariable Long id,
      @Valid @RequestBody TripulanteRequest request) {
    return tripulantes.atualizar(aeronaveId, id, request);
  }
}
