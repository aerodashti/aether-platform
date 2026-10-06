package br.com.aerodash.aether.aporte;

import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

/** Como em {@link AporteRepository}: duas consultas, sempre com o período fechado. */
public interface RendimentoRepository extends JpaRepository<Rendimento, Long> {

  List<Rendimento> findByAeronaveIdAndDataBetweenOrderByDataDescIdDesc(
      Long aeronaveId, LocalDate inicio, LocalDate fim);

  List<Rendimento> findByDataBetweenOrderByDataDescIdDesc(LocalDate inicio, LocalDate fim);
}
