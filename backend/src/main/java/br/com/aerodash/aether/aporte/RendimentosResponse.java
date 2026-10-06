package br.com.aerodash.aether.aporte;

import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.util.List;

/** Os rendimentos do recorte e o total rendido nele. */
@Schema(description = "Rendimentos de um recorte")
public record RendimentosResponse(List<RendimentoResponse> rendimentos, BigDecimal total) {}
