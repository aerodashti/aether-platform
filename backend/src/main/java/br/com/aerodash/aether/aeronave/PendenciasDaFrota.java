package br.com.aerodash.aether.aeronave;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;

/**
 * Junta as respostas de todas as fontes de pendência — manutenção, tripulação, as que vierem — numa
 * lista por aeronave. O serviço pergunta a um só lugar e não precisa saber quantas fontes existem.
 */
@Component
public class PendenciasDaFrota {

  private final List<PendenciasOperacionais> fontes;

  public PendenciasDaFrota(List<PendenciasOperacionais> fontes) {
    this.fontes = fontes;
  }

  public Map<Long, List<PendenciaOperacional>> de(
      Collection<Aeronave> aeronaves, LocalDate hoje, int diasDeAviso) {
    Map<Long, List<PendenciaOperacional>> porAeronave = new HashMap<>();
    for (PendenciasOperacionais fonte : fontes) {
      fonte
          .pendenciasDe(aeronaves, hoje, diasDeAviso)
          .forEach(
              (aeronaveId, pendencias) ->
                  porAeronave
                      .computeIfAbsent(aeronaveId, id -> new ArrayList<>())
                      .addAll(pendencias));
    }
    return porAeronave;
  }

  public List<PendenciaOperacional> de(Aeronave aeronave, LocalDate hoje, int diasDeAviso) {
    return de(List.of(aeronave), hoje, diasDeAviso).getOrDefault(aeronave.getId(), List.of());
  }
}
