package br.com.aerodash.aether.autenticacao;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Escreve o código no log em vez de enviá-lo. É o que roda quando {@code spring.mail.host} não está
 * configurado, para que o fluxo inteiro funcione em desenvolvimento sem servidor de e-mail.
 *
 * <p>Sai em WARN, e não em INFO, por dois motivos: no código de negócio INFO não existe (a linha
 * canônica é a única linha de sucesso), e imprimir um código de acesso é exatamente o tipo de coisa
 * que alguém precisa notar caso escape para produção — que é o que a própria mensagem avisa.
 */
public class EnviadorParaLog implements EnviadorDeCodigoDeRecuperacao {

  private static final Logger log = LoggerFactory.getLogger(EnviadorParaLog.class);

  @Override
  public void enviar(Usuario usuario, String codigo) {
    log.warn(
        "SMTP não configurado: o código de recuperação de {} é {}."
            + " Isto é um recurso de desenvolvimento — configure spring.mail.host em produção.",
        usuario.getEmail(),
        codigo);
  }
}
