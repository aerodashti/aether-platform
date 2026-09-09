package br.com.aerodash.aether.autenticacao;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SessaoDeAcessoRepository extends JpaRepository<SessaoDeAcesso, Long> {

  /** Recebe o hash do token, nunca o token que veio no cookie. */
  Optional<SessaoDeAcesso> findByToken(String token);
}
