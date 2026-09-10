package br.com.aerodash.aether.participacao;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ContratoDeParticipacaoRepository
    extends JpaRepository<ContratoDeParticipacao, Long> {

  Optional<ContratoDeParticipacao> findByAeronaveIdAndFimDaVigenciaIsNull(Long aeronaveId);

  /** O histórico, do mais recente para o mais antigo — a ordem em que a tela o conta. */
  List<ContratoDeParticipacao> findByAeronaveIdAndFimDaVigenciaIsNotNullOrderByFimDaVigenciaDesc(
      Long aeronaveId);
}
