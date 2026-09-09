package br.com.aerodash.aether.autenticacao;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Os números que governam entrada e recuperação. Ficam em configuração, e não como constante no
 * código, porque são política de segurança: mudam com o ambiente e sem recompilar.
 *
 * @param duracaoDaSessao por quanto tempo o cookie de sessão vale
 * @param tentativasAteBloquear falhas seguidas de senha que suspendem a conta
 * @param duracaoDoBloqueio quanto tempo a conta fica suspensa depois disso
 * @param validadeDoCodigo janela de vida do código de seis dígitos
 * @param tentativasPorCodigo palpites permitidos antes de o código morrer
 * @param intervaloEntreCodigos espera mínima antes de reenviar um código novo
 * @param remetente endereço que assina o e-mail de recuperação
 * @param cookieSeguro marca o cookie como {@code Secure}; falso só em desenvolvimento sem HTTPS
 */
@ConfigurationProperties("aether.autenticacao")
public record PropriedadesDeAutenticacao(
    Duration duracaoDaSessao,
    int tentativasAteBloquear,
    Duration duracaoDoBloqueio,
    Duration validadeDoCodigo,
    int tentativasPorCodigo,
    Duration intervaloEntreCodigos,
    String remetente,
    boolean cookieSeguro) {}
