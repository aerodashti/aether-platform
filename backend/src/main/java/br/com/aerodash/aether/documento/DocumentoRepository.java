package br.com.aerodash.aether.documento;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DocumentoRepository extends JpaRepository<Documento, Long> {

  List<Documento> findByAeronaveIdOrderByCriadoEmDescIdDesc(Long aeronaveId);

  /** Busca pela aeronave junto: um id de documento de outra aeronave na URL é 404, não acesso. */
  Optional<Documento> findByIdAndAeronaveId(Long id, Long aeronaveId);
}
