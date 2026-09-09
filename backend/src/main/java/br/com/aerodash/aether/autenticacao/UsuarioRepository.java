package br.com.aerodash.aether.autenticacao;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

  /** O e-mail é gravado normalizado, então a busca também recebe o valor já normalizado. */
  Optional<Usuario> findByEmail(String email);
}
