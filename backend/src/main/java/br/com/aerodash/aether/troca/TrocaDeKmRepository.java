package br.com.aerodash.aether.troca;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Sem paginação: trocas são dezenas por ano. O recorte por aeronave e proprietário é feito no
 * service, sobre a lista de uma situação.
 */
public interface TrocaDeKmRepository extends JpaRepository<TrocaDeKm, Long> {

  List<TrocaDeKm> findAllByOrderByDataDescIdDesc();
}
