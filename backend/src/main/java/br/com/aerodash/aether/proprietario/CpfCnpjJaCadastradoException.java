package br.com.aerodash.aether.proprietario;

import br.com.aerodash.aether.comum.erro.ExcecaoDeDominio;
import org.springframework.http.HttpStatus;

/**
 * Já existe um proprietário com este documento.
 *
 * <p>Dizer quem é o certo aqui: quem cadastra proprietários já vê a lista inteira, e o documento
 * duplicado quase sempre significa que a pessoa já está cadastrada — às vezes com outro nome, às
 * vezes inativa, e aí o caminho é reativar, não cadastrar de novo.
 */
public class CpfCnpjJaCadastradoException extends ExcecaoDeDominio {

  private static final long serialVersionUID = 1L;
  private static final String TITULO = "CPF ou CNPJ já cadastrado";
  private static final String CAMPO = "cpfCnpj";

  /** Quando só o banco percebeu a repetição e o titular não está à mão. */
  public CpfCnpjJaCadastradoException() {
    super(TITULO, "Já existe um proprietário com este documento.", CAMPO);
  }

  public CpfCnpjJaCadastradoException(String nomeDoTitular, boolean titularEstaAtivo) {
    super(TITULO, detalhe(nomeDoTitular, titularEstaAtivo), CAMPO);
  }

  private static String detalhe(String nomeDoTitular, boolean titularEstaAtivo) {
    return titularEstaAtivo
        ? "Este documento já é de " + nomeDoTitular + "."
        : "Este documento já é de "
            + nomeDoTitular
            + ", hoje inativo: reative o cadastro dele em vez de criar outro.";
  }

  @Override
  public HttpStatus getStatus() {
    return HttpStatus.CONFLICT;
  }
}
