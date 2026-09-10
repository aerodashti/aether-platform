package br.com.aerodash.aether.tripulante;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TripulanteRepository extends JpaRepository<Tripulante, Long> {

  /** A tripulação de uma aeronave, em ordem de nome. Poucas pessoas por equipamento. */
  List<Tripulante> findByAeronaveIdOrderByNomeAsc(Long aeronaveId);
}
