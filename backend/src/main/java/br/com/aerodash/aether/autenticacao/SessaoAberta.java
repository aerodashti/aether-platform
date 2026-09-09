package br.com.aerodash.aether.autenticacao;

import java.time.Duration;

/**
 * Resultado de uma entrada bem-sucedida: o token em claro — a única vez em que ele existe fora do
 * cookie — mais o que a interface precisa mostrar. O controller transforma isto em `Set-Cookie`.
 */
public record SessaoAberta(String token, Duration duracao, SessaoResponse usuario) {}
