package br.com.aerodash.aether.manutencao;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;

/**
 * Agendamento ou correção de uma manutenção.
 *
 * <p>Os limites são os das colunas ({@code NUMERIC(14,2)} no valor) e os mesmos de {@code
 * validacaoDaManutencao.ts}: o que passa daqui o banco arredondaria ou recusaria com um 500. A
 * janela da data depende de hoje e fica no service.
 */
@Schema(description = "Evento de manutenção")
public record ManutencaoRequest(
    @NotNull(message = "Informe a aeronave.") Long aeronaveId,
    @NotNull(message = "Informe a data.") LocalDate data,
    LocalTime hora,
    @Size(max = 120, message = "O responsável pode ter no máximo 120 caracteres.")
        String responsavel,
    @NotBlank(message = "Informe a descrição.")
        @Pattern(regexp = Espacos.ALGO_ALEM_DE_ESPACO, message = "Informe a descrição.")
        @Size(max = 200, message = "A descrição pode ter no máximo 200 caracteres.")
        String descricao,
    @Positive(message = "O valor precisa ser maior que zero.")
        @Digits(integer = 12, fraction = 2, message = MENSAGEM_DO_VALOR)
        BigDecimal valor) {

  static final String MENSAGEM_DO_VALOR =
      "O valor vai até 999.999.999.999,99, com no máximo duas casas decimais.";
}
