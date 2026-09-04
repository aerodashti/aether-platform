package br.com.aerodash.aether.saude;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

/** Situação consolidada da plataforma. */
@Schema(description = "Situação consolidada da plataforma")
public record SaudeResponse(
    @Schema(description = "Pior situação entre os componentes") SituacaoDeSaude situacaoGeral,
    @Schema(description = "Versão da aplicação", example = "0.1.0") String versao,
    @Schema(description = "Situação de cada componente monitorado")
        List<ComponenteDeSaudeResponse> componentes) {}
