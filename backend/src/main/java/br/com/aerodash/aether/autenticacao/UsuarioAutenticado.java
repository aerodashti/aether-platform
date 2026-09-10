package br.com.aerodash.aether.autenticacao;

import java.util.Collection;
import java.util.List;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

/**
 * Quem está por trás do cookie desta requisição.
 *
 * <p>É um retrato, não a entidade: sai do serviço já desligado do banco, com apenas o que a
 * autorização e os controllers precisam. Assim o filtro não carrega um {@code Usuario} destacado
 * pelo resto do request nem depende de sessão aberta do Hibernate.
 */
public record UsuarioAutenticado(Long id, String nome, PapelDoUsuario papel) {

  /** O prefixo {@code ROLE_} é o que {@code hasRole} do Spring Security procura. */
  public static final String PREFIXO_DE_PAPEL = "ROLE_";

  public static UsuarioAutenticado de(Usuario usuario) {
    return new UsuarioAutenticado(usuario.getId(), usuario.getNome(), usuario.getPapel());
  }

  public Collection<GrantedAuthority> autoridades() {
    return List.of(new SimpleGrantedAuthority(PREFIXO_DE_PAPEL + papel.name()));
  }

  public boolean ehAdministrador() {
    return papel == PapelDoUsuario.ADMINISTRADOR;
  }
}
