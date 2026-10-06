package br.com.aerodash.aether.aporte;

import java.time.YearMonth;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Duas consultas, com e sem aeronave. O período é sempre fechado: o service troca "sem limite"
 * pelas competências extremas, e o PostgreSQL não precisa tipar {@code ? is null} para data.
 */
public interface AporteRepository extends JpaRepository<Aporte, Long> {

  List<Aporte> findByAeronaveIdAndCompetenciaBetweenOrderByDataDescIdDesc(
      Long aeronaveId, YearMonth de, YearMonth ate);

  List<Aporte> findByCompetenciaBetweenOrderByDataDescIdDesc(YearMonth de, YearMonth ate);
}
