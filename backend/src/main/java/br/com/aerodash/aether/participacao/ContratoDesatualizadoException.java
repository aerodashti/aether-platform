package br.com.aerodash.aether.participacao;

import br.com.aerodash.aether.comum.erro.ExcecaoDeDominio;
import org.springframework.http.HttpStatus;

/**
 * Outro contrato entrou em vigor desde que a edição foi aberta. Salvar mesmo assim arquivaria, sem
 * ninguém ver, a divisão que outra pessoa acabou de definir.
 */
public class ContratoDesatualizadoException extends ExcecaoDeDominio {

  private static final long serialVersionUID = 1L;

  public ContratoDesatualizadoException(String matricula) {
    super(
        "Contrato desatualizado",
        "O contrato de participação da "
            + matricula
            + " mudou enquanto você editava. Confira a divisão atual e salve de novo.");
  }

  @Override
  public HttpStatus getStatus() {
    return HttpStatus.CONFLICT;
  }
}
