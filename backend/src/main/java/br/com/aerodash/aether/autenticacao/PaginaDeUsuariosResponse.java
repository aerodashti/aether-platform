package br.com.aerodash.aether.autenticacao;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import org.springframework.data.domain.Page;

/**
 * Uma página da lista de usuários.
 *
 * <p>Forma própria em vez do {@code Page} do Spring Data porque a serialização dele não é contrato
 * estável — muda entre versões e carrega o objeto de ordenação inteiro para o front. Aqui vai o que
 * a paginação da tela precisa e nada mais.
 */
@Schema(description = "Página da lista de usuários")
public record PaginaDeUsuariosResponse(
    @Schema(description = "Os usuários desta página") List<UsuarioResponse> itens,
    @Schema(description = "Página corrente, começando em zero", example = "0") int pagina,
    @Schema(description = "Tamanho pedido", example = "20") int tamanho,
    @Schema(description = "Total de usuários que passam pelo filtro", example = "4") long total,
    @Schema(description = "Total de páginas", example = "1") int totalDePaginas) {

  public static PaginaDeUsuariosResponse de(Page<UsuarioResponse> pagina) {
    return new PaginaDeUsuariosResponse(
        pagina.getContent(),
        pagina.getNumber(),
        pagina.getSize(),
        pagina.getTotalElements(),
        pagina.getTotalPages());
  }
}
