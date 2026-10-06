package br.com.aerodash.aether.aviso;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDate;

@Schema(description = "Aviso da Central, derivado do estado da frota")
public record AvisoResponse(
    @Schema(description = "Identidade estável; muda quando o prazo muda") String chave,
    CategoriaDoAviso categoria,
    GravidadeDoAviso gravidade,
    String titulo,
    String detalhe,
    Long aeronaveId,
    String matricula,
    String modelo,
    @Schema(description = "Nulo quando o limite é de horas ou ciclos") LocalDate prazo,
    @Schema(description = "A tela onde o aviso se resolve") String destino,
    boolean lido) {}
