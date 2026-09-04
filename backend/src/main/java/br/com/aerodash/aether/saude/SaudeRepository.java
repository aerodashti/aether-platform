package br.com.aerodash.aether.saude;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SaudeRepository extends JpaRepository<RegistroDeSaude, Long> {

  Optional<RegistroDeSaude> findByComponente(String componente);

  List<RegistroDeSaude> findAllByOrderByComponenteAsc();
}
