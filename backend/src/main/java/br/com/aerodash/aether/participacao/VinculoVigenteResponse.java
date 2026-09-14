package br.com.aerodash.aether.participacao;

import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;

/**
 * Um proprietário numa aeronave, pelo contrato vigente. É a linha da grade de proprietários: a tela
 * agrupa por proprietário e desenha a barra de cada aeronave.
 */
@Schema(description = "Participação vigente de um proprietário numa aeronave")
public record VinculoVigenteResponse(
    @Schema(description = "Identificador do proprietário", example = "1") Long proprietarioId,
    @Schema(description = "Identificador da aeronave", example = "3") Long aeronaveId,
    @Schema(description = "Matrícula da aeronave", example = "PS-AER") String matricula,
    @Schema(description = "Modelo da aeronave", example = "Phenom 300E") String modelo,
    @Schema(description = "Percentual de propriedade, duas casas", example = "33.34")
        BigDecimal percentual) {}
