package br.com.aerodash.aether.documento;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;

@Schema(description = "Documento anexado a uma aeronave")
public record DocumentoResponse(
    Long id,
    Long aeronaveId,
    String nome,
    String tipoDeConteudo,
    @Schema(description = "Em bytes") long tamanho,
    String enviadoPor,
    Instant criadoEm) {}
