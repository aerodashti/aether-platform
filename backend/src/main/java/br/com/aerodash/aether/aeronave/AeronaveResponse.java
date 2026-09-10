package br.com.aerodash.aether.aeronave;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDate;

/**
 * Uma linha da lista da frota.
 *
 * <p>A situação e os dias vêm calculados do servidor, e não derivados no front, porque conformidade
 * depende de "hoje" e de uma política — e dois clientes lendo a mesma tela em fusos diferentes não
 * podem ver situações diferentes para a mesma aeronave.
 */
@Schema(description = "Aeronave sob gestão")
public record AeronaveResponse(
    @Schema(description = "Identificador", example = "1") Long id,
    @Schema(description = "Matrícula no RAB", example = "PS-MEP") String matricula,
    @Schema(description = "Modelo", example = "Cessna Citation XLS+") String modelo,
    @Schema(description = "Aeródromo base, em código ICAO", example = "SBSP") String base,
    @Schema(description = "Conformidade regulatória agora", example = "REGULAR")
        SituacaoRegular situacaoRegular,
    @Schema(description = "Documento que vence primeiro", example = "CVA")
        DocumentoDaAeronave documentoDoProximoVencimento,
    @Schema(description = "Data do vencimento mais próximo") LocalDate proximoVencimento,
    @Schema(description = "Dias até esse vencimento; negativo quando já passou", example = "12")
        long diasAteOProximoVencimento,
    @Schema(description = "Se a aeronave está liberada para voar", example = "true")
        boolean podeVoar) {}
