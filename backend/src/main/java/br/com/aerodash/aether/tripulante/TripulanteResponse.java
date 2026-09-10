package br.com.aerodash.aether.tripulante;

import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Uma linha da tripulação. Os vencimentos de CMA e CHT vêm julgados do servidor, como os da
 * aeronave: dois fusos lendo a mesma tela não podem discordar sobre quem pode voar.
 */
@Schema(description = "Tripulante vinculado à aeronave")
public record TripulanteResponse(
    Long id,
    String nome,
    @Schema(description = "Código ANAC, só dígitos") String canac,
    FuncaoDoTripulante funcao,
    LocalDate validadeCma,
    @Schema(description = "Se o CMA já venceu; falso quando não informado") boolean cmaVencido,
    LocalDate validadeCht,
    @Schema(description = "Se o CHT já venceu; falso quando não informado") boolean chtVencido,
    BigDecimal horasTotais,
    String telefone,
    String email,
    SituacaoDoTripulante situacao) {}
