package br.com.aerodash.aether.autenticacao;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SessaoDeAcessoRepository extends JpaRepository<SessaoDeAcesso, Long> {

  /** Recebe o hash do token, nunca o token que veio no cookie. */
  Optional<SessaoDeAcesso> findByToken(String token);

  /** As sessões ainda abertas do usuário, menos a do token informado (o hash dele). */
  @Query(
      """
      select s from SessaoDeAcesso s
       where s.usuario = :usuario
         and s.token <> :tokenMantido
         and s.encerradaEm is null
         and s.expiraEm > :agora
      """)
  List<SessaoDeAcesso> buscarOutrasVigentes(
      @Param("usuario") Usuario usuario,
      @Param("tokenMantido") String tokenMantido,
      @Param("agora") Instant agora);
}
