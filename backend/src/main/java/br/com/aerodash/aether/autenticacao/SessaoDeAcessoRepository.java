package br.com.aerodash.aether.autenticacao;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SessaoDeAcessoRepository extends JpaRepository<SessaoDeAcesso, Long> {

  /** Recebe o hash do token, nunca o token que veio no cookie. */
  Optional<SessaoDeAcesso> findByToken(String token);

  /**
   * As sessões que ninguém encerrou ainda — as expiradas vêm junto e encerrá-las é inofensivo. É a
   * consulta dos dois fluxos que encerram sessões: redefinir pelo código encerra todas, e trocar a
   * senha logado encerra todas menos a de quem trocou.
   */
  List<SessaoDeAcesso> findByUsuarioAndEncerradaEmIsNull(Usuario usuario);
}
