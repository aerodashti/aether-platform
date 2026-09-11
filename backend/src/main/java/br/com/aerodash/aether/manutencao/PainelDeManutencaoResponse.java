package br.com.aerodash.aether.manutencao;

import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.util.List;

/** A tela inteira de uma aeronave: contadores de referência, parâmetros julgados e os eventos. */
@Schema(description = "Manutenção de uma aeronave")
public record PainelDeManutencaoResponse(
    @Schema(description = "Horas de célula atuais, a referência dos parâmetros")
        BigDecimal horasDeCelula,
    int ciclos,
    List<ParametroResponse> parametros,
    @Schema(description = "Programadas, em ordem de proximidade")
        List<ManutencaoResponse> programadas,
    @Schema(description = "Concluídas, da mais recente para a mais antiga")
        List<ManutencaoResponse> historico) {}
