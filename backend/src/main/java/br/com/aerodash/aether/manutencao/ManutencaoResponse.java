package br.com.aerodash.aether.manutencao;

import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;

@Schema(description = "Evento de manutenção")
public record ManutencaoResponse(
    Long id,
    Long aeronaveId,
    LocalDate data,
    LocalTime hora,
    String responsavel,
    String descricao,
    BigDecimal valor,
    StatusDaManutencao status) {}
