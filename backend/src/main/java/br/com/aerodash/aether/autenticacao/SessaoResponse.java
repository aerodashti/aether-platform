package br.com.aerodash.aether.autenticacao;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Quem está na sessão. Só o necessário para a interface se identificar — e para ela saber o que
 * mostrar: o papel entra porque a navegação esconde a área restrita de quem não é administrador. A
 * decisão de verdade continua no servidor; o front usa isto para não oferecer o que seria recusado.
 */
@Schema(description = "Usuário da sessão corrente")
public record SessaoResponse(
    @Schema(description = "Nome de exibição", example = "Leonardo Andrade") String nome,
    @Schema(description = "E-mail cadastrado", example = "leonardo@administraair.com.br")
        String email,
    @Schema(description = "O que a pessoa é no Aether", example = "ADMINISTRADOR")
        PapelDoUsuario papel) {}
