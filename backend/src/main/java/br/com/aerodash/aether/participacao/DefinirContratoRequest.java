package br.com.aerodash.aether.participacao;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.List;

/**
 * O contrato novo por inteiro: quem fica de fora da lista sai do contrato.
 *
 * <p>O pedido diz sobre qual contrato vigente foi montado. Se outro contrato entrou em vigor desde
 * então, o pedido é recusado: salvar por cima, em silêncio, apagaria a decisão de outra pessoa.
 */
@Schema(description = "Definição de um novo contrato de participação")
public record DefinirContratoRequest(
    @NotEmpty(message = "O contrato precisa de ao menos um proprietário.")
        List<@NotNull(message = "Informe a participação.") @Valid ParticipacaoRequest>
            participacoes,
    @Schema(
            description =
                "O contrato vigente que a edição tinha à vista, ou nulo se a aeronave não tinha"
                    + " contrato. Se o vigente mudou desde então, a resposta é 409.",
            example = "10")
        Long contratoVigenteId) {

  @Schema(description = "A participação de um proprietário")
  public record ParticipacaoRequest(
      @NotNull(message = "Informe o proprietário.") Long proprietarioId,
      // A coluna é NUMERIC(5,2) com CHECK de 0,01 a 100. As duas mensagens de limite servem para
      // 1000, que fere as duas regras de uma vez: a que o tratador escolher continua verdadeira.
      @NotNull(message = "Informe o percentual.")
          @DecimalMin(
              value = "0.01",
              message = "Todo proprietário precisa de participação maior que zero.")
          @DecimalMax(value = "100.00", message = "A participação vai até 100%.")
          @Digits(
              integer = 3,
              fraction = 2,
              message = "A participação vai até 100%, com no máximo duas casas decimais.")
          BigDecimal percentual) {}
}
