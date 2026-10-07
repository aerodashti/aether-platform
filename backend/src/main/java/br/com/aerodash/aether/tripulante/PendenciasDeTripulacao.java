package br.com.aerodash.aether.tripulante;

import br.com.aerodash.aether.aeronave.Aeronave;
import br.com.aerodash.aether.aeronave.PendenciaOperacional;
import br.com.aerodash.aether.aeronave.PendenciasOperacionais;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * A tripulação respondendo à porta da aeronave: tripulante ativo com CMA ou CHT vencido pede
 * atenção na aeronave. Não impede o voo — quem não pode voar é o tripulante, não a aeronave —, mas
 * a frota deixa de dizer "Saudável" enquanto a escala tiver alguém irregular.
 */
@Component
class PendenciasDeTripulacao implements PendenciasOperacionais {

  private final TripulanteRepository tripulantes;

  PendenciasDeTripulacao(TripulanteRepository tripulantes) {
    this.tripulantes = tripulantes;
  }

  @Override
  @Transactional(readOnly = true)
  public Map<Long, List<PendenciaOperacional>> pendenciasDe(
      Collection<Aeronave> aeronaves, LocalDate hoje, int diasDeAviso) {
    Set<Long> ids = aeronaves.stream().map(Aeronave::getId).collect(Collectors.toSet());
    Map<Long, List<PendenciaOperacional>> pendencias = new HashMap<>();
    for (Tripulante tripulante : tripulantes.findAll()) {
      if (!tripulante.estaAtivo() || !ids.contains(tripulante.getAeronaveId())) {
        continue;
      }
      List<PendenciaOperacional> daAeronave =
          pendencias.computeIfAbsent(tripulante.getAeronaveId(), id -> new ArrayList<>());
      if (tripulante.possuiCmaVencido(hoje)) {
        daAeronave.add(
            PendenciaOperacional.deAtencao("CMA de " + tripulante.getNome() + " vencido"));
      }
      if (tripulante.possuiChtVencido(hoje)) {
        daAeronave.add(
            PendenciaOperacional.deAtencao("CHT de " + tripulante.getNome() + " vencido"));
      }
    }
    return pendencias;
  }
}
