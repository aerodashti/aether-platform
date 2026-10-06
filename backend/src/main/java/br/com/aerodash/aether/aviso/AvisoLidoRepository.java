package br.com.aerodash.aether.aviso;

import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;

public interface AvisoLidoRepository extends JpaRepository<AvisoLido, Long> {

  List<AvisoLido> findByUsuarioId(Long usuarioId);

  @Modifying
  void deleteByUsuarioIdAndChaveIn(Long usuarioId, Collection<String> chaves);
}
