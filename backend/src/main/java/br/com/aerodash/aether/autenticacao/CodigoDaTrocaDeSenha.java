package br.com.aerodash.aether.autenticacao;

import br.com.aerodash.aether.comum.observabilidade.ContextoDaRequisicao;
import java.time.Instant;
import org.springframework.stereotype.Component;

/**
 * A segunda prova da troca de senha: o código de seis dígitos que só quem tem o e-mail recebe.
 *
 * <p>Separado de {@link TrocaDeSenhaService} porque é um assunto inteiro — intervalo entre envios,
 * validade, limite de tentativas —, e o serviço fica com a ordem das provas e o que acontece depois
 * delas. Reaproveita a tabela de códigos da recuperação de propósito: é o mesmo segredo, e pedir um
 * código aqui invalida o anterior, venha ele de onde vier.
 */
@Component
public class CodigoDaTrocaDeSenha {

  private final CodigoDeRecuperacaoRepository codigos;
  private final EnviadorDeCodigoDeRecuperacao enviador;
  private final CofreDeSegredos cofre;
  private final PoliticaDeAcesso politica;
  private final ContextoDaRequisicao contexto;

  public CodigoDaTrocaDeSenha(
      CodigoDeRecuperacaoRepository codigos,
      EnviadorDeCodigoDeRecuperacao enviador,
      CofreDeSegredos cofre,
      PoliticaDeAcesso politica,
      ContextoDaRequisicao contexto) {
    this.codigos = codigos;
    this.enviador = enviador;
    this.cofre = cofre;
    this.politica = politica;
    this.contexto = contexto;
  }

  /** Manda o código para o e-mail cadastrado, respeitando o intervalo entre envios. */
  public void enviar(Usuario usuario, Instant agora) {
    boolean aguardandoIntervalo =
        codigos
            .findFirstByUsuarioOrderByCriadoEmDesc(usuario)
            .filter(ultimo -> !ultimo.permiteNovoEnvio(agora, politica.intervaloEntreCodigos()))
            .isPresent();
    contexto.decisao("troca_de_senha.aguardando_intervalo", aguardandoIntervalo);
    if (aguardandoIntervalo) {
      return;
    }

    String codigo = cofre.novoCodigoDeRecuperacao();
    codigos.save(
        new CodigoDeRecuperacao(
            usuario, cofre.codificar(codigo), agora, politica.validadeDoCodigo()));
    enviador.enviar(usuario, codigo);
  }

  /**
   * Confere o código informado e o gasta. O palpite errado é contado antes da recusa — quem chama
   * precisa de {@code noRollbackFor} para que a contagem sobreviva.
   */
  public void gastar(Usuario usuario, String codigo, Instant agora) {
    CodigoDeRecuperacao vigente =
        codigos
            .findFirstByUsuarioOrderByCriadoEmDesc(usuario)
            .orElseThrow(CodigoInvalidoException::new);

    boolean codigoVigente = vigente.estaVigente(agora, politica.tentativasPorCodigo());
    contexto.decisao("troca_de_senha.codigo_vigente", codigoVigente);
    if (!codigoVigente) {
      throw new CodigoInvalidoException();
    }

    boolean codigoConfere = cofre.confere(codigo, vigente.getCodigo());
    contexto.decisao("troca_de_senha.codigo_confere", codigoConfere);
    if (!codigoConfere) {
      vigente.registrarTentativa();
      throw new CodigoInvalidoException();
    }
    vigente.marcarComoUsado(agora);
  }
}
