package br.com.aerodash.aether.troca;

import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.util.List;

/**
 * As trocas de uma situação, as contagens das duas abas e, com proprietário no filtro, o saldo de
 * horas que ele tem a devolver.
 */
@Schema(description = "Trocas de KM de um recorte")
public record TrocasResponse(
    List<TrocaResponse> trocas,
    long pendentes,
    long concluidas,
    @Schema(description = "Só com proprietário no filtro") SaldoDeHoras saldo) {

  @Schema(description = "Horas a devolver nas trocas pendentes")
  public record SaldoDeHoras(
      Long proprietarioId,
      @Schema(description = "Positivo: ele deve horas; negativo: devem a ele; zero: quite")
          BigDecimal horasADevolver) {}
}
