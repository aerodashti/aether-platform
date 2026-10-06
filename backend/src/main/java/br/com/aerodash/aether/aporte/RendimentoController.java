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
 * Os rendimentos da aplicação do fundo. Mesma regra de acesso dos aportes, em {@code
 * ConfiguracaoDeSeguranca}.
 */
@RestController
@RequestMapping("/rendimentos")
@Tag(name = "Rendimentos", description = "O que a aplicação do saldo do fundo rendeu")
public class RendimentoController {

  private final RendimentoService rendimentos;

  public RendimentoController(RendimentoService rendimentos) {
    this.rendimentos = rendimentos;
  }

  @GetMapping
  @Operation(summary = "Lista os rendimentos do recorte, com o total somado no servidor")
  public RendimentosResponse listar(
      @RequestParam(name = "aeronave", required = false) Long aeronaveId,
      @RequestParam(name = "de", required = false) YearMonth de,
      @RequestParam(name = "ate", required = false) YearMonth ate) {
    return rendimentos.listar(aeronaveId, de, ate);
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  @Operation(summary = "Registra um rendimento já creditado")
  public RendimentoResponse criar(@Valid @RequestBody RendimentoRequest request) {
    return rendimentos.criar(request);
  }

  @PutMapping("/{id}")
  @Operation(summary = "Corrige um rendimento")
  public RendimentoResponse atualizar(
      @PathVariable Long id, @Valid @RequestBody RendimentoRequest request) {
    return rendimentos.atualizar(id, request);
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  @Operation(summary = "Exclui um rendimento registrado por engano")
  public void excluir(@PathVariable Long id) {
    rendimentos.excluir(id);
  }
}
