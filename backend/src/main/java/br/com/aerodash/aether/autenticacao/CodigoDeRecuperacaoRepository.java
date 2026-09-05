package br.com.aerodash.aether.autenticacao;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CodigoDeRecuperacaoRepository extends JpaRepository<CodigoDeRecuperacao, Long> {

  /**
   * O código vigente é sempre o último emitido: pedir um novo aposenta o anterior, então não faz
   * sentido procurar em qualquer outro.
   */
  Optional<CodigoDeRecuperacao> findFirstByUsuarioOrderByCriadoEmDesc(Usuario usuario);
}
