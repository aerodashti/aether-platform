package br.com.aerodash.aether.autenticacao;

import io.swagger.v3.oas.annotations.media.Schema;

/** Quem está na sessão. Só o necessário para a interface se identificar. */
@Schema(description = "Usuário da sessão corrente")
public record SessaoResponse(
    @Schema(description = "Nome de exibição", example = "Leonardo Andrade") String nome,
    @Schema(description = "E-mail cadastrado", example = "leonardo@administraair.com.br")
        String email) {}
