package br.com.aerodash.aether.aporte;

import br.com.aerodash.aether.proprietario.CorDeIdentificacao;
import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;

/** Uma linha de aportes, com matrícula, nome e cor resolvidos no servidor. */
@Schema(description = "Aporte de proprietário no fundo")
public record AporteResponse(
    Long id,
    Long aeronaveId,
    String matricula,
    Long proprietarioId,
    String nomeDoProprietario,
    CorDeIdentificacao corDeIdentificacao,
    LocalDate data,
    @Schema(type = "string", example = "2026-09") YearMonth competencia,
    BigDecimal valor) {}
