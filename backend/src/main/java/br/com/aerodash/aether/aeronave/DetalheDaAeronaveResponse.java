package br.com.aerodash.aether.aeronave;

import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * A aeronave inteira, para a tela de Detalhe: identidade, conformidade, ficha técnica e
 * configuração financeira. A lista da frota continua com {@link AeronaveResponse} — carregar isto
 * tudo em trinta linhas seria peso sem pergunta.
 */
@Schema(description = "Detalhe de uma aeronave")
public record DetalheDaAeronaveResponse(
    Long id,
    @Schema(example = "PS-MEP") String matricula,
    @Schema(example = "Cessna") String fabricante,
    @Schema(example = "Citation XLS+") String modelo,
    @Schema(example = "560-6321") String numeroDeSerie,
    @Schema(description = "Aeródromo base, em código ICAO", example = "SBSP") String base,
    @Schema(example = "Hangar 7 — Congonhas") String hangar,
    @Schema(description = "Número da apólice; a vigência é o vencimento da RETA")
        String apoliceDoSeguro,
    SituacaoRegular situacaoRegular,
    DocumentoDaAeronave documentoDoProximoVencimento,
    LocalDate proximoVencimento,
    long diasAteOProximoVencimento,
    boolean podeVoar,
    LocalDate vencimentoCva,
    LocalDate vencimentoReta,
    @Schema(description = "Totais acumulados declarados") Contadores contadores,
    @Schema(description = "Rateio e fundo") Financeiro configuracaoFinanceira) {

  @Schema(description = "Totais acumulados da aeronave")
  public record Contadores(
      BigDecimal horasDeCelula,
      int ciclos,
      BigDecimal kmVoados,
      BigDecimal horasMotor1,
      BigDecimal horasMotor2,
      BigDecimal horasApu) {}

  @Schema(description = "Configuração financeira da aeronave")
  public record Financeiro(
      BaseDoRateio baseDoRateio,
      ModeloDeAporte modeloDeAporte,
      int periodicidadeDoAporteMeses,
      BigDecimal valorDoAporte,
      int diaDeFechamento) {}
}
