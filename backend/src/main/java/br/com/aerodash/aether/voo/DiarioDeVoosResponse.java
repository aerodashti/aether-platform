package br.com.aerodash.aether.voo;

import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.util.List;

/** O recorte pedido e a linha de TOTAIS dele — somada aqui, não no navegador. */
@Schema(description = "Diário de voos de um recorte")
public record DiarioDeVoosResponse(
    List<TrechoResponse> trechos,
    @Schema(description = "Totais do recorte") TotaisDoDiario totais) {

  /** Só o realizado, como nos contadores da aeronave: o planejado ainda não voou. */
  @Schema(description = "Totais do que foi realizado no recorte")
  public record TotaisDoDiario(BigDecimal horas, BigDecimal km, long pousos) {}
}
