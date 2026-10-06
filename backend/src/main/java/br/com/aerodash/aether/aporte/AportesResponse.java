package br.com.aerodash.aether.aporte;

import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.util.List;

/** Os aportes do recorte e o total aportado nele, somado no servidor. */
@Schema(description = "Aportes de um recorte")
public record AportesResponse(List<AporteResponse> aportes, BigDecimal total) {}
