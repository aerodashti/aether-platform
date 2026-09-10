package br.com.aerodash.aether.autenticacao;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;

/**
 * Uma linha da tela de Usuários.
 *
 * <p>{@code situacao} vai crua, e não como um rótulo pronto: "Convite pendente" e "INATIVO" são
 * texto de interface, e traduzir no servidor amarraria a API à redação de uma tela.
 */
@Schema(description = "Usuário com acesso ao Aether")
public record UsuarioResponse(
    @Schema(description = "Identificador", example = "1") Long id,
    @Schema(description = "Nome de exibição", example = "Leonardo Andrade") String nome,
    @Schema(description = "E-mail cadastrado", example = "leonardo@administraair.com.br")
        String email,
    @Schema(description = "O que a pessoa é no Aether", example = "ADMINISTRADOR")
        PapelDoUsuario papel,
    @Schema(description = "Onde está no ciclo de vida", example = "ATIVO")
        SituacaoDoUsuario situacao,
    @Schema(description = "Última entrada bem-sucedida; nulo para quem nunca entrou")
        Instant ultimoAcesso) {}
