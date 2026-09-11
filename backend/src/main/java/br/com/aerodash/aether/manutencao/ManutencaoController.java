package br.com.aerodash.aether.manutencao;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
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

/** A manutenção. Ler é de quem tem sessão; agendar, concluir e monitorar é de quem gere. */
@RestController
@RequestMapping("/manutencoes")
@Tag(name = "Manutenção", description = "Eventos e parâmetros de controle por aeronave")
public class ManutencaoController {

  private final ManutencaoService manutencoes;

  public ManutencaoController(ManutencaoService manutencoes) {
    this.manutencoes = manutencoes;
  }

  @GetMapping
  @Operation(summary = "O painel de uma aeronave: parâmetros julgados, programadas e histórico")
  public PainelDeManutencaoResponse painel(@RequestParam(name = "aeronave") Long aeronaveId) {
    return manutencoes.painel(aeronaveId);
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  @Operation(summary = "Agenda uma manutenção; ela aparece no calendário de voos")
  public ManutencaoResponse agendar(@Valid @RequestBody ManutencaoRequest request) {
    return manutencoes.agendar(request);
  }

  @PutMapping("/{id}")
  @Operation(summary = "Corrige uma manutenção")
  public ManutencaoResponse atualizar(
      @PathVariable Long id, @Valid @RequestBody ManutencaoRequest request) {
    return manutencoes.atualizar(id, request);
  }

  @PostMapping("/{id}/conclusao")
  @Operation(summary = "Conclui: sai das programadas e entra no histórico permanente")
  public ManutencaoResponse concluir(@PathVariable Long id) {
    return manutencoes.concluir(id);
  }

  @PostMapping("/{id}/reabertura")
  @Operation(summary = "Reabre uma conclusão feita por engano")
  public ManutencaoResponse reabrir(@PathVariable Long id) {
    return manutencoes.reabrir(id);
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  @Operation(summary = "Exclui um evento")
  public void excluir(@PathVariable Long id) {
    manutencoes.excluir(id);
  }

  @PostMapping("/parametros")
  @ResponseStatus(HttpStatus.CREATED)
  @Operation(summary = "Cria um parâmetro de controle")
  public ParametroResponse criarParametro(@Valid @RequestBody ParametroRequest request) {
    return manutencoes.criarParametro(request);
  }

  @PutMapping("/parametros/{id}")
  @Operation(summary = "Atualiza um parâmetro de controle")
  public ParametroResponse atualizarParametro(
      @PathVariable Long id, @Valid @RequestBody ParametroRequest request) {
    return manutencoes.atualizarParametro(id, request);
  }

  @DeleteMapping("/parametros/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  @Operation(summary = "Exclui um parâmetro de controle")
  public void excluirParametro(@PathVariable Long id) {
    manutencoes.excluirParametro(id);
  }
}
