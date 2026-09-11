package br.com.aerodash.aether.custo;

import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.util.List;

/** O recorte pedido e a linha de TOTAL dele — fixos e variáveis somados no servidor. */
@Schema(description = "Lançamentos de custo de um recorte")
public record LancamentosResponse(
    List<CustoResponse> custos,
    @Schema(description = "Totais do recorte") TotaisDosLancamentos totais) {

  @Schema(description = "Totais do recorte, em BRL")
  public record TotaisDosLancamentos(BigDecimal fixos, BigDecimal variaveis, BigDecimal total) {}
}
