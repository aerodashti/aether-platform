package br.com.aerodash.aether.autenticacao;

import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

  /** O e-mail é gravado normalizado, então a busca também recebe o valor já normalizado. */
  Optional<Usuario> findByEmail(String email);

  boolean existsByEmail(String email);

  /**
   * A lista da tela de Usuários: busca por nome ou e-mail, filtro por papel e por situação.
   *
   * <p>Os três critérios são opcionais e combinam entre si. Papel e situação chegam nulos quando a
   * tela está em "todos"; {@code busca} chega sempre preenchida — no mínimo como {@code %} — porque
   * um {@code like} com parâmetro nulo não é a mesma coisa que ausência de filtro.
   */
  @Query(
      """
      select u from Usuario u
       where (:papel is null or u.papel = :papel)
         and (:situacao is null or u.situacao = :situacao)
         and (lower(u.nome) like :busca or u.email like :busca)
      """)
  Page<Usuario> buscar(
      @Param("busca") String busca,
      @Param("papel") PapelDoUsuario papel,
      @Param("situacao") SituacaoDoUsuario situacao,
      Pageable paginacao);
}
