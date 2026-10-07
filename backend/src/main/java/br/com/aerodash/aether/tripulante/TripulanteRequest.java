package br.com.aerodash.aether.tripulante;

import br.com.aerodash.aether.comum.validacao.FormatoDeEmail;
import br.com.aerodash.aether.comum.validacao.FormatoDeTelefone;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Cadastro ou atualização de um tripulante — o mesmo corpo, como no painel do protótipo. Os limites
 * são os da tela ({@code validacaoDoTripulante.ts}) e os da coluna: o que passar daqui cabe no
 * banco. A janela das validades depende de "hoje" e é conferida pelo service.
 */
@Schema(description = "Dados de um tripulante da aeronave")
public record TripulanteRequest(
    @NotBlank(message = "Informe o nome do tripulante.")
        @Size(max = 120, message = "O nome pode ter no máximo 120 caracteres.")
        String nome,
    @Schema(description = "Código ANAC: 6 dígitos, com ou sem máscara", example = "123456")
        @Pattern(regexp = FormatoDoCanac.EXPRESSAO, message = FormatoDoCanac.MENSAGEM)
        String canac,
    @NotNull(message = "Escolha a função na aeronave.") FuncaoDoTripulante funcao,
    @Schema(description = "Validade do Certificado Médico Aeronáutico, de 2000 a hoje + 5 anos")
        LocalDate validadeCma,
    @Schema(description = "Validade do Certificado de Habilitação Técnica, de 2000 a hoje + 5 anos")
        LocalDate validadeCht,
    @Schema(description = "Horas totais de voo, até 60.000 h com uma casa decimal")
        @PositiveOrZero(message = "Horas totais não podem ser negativas.")
        @DecimalMax(value = "60000", message = "Use até 60.000 h.")
        @Digits(
            integer = 9,
            fraction = 1,
            message = "Use até 60.000 h, com no máximo 1 casa decimal.")
        BigDecimal horasTotais,
    @Size(max = 20, message = "O telefone pode ter no máximo 20 caracteres.")
        @Pattern(regexp = FormatoDeTelefone.EXPRESSAO, message = FormatoDeTelefone.MENSAGEM)
        String telefone,
    @Email(regexp = FormatoDeEmail.EXPRESSAO, message = FormatoDeEmail.MENSAGEM)
        @Size(max = 180, message = "O e-mail pode ter no máximo 180 caracteres.")
        String email,
    @NotNull(message = "Informe a situação.") SituacaoDoTripulante situacao) {}
