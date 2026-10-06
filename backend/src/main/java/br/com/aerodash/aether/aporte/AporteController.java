package br.com.aerodash.aether.aporte;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.time.YearMonth;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
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
 * Os aportes ao fundo. Ler é de quem tem sessão — o proprietário vê o que aportou; registrar é de
 * quem gere a conta, regra em {@code ConfiguracaoDeSeguranca}.
 */
@RestController
@RequestMapping("/aportes")
@Tag(name = "Aportes", description = "Entradas de dinheiro dos proprietários no fundo da aeronave")
public class AporteController {

  private final AporteService aportes;

  public AporteController(AporteService aportes) {
    this.aportes = aportes;
  }

  @GetMapping
  @Operation(summary = "Lista os aportes do recorte, com o total aportado somado no servidor")
  public AportesResponse listar(
      @RequestParam(name = "aeronave", required = false) Long aeronaveId,
      @RequestParam(name = "de", required = false) YearMonth de,
      @RequestParam(name = "ate", required = false) YearMonth ate) {
    return aportes.listar(aeronaveId, de, ate);
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  @Operation(summary = "Registra um aporte já recebido")
  public AporteResponse criar(@Valid @RequestBody AporteRequest request) {
    return aportes.criar(request);
  }

  @PutMapping("/{id}")
  @Operation(summary = "Corrige um aporte")
  public AporteResponse atualizar(
      @PathVariable Long id, @Valid @RequestBody AporteRequest request) {
    return aportes.atualizar(id, request);
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  @Operation(summary = "Exclui um aporte registrado por engano")
  public void excluir(@PathVariable Long id) {
    aportes.excluir(id);
  }
}
