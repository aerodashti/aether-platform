package br.com.aerodash.aether.aeronave;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

/**
 * O cadastro completo da tela "Nova aeronave": identificação, parâmetros atuais e configuração
 * financeira, num ato só. O contrato de participações é um segundo passo da mesma tela, na rota
 * dele — aeronave sem contrato é estado válido do domínio.
 *
 * <p>O vencimento do CVA não está no protótipo e entra por adaptação deliberada: a situação
 * regulatória da frota é derivada dele, e cadastrar sem CVA criaria uma linha sem a coluna que dá
 * sentido à tela. Ver {@code docs/design-system.md}.
 */
@Schema(description = "Cadastro de uma nova aeronave")
public record CriarAeronaveRequest(
    @Schema(description = "Matrícula no RAB", example = "PS-AER")
        @NotBlank(message = "Informe a matrícula.")
        @Pattern(
            regexp = "(?i)P[PRSTU]-[A-Z]{3}",
            message = "A matrícula segue o padrão do RAB: PS-MEP.")
        String matricula,
    @Size(max = 80, message = "O fabricante pode ter no máximo 80 caracteres.") String fabricante,
    @NotBlank(message = "Informe o modelo.")
        @Size(max = 120, message = "O modelo pode ter no máximo 120 caracteres.")
        String modelo,
    @Size(max = 40, message = "O número de série pode ter no máximo 40 caracteres.")
        String numeroDeSerie,
    @NotBlank(message = "Informe a base.")
        @Pattern(
            regexp = "[A-Za-z]{4}",
            message = "A base é um código ICAO de quatro letras, como SBSP.")
        String base,
    @Size(max = 60, message = "O hangar pode ter no máximo 60 caracteres.") String hangar,
    @Size(max = 40, message = "A apólice pode ter no máximo 40 caracteres.") String apoliceDoSeguro,
    @Positive(message = "O peso máximo de decolagem precisa ser maior que zero.")
        Integer pesoMaxDecolagemKg,
    @Positive(message = "O peso máximo de pouso precisa ser maior que zero.")
        Integer pesoMaxPousoKg,
    @Schema(description = "Vencimento do CVA") @NotNull(message = "Informe o vencimento do CVA.")
        LocalDate vencimentoCva,
    @Schema(description = "Vigência do seguro RETA (vencimento)")
        @NotNull(message = "Informe a vigência do seguro.")
        LocalDate vencimentoReta,
    @Schema(description = "Valores acumulados na data do cadastro")
        @NotNull(message = "Informe os parâmetros atuais.")
        @Valid
        ContadoresRequest contadores,
    @Schema(description = "Rateio e fundo")
        @NotNull(message = "Informe a configuração financeira.")
        @Valid
        ConfiguracaoFinanceiraRequest configuracaoFinanceira) {}
