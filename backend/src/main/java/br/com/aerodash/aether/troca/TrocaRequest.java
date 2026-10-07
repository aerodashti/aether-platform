package br.com.aerodash.aether.troca;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Registro ou correção de uma troca de KM.
 *
 * <p>Os limites são os das colunas ({@code NUMERIC(6,1)} nas horas, {@code NUMERIC(10,1)} no KM,
 * {@code NUMERIC(12,2)} no R$/hora) e os mesmos de {@code validacaoDaTroca.ts}: o que passa daqui o
 * banco arredondaria em silêncio ou recusaria com 500. As horas param em 1.000 por troca — acima
 * disso é dígito a mais, não hora cedida.
 */
@Schema(description = "Horas cedidas entre proprietários de uma aeronave")
public record TrocaRequest(
    @NotNull(message = "Informe a aeronave.") Long aeronaveId,
    @NotNull(message = "Informe a data da troca.") LocalDate data,
    @Schema(description = "Quem cedeu as horas") @NotNull(message = "Informe quem cedeu.")
        Long cedenteId,
    @Schema(description = "Quem recebeu e vai devolver") @NotNull(message = "Informe quem recebeu.")
        Long recebedorId,
    @NotNull(message = "Informe as horas voadas.")
        @Positive(message = "As horas precisam ser maiores que zero.")
        @DecimalMax(value = "1000", message = MENSAGEM_DAS_HORAS)
        @Digits(integer = 5, fraction = 1, message = MENSAGEM_DAS_HORAS)
        BigDecimal horas,
    @PositiveOrZero(message = "O KM não pode ser negativo.")
        @Digits(integer = 9, fraction = 1, message = MENSAGEM_DO_KM)
        BigDecimal km,
    @Schema(description = "Valor combinado por hora, para acerto em dinheiro")
        @Positive(message = "O valor por hora precisa ser maior que zero.")
        @Digits(integer = 10, fraction = 2, message = MENSAGEM_DO_VALOR_POR_HORA)
        BigDecimal valorPorHora,
    @Size(max = 20, message = "O Rel. Voo pode ter no máximo 20 caracteres.")
        @Pattern(regexp = SEM_CONTROLE, message = MENSAGEM_DE_CONTROLE)
        String relatorioDeVoo,
    @Size(max = 300, message = "A observação pode ter no máximo 300 caracteres.")
        @Pattern(regexp = SEM_CONTROLE_EXCETO_LINHAS, message = MENSAGEM_DE_CONTROLE)
        String observacao) {

  static final String MENSAGEM_DAS_HORAS =
      "As horas de uma troca vão até 1.000, com no máximo uma casa decimal.";

  static final String MENSAGEM_DO_KM =
      "O KM vai até 999.999.999,9, com no máximo uma casa decimal.";

  static final String MENSAGEM_DO_VALOR_POR_HORA =
      "O valor por hora vai até 9.999.999.999,99, com no máximo duas casas decimais.";

  static final String MENSAGEM_DE_CONTROLE = "Use só texto, sem caracteres de controle.";

  /** O PostgreSQL recusa o caractere nulo num texto: sem isto, ele chegaria ao banco como 500. */
  private static final String SEM_CONTROLE = "^\\P{Cntrl}*$";

  /** A observação é de várias linhas: quebra e tabulação são texto; o resto do controle, não. */
  private static final String SEM_CONTROLE_EXCETO_LINHAS =
      "^[^\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]*$";
}
