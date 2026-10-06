package br.com.aerodash.aether.aviso;

import br.com.aerodash.aether.autenticacao.UsuarioAutenticado;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * A Central de avisos e o sino da casca. Todo papel lê; a leitura (lido/não lido) é de cada
 * usuário, então marcar também é de todos.
 */
@RestController
@RequestMapping("/avisos")
@Tag(name = "Avisos", description = "O que a frota pede de ação agora")
public class AvisoController {

  private final AvisoService avisos;

  public AvisoController(AvisoService avisos) {
    this.avisos = avisos;
  }

  @GetMapping
  @Operation(summary = "Os avisos ativos, do mais urgente ao menos, com o que este usuário já leu")
  public AvisosResponse listar(@AuthenticationPrincipal UsuarioAutenticado usuario) {
    return avisos.listar(usuario.id());
  }

  @PutMapping("/leitura")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  @Operation(summary = "Marca avisos como lidos ou não lidos")
  public void marcar(
      @AuthenticationPrincipal UsuarioAutenticado usuario,
      @Valid @RequestBody LeituraRequest request) {
    avisos.marcar(usuario.id(), request);
  }
}
