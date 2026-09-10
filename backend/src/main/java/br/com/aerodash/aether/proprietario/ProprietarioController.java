package br.com.aerodash.aether.proprietario;

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
 * Os proprietários.
 *
 * <p>Ler exige só sessão: o nome e a cor aparecem em grades da operação inteira. Escrever é de quem
 * administra o cadastro — a regra mora em {@code ConfiguracaoDeSeguranca}, como as demais.
 */
@RestController
@RequestMapping("/proprietarios")
@Tag(name = "Proprietários", description = "Titulares de participação nas aeronaves")
public class ProprietarioController {

  private final ProprietarioService proprietarios;

  public ProprietarioController(ProprietarioService proprietarios) {
    this.proprietarios = proprietarios;
  }

  @GetMapping
  @Operation(summary = "Lista os proprietários em ordem de nome")
  public List<ProprietarioResponse> listar() {
    return proprietarios.listar();
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  @Operation(summary = "Cadastra um proprietário")
  public ProprietarioResponse criar(@Valid @RequestBody ProprietarioRequest request) {
    return proprietarios.criar(request);
  }

  @PutMapping("/{id}")
  @Operation(summary = "Atualiza o cadastro de um proprietário")
  public ProprietarioResponse atualizar(
      @PathVariable Long id, @Valid @RequestBody ProprietarioRequest request) {
    return proprietarios.atualizar(id, request);
  }

  @PostMapping("/{id}/desativacao")
  @Operation(summary = "Desativa um proprietário, preservando o histórico")
  public ProprietarioResponse desativar(@PathVariable Long id) {
    return proprietarios.desativar(id);
  }

  @PostMapping("/{id}/reativacao")
  @Operation(summary = "Reativa um proprietário desativado")
  public ProprietarioResponse reativar(@PathVariable Long id) {
    return proprietarios.reativar(id);
  }
}
