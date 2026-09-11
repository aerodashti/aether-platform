package br.com.aerodash.aether.manutencao;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ParametroDeControleRepository extends JpaRepository<ParametroDeControle, Long> {

  List<ParametroDeControle> findByAeronaveIdOrderByNomeAsc(Long aeronaveId);
}
