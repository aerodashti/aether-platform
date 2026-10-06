package br.com.aerodash.aether.aviso;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

/** Todos os avisos ativos, do mais urgente ao menos, com os indicadores da Central. */
@Schema(description = "Avisos ativos da frota")
public record AvisosResponse(List<AvisoResponse> avisos, Indicadores indicadores) {

  @Schema(description = "Os números do topo da Central e do sino")
  public record Indicadores(
      long ativos, long naoLidos, long vencidos, long proximos, long aeronavesEnvolvidas) {}
}
