package br.com.aerodash.aether.fechamento;

import br.com.aerodash.aether.comum.erro.ExcecaoDeDominio;
import org.springframework.http.HttpStatus;

/**
 * O recorte pedido não fecha: período invertido ou competência fora da janela, por exemplo. A
 * recusa nomeia o parâmetro da consulta, para a tela marcar o filtro certo.
 */
public class FechamentoInvalidoException extends ExcecaoDeDominio {

  private static final long serialVersionUID = 1L;

  public FechamentoInvalidoException(String detalhe, String parametro) {
    super("Fechamento inválido", detalhe, parametro);
  }

  @Override
  public HttpStatus getStatus() {
    return HttpStatus.BAD_REQUEST;
  }
}
