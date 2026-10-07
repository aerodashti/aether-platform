package br.com.aerodash.aether.participacao;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ContratoDeParticipacaoRepository
    extends JpaRepository<ContratoDeParticipacao, Long> {

  Optional<ContratoDeParticipacao> findByAeronaveIdAndFimDaVigenciaIsNull(Long aeronaveId);

  /**
   * Todos os contratos em vigor, com as participações já carregadas: é uma consulta só para a grade
   * de proprietários, que sem o grafo faria um SELECT por contrato.
   */
  @EntityGraph(attributePaths = "participacoes")
  List<ContratoDeParticipacao> findByFimDaVigenciaIsNull();

  /** Todos os contratos da aeronave, do primeiro ao vigente, com as participações: o fechamento. */
  @EntityGraph(attributePaths = "participacoes")
  List<ContratoDeParticipacao> findByAeronaveIdOrderByInicioDaVigenciaAsc(Long aeronaveId);

  /** Se o proprietário está ou esteve em algum contrato da aeronave, vigente ou arquivado. */
  boolean existsByAeronaveIdAndParticipacoesProprietarioId(Long aeronaveId, Long proprietarioId);

  /** Os contratos vigentes de que o proprietário participa: a saída redistribui cada um. */
  @EntityGraph(attributePaths = "participacoes")
  List<ContratoDeParticipacao> findByFimDaVigenciaIsNullAndParticipacoesProprietarioId(
      Long proprietarioId);

  /** O histórico, do mais recente para o mais antigo — a ordem em que a tela o conta. */
  List<ContratoDeParticipacao> findByAeronaveIdAndFimDaVigenciaIsNotNullOrderByFimDaVigenciaDesc(
      Long aeronaveId);
}
