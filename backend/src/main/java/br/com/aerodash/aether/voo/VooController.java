package br.com.aerodash.aether.voo;

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
 * O diário de voos. Ler é de quem tem sessão; lançar e corrigir inclui o piloto — é ele quem volta
 * do voo com os horários realizados na mão.
 */
@RestController
@RequestMapping("/voos")
@Tag(name = "Diário de voos", description = "Trechos voados por aeronave e competência")
public class VooController {

  private final VooService voos;

  public VooController(VooService voos) {
    this.voos = voos;
  }

  @GetMapping
  @Operation(summary = "Lista o recorte pedido, com a linha de totais somada no servidor")
  public DiarioDeVoosResponse listar(
      @RequestParam(name = "aeronave", required = false) Long aeronaveId,
      @RequestParam(name = "competencia", required = false) YearMonth competencia) {
    return voos.listar(aeronaveId, competencia);
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  @Operation(summary = "Lança um trecho e alimenta os contadores da aeronave")
  public TrechoResponse criar(@Valid @RequestBody TrechoRequest request) {
    return voos.criar(request);
  }

  @PutMapping("/{id}")
  @Operation(summary = "Corrige um trecho, estornando e reaplicando os contadores")
  public TrechoResponse atualizar(
      @PathVariable Long id, @Valid @RequestBody TrechoRequest request) {
    return voos.atualizar(id, request);
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  @Operation(summary = "Exclui um trecho lançado por engano, estornando os contadores")
  public void excluir(@PathVariable Long id) {
    voos.excluir(id);
  }
}
