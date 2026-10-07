package br.com.aerodash.aether.manutencao;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ParametroDeControleRepository extends JpaRepository<ParametroDeControle, Long> {

  List<ParametroDeControle> findByAeronaveIdOrderByNomeAsc(Long aeronaveId);

  /** O nome já usado na aeronave, sem diferença de maiúsculas. */
  boolean existsByAeronaveIdAndNomeIgnoreCase(Long aeronaveId, String nome);

  /** O mesmo, fora o próprio parâmetro — na correção, manter o nome não é duplicar. */
  boolean existsByAeronaveIdAndNomeIgnoreCaseAndIdNot(Long aeronaveId, String nome, Long id);
}
