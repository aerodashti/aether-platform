package br.com.aerodash.aether.aeronave;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "O que, além dos documentos, pesa na situação da aeronave")
public record PendenciaResponse(
    @Schema(example = "Limite estourado: Pesagem regulamentar") String descricao,
    @Schema(description = "VENCIDO impede o voo; ATENCAO só avisa", example = "VENCIDO")
        SituacaoRegular situacao) {}
