package br.com.aerodash.aether.autenticacao;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * A tela de Usuários: quem tem acesso ao Aether e por qual papel.
 *
 * <p>Toda rota daqui exige ADMINISTRADOR, e a exigência não está escrita neste arquivo — está em
 * {@link ConfiguracaoDeSeguranca}, que é a fonte única de quem entra onde. Repetir a regra em
 * anotação aqui criaria dois lugares para ela divergir.
 */
@RestController
@RequestMapping("/usuarios")
@Tag(name = "Usuários", description = "Administração de acesso — restrita a administradores")
public class UsuarioController {

  private final UsuarioService usuarios;

  public UsuarioController(UsuarioService usuarios) {
    this.usuarios = usuarios;
  }

  @GetMapping
  @Operation(
      summary = "Lista os usuários, com busca por nome ou e-mail e filtros de papel e situação")
  public PaginaDeUsuariosResponse listar(
      @RequestParam(required = false) String busca,
      @RequestParam(required = false) PapelDoUsuario papel,
      @RequestParam(required = false) SituacaoDoUsuario situacao,
      @PageableDefault(size = 20, sort = "nome") Pageable paginacao) {
    return PaginaDeUsuariosResponse.de(usuarios.listar(busca, papel, situacao, paginacao));
  }

  @PostMapping
  @Operation(summary = "Convida alguém: cria o acesso em PENDENTE e envia o link do convite")
  public ResponseEntity<UsuarioResponse> convidar(
      @Valid @RequestBody ConvidarUsuarioRequest requisicao) {
    UsuarioResponse convidado =
        usuarios.convidar(requisicao.nome(), requisicao.email(), requisicao.papel());
    return ResponseEntity.status(HttpStatus.CREATED).body(convidado);
  }

  /** 202, e não 200: o que a chamada garante é que o convite saiu, não que ele chegou. */
  @PostMapping("/{id}/convite")
  @Operation(summary = "Reenvia o convite, invalidando o link anterior")
  public ResponseEntity<Void> reenviarConvite(@PathVariable Long id) {
    usuarios.reenviarConvite(id);
    return ResponseEntity.accepted().build();
  }

  @PostMapping("/{id}/desativacao")
  @Operation(summary = "Revoga o acesso, sem apagar a pessoa nem seu histórico")
  public UsuarioResponse desativar(
      @PathVariable Long id, @AuthenticationPrincipal UsuarioAutenticado solicitante) {
    return usuarios.desativar(id, solicitante);
  }

  @PostMapping("/{id}/reativacao")
  @Operation(summary = "Devolve o acesso ao estado de onde ele saiu")
  public UsuarioResponse reativar(
      @PathVariable Long id, @AuthenticationPrincipal UsuarioAutenticado solicitante) {
    return usuarios.reativar(id, solicitante);
  }
}
