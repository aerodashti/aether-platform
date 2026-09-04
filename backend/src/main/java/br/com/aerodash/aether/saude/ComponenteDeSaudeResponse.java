package br.com.aerodash.aether.saude;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;

/** Situação de um componente da plataforma. */
@Schema(description = "Situação de um componente da plataforma")
public record ComponenteDeSaudeResponse(
    @Schema(description = "Nome do componente monitorado", example = "banco") String componente,
    @Schema(description = "Situação atual do componente") SituacaoDeSaude situacao,
    @Schema(description = "Momento da última verificação") Instant verificadoEm,
    @Schema(description = "Verdadeiro quando o componente está operante e foi verificado há pouco")
        boolean saudavel) {}
