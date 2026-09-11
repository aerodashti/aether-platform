package br.com.aerodash.aether.manutencao;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ManutencaoRepository extends JpaRepository<Manutencao, Long> {

  /** Programadas em ordem de proximidade; o histórico do mais recente para o mais antigo. */
  List<Manutencao> findByAeronaveIdAndStatusOrderByDataAsc(
      Long aeronaveId, StatusDaManutencao status);

  List<Manutencao> findByAeronaveIdAndStatusOrderByDataDesc(
      Long aeronaveId, StatusDaManutencao status);
}
