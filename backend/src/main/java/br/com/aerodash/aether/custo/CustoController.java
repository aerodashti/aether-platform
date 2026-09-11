package br.com.aerodash.aether.custo;

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
 * Os lançamentos de custo. Ler é de quem tem sessão — o proprietário vê o que paga; escrever é de
 * quem gere a conta, regra em {@code ConfiguracaoDeSeguranca}.
 */
@RestController
@RequestMapping("/custos")
@Tag(name = "Custos", description = "Lançamentos de despesa por aeronave e competência")
public class CustoController {

  private final CustoService custos;

  public CustoController(CustoService custos) {
    this.custos = custos;
  }

  @GetMapping
  @Operation(summary = "Lista o recorte pedido, com fixos e variáveis somados no servidor")
  public LancamentosResponse listar(
      @RequestParam(name = "aeronave", required = false) Long aeronaveId,
      @RequestParam(name = "competencia", required = false) YearMonth competencia) {
    return custos.listar(aeronaveId, competencia);
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  @Operation(summary = "Registra um lançamento; em USD o BRL é derivado do câmbio, uma vez")
  public CustoResponse criar(@Valid @RequestBody CustoRequest request) {
    return custos.criar(request);
  }

  @PutMapping("/{id}")
  @Operation(summary = "Corrige um lançamento")
  public CustoResponse atualizar(@PathVariable Long id, @Valid @RequestBody CustoRequest request) {
    return custos.atualizar(id, request);
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  @Operation(summary = "Exclui um lançamento feito por engano")
  public void excluir(@PathVariable Long id) {
    custos.excluir(id);
  }
}
