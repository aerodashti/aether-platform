package br.com.aerodash.aether.fechamento;

import br.com.aerodash.aether.aeronave.BaseDoRateio;
import br.com.aerodash.aether.aeronave.ModeloDeAporte;
import br.com.aerodash.aether.proprietario.CorDeIdentificacao;
import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.List;

/** O fechamento de uma competência de uma aeronave: indicadores, uma linha por proprietário. */
@Schema(description = "Fechamento mensal de uma aeronave")
public record FechamentoMensalResponse(
    Long aeronaveId,
    String matricula,
    @Schema(type = "string", example = "2026-09") YearMonth competencia,
    BaseDoRateio baseDoRateio,
    ModeloDeAporte modeloDeAporte,
    Indicadores indicadores,
    List<LinhaDoProprietario> linhas,
    @Schema(description = "Soma das linhas") LinhaDoProprietario totais,
    @Schema(description = "Custos sem contrato para ratear: pesam no fundo, em conta nenhuma")
        BigDecimal naoRateado,
    BigDecimal saldoInicialDoFundo,
    BigDecimal saldoFinalDoFundo) {

  @Schema(description = "Totais da aeronave na competência")
  public record Indicadores(
      @Schema(description = "Todas as horas, inclusive as de manutenção") BigDecimal horas,
      BigDecimal custosFixos,
      BigDecimal custosVariaveis,
      BigDecimal totalDeCustos,
      BigDecimal aportes,
      BigDecimal rendimentos,
      @Schema(description = "Entradas menos custos") BigDecimal resultado) {}

  @Schema(description = "A conta de um proprietário na competência")
  public record LinhaDoProprietario(
      Long proprietarioId,
      String nome,
      CorDeIdentificacao corDeIdentificacao,
      @Schema(description = "% de propriedade no fim da competência") BigDecimal percentual,
      @Schema(description = "Horas voadas por ele, sem as de manutenção") BigDecimal horas,
      @Schema(description = "% das horas atribuídas do mês") BigDecimal percentualDeUso,
      BigDecimal custoFixo,
      BigDecimal custoVariavel,
      BigDecimal totalDoMes,
      BigDecimal aportes,
      BigDecimal rendimentos,
      BigDecimal saldoAnterior,
      @Schema(description = "Positivo é crédito; negativo, dívida") BigDecimal saldoAcumulado) {}
}
