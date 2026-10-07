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

/**
 * Um limite monitorado: numérico para horas e ciclos, data para o calendário.
 *
 * <p>Limite e aviso cabem em {@code NUMERIC(10,1)}, como em {@code validacaoDoParametro.ts}: uma
 * casa a mais o banco arredondaria em silêncio — 0,01 h viraria um limite zero. O que depende da
 * régua (o limite exigido, ciclos e dias inteiros, o aviso antes do limite) é regra da entidade.
 */
@Schema(description = "Parâmetro de controle")
public record ParametroRequest(
    @NotNull(message = "Informe a aeronave.") Long aeronaveId,
    @NotBlank(message = "Informe o nome do parâmetro.")
        @Pattern(regexp = Espacos.ALGO_ALEM_DE_ESPACO, message = "Informe o nome do parâmetro.")
        @Size(max = 120, message = "O nome pode ter no máximo 120 caracteres.")
        String nome,
    @NotNull(message = "Escolha o tipo do parâmetro.") TipoDeParametro tipo,
    @Positive(message = "O limite precisa ser maior que zero.")
        @Digits(integer = 9, fraction = 1, message = MENSAGEM_DO_LIMITE)
        BigDecimal limite,
    LocalDate dataLimite,
    @NotNull(message = "Informe a faixa de aviso.")
        @Positive(message = "A faixa de aviso precisa ser maior que zero.")
        @Digits(integer = 9, fraction = 1, message = MENSAGEM_DO_AVISO)
        BigDecimal aviso) {

  static final String MENSAGEM_DO_LIMITE =
      "O limite vai até 999.999.999,9, com no máximo uma casa decimal.";

  static final String MENSAGEM_DO_AVISO =
      "A faixa de aviso vai até 999.999.999,9, com no máximo uma casa decimal.";
}
