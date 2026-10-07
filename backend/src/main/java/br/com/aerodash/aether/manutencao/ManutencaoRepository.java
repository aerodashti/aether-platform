package br.com.aerodash.aether.manutencao;

import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ManutencaoRepository extends JpaRepository<Manutencao, Long> {

  /** Programadas em ordem de proximidade. */
  List<Manutencao> findByAeronaveIdAndStatusOrderByDataAsc(
      Long aeronaveId, StatusDaManutencao status);

  /** O histórico da conclusão mais recente para a mais antiga; no mesmo dia, pela programada. */
  List<Manutencao> findByAeronaveIdAndStatusOrderByConcluidaEmDescDataDesc(
      Long aeronaveId, StatusDaManutencao status);

  /** As programadas cuja data já passou, da frota inteira: a Central de avisos as cobra. */
  List<Manutencao> findByStatusAndDataBeforeOrderByDataAsc(
      StatusDaManutencao status, LocalDate data);
}
