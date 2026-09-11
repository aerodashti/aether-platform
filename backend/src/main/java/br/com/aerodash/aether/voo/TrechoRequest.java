package br.com.aerodash.aether.voo;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;

/** Lançamento ou correção de um trecho — o mesmo corpo, como no painel do protótipo. */
@Schema(description = "Um trecho do diário de voos")
public record TrechoRequest(
    @NotNull(message = "Informe a aeronave.") Long aeronaveId,
    @Schema(description = "Identificador do voo", example = "RV-2026-018")
        @NotBlank(message = "Informe o relatório de voo.")
        @Size(max = 20, message = "O relatório de voo pode ter no máximo 20 caracteres.")
        String relatorioDeVoo,
    @NotNull(message = "Informe o número do trecho.")
        @Min(value = 1, message = "O trecho começa em 1.")
        Integer numeroDoTrecho,
    @NotNull(message = "Informe a data do trecho.") LocalDate data,
    @NotBlank(message = "Informe a origem.")
        @Pattern(regexp = "[A-Za-z]{4}", message = "A origem é um código ICAO de quatro letras.")
        String origem,
    @NotBlank(message = "Informe o destino.")
        @Pattern(regexp = "[A-Za-z]{4}", message = "O destino é um código ICAO de quatro letras.")
        String destino,
    @NotNull(message = "Informe os quilômetros do trecho.")
        @Positive(message = "Os quilômetros precisam ser maiores que zero.")
        BigDecimal km,
    LocalTime partidaPrevista,
    LocalTime pousoPrevisto,
    LocalTime partidaRealizada,
    LocalTime pousoRealizado,
    @Schema(description = "Quem usou; nulo é voo de manutenção, dividido entre todos")
        Long proprietarioId,
    @Size(max = 500, message = "As observações podem ter no máximo 500 caracteres.")
        String observacoes) {}
