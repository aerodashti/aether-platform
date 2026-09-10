package br.com.aerodash.aether.autenticacao;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Convite sem SMTP: o link sai no log, em WARN.
 *
 * <p>WARN, e não INFO, por duas razões que apontam para o mesmo lugar: no código de negócio INFO
 * não existe (veja {@code docs/observabilidade.md}), e um convite que não foi enviado de verdade é
 * exatamente o tipo de coisa que precisa incomodar quem lê o log.
 */
public class EnviadorDeConviteParaLog implements EnviadorDeConvite {

  private static final Logger log = LoggerFactory.getLogger(EnviadorDeConviteParaLog.class);

  private final String enderecoBase;

  public EnviadorDeConviteParaLog(String enderecoBase) {
    this.enderecoBase = enderecoBase;
  }

  @Override
  public void enviar(Usuario usuario, String token) {
    log.warn(
        "Sem SMTP configurado: o convite do usuário {} não foi enviado. Link: {}?convite={}",
        usuario.getId(),
        enderecoBase,
        token);
  }
}
