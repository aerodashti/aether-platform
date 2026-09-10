package br.com.aerodash.aether.autenticacao;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ConviteRepository extends JpaRepository<Convite, Long> {

  /** Recebe o hash do token, nunca o token que veio no link. */
  Optional<Convite> findByToken(String token);

  Optional<Convite> findFirstByUsuarioOrderByCriadoEmDesc(Usuario usuario);
}
