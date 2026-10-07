package br.com.aerodash.aether.voo;

import br.com.aerodash.aether.proprietario.CorDeIdentificacao;
import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

/**
 * Uma linha do diário. A atribuição já chega com nome e cor: a tela não faz N buscas para pintar a
 * grade, e a duração vem calculada — realizado quando completo, senão previsto.
 */
@Schema(description = "Trecho do diário de voos")
public record TrechoResponse(
    Long id,
    Long aeronaveId,
    @Schema(description = "Matrícula da aeronave", example = "PS-MEP") String matricula,
    String relatorioDeVoo,
    int numeroDoTrecho,
    LocalDate data,
    String origem,
    String destino,
    @Schema(description = "Duração em horas, uma casa; nula sem par de horários") BigDecimal horas,
    BigDecimal km,
    @Schema(description = "Instante com fuso, em ISO 8601", example = "2026-09-01T11:30:00Z")
        OffsetDateTime partidaPrevista,
    OffsetDateTime pousoPrevisto,
    OffsetDateTime partidaRealizada,
    OffsetDateTime pousoRealizado,
    Long proprietarioId,
    @Schema(description = "Nome de quem usou; nulo em voo de manutenção") String nomeDoProprietario,
    CorDeIdentificacao corDeIdentificacao,
    boolean vooDeManutencao,
    String observacoes) {}
