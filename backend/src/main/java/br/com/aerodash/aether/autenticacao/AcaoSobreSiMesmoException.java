package br.com.aerodash.aether.autenticacao;

import br.com.aerodash.aether.comum.erro.ExcecaoDeDominio;
import org.springframework.http.HttpStatus;

/**
 * O administrador tentou desativar ou rebaixar a própria conta.
 *
 * <p>A recusa não é paternalismo: é o que impede o último administrador de trancar a si mesmo do
 * lado de fora da única tela que poderia desfazer o engano. Outro administrador pode fazê-lo.
 */
public class AcaoSobreSiMesmoException extends ExcecaoDeDominio {

  private static final long serialVersionUID = 1L;

  public AcaoSobreSiMesmoException() {
    super(
        "Ação não permitida",
        "Você não pode alterar o próprio acesso. Peça a outro administrador.");
  }

  @Override
  public HttpStatus getStatus() {
    return HttpStatus.CONFLICT;
  }
}
