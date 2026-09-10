package br.com.aerodash.aether.tripulante;

import java.time.LocalDate;
import org.springframework.stereotype.Component;

/**
 * Escrito à mão porque os campos julgados (CMA e CHT vencidos) dependem de "hoje", e um mapeamento
 * declarativo aqui seria duas expressões `java()` em volta do resto.
 */
@Component
public class TripulanteMapper {

  public TripulanteResponse paraResponse(Tripulante tripulante, LocalDate hoje) {
    return new TripulanteResponse(
        tripulante.getId(),
        tripulante.getNome(),
        tripulante.getCanac(),
        tripulante.getFuncao(),
        tripulante.getValidadeCma(),
        tripulante.possuiCmaVencido(hoje),
        tripulante.getValidadeCht(),
        tripulante.possuiChtVencido(hoje),
        tripulante.getHorasTotais(),
        tripulante.getTelefone(),
        tripulante.getEmail(),
        tripulante.getSituacao());
  }
}
