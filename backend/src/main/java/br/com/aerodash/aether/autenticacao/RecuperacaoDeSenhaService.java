package br.com.aerodash.aether.autenticacao;

import br.com.aerodash.aether.comum.observabilidade.ContextoDaRequisicao;
import java.time.Instant;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Os três passos de "esqueci minha senha": pedir o código, conferir o código, trocar a senha.
 *
 * <p>Pedir um código nunca falha do ponto de vista de quem chamou — e-mail desconhecido responde
 * igual a e-mail cadastrado. É o que impede a tela de recuperação de virar um verificador de quais
 * endereços existem na plataforma.
 */
@Service
public class RecuperacaoDeSenhaService {

  private final UsuarioRepository usuarios;
  private final CodigoDeRecuperacaoRepository codigos;
  private final EnviadorDeCodigoDeRecuperacao enviador;
  private final CofreDeSegredos cofre;
  private final PoliticaDeAcesso politica;
  private final ContextoDaRequisicao contexto;

  public RecuperacaoDeSenhaService(
      UsuarioRepository usuarios,
      CodigoDeRecuperacaoRepository codigos,
      EnviadorDeCodigoDeRecuperacao enviador,
      CofreDeSegredos cofre,
      PoliticaDeAcesso politica,
      ContextoDaRequisicao contexto) {
    this.usuarios = usuarios;
    this.codigos = codigos;
    this.enviador = enviador;
    this.cofre = cofre;
    this.politica = politica;
    this.contexto = contexto;
  }

  /** Sempre retorna sem erro. O que varia é se um e-mail sai ou não. */
  @Transactional
  public void solicitarCodigo(String email) {
    Instant agora = politica.agora();
    Optional<Usuario> encontrado = usuarios.findByEmail(Usuario.normalizarEmail(email));

    boolean podeReceber = encontrado.filter(Usuario::podeRecuperarSenha).isPresent();
    contexto.decisao("recuperacao.pode_receber", podeReceber);
    if (!podeReceber) {
      return;
    }

    Usuario usuario = encontrado.orElseThrow();
    contexto.registrar("usuario.id", usuario.getId());

    boolean aguardandoIntervalo = aguardandoIntervalo(usuario, agora);
    contexto.decisao("recuperacao.aguardando_intervalo", aguardandoIntervalo);
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
   * Confere o código sem consumi-lo: a tela precisa avançar de passo antes de trocar a senha.
   *
   * <p>{@code noRollbackFor} preserva a tentativa contada antes da recusa. Sem ele a exceção
   * desfaria o incremento, e o limite de tentativas — que é o que torna seis dígitos seguros —
   * nunca seria atingido.
   */
  @Transactional(noRollbackFor = CodigoInvalidoException.class)
  public void validarCodigo(String email, String codigo) {
    exigirCodigoVigente(email, codigo, politica.agora());
  }

  @Transactional(noRollbackFor = CodigoInvalidoException.class)
  public void redefinirSenha(String email, String codigo, String novaSenha) {
    Instant agora = politica.agora();
    CodigoDeRecuperacao vigente = exigirCodigoVigente(email, codigo, agora);
    vigente.marcarComoUsado(agora);
    vigente.getUsuario().definirSenha(cofre.codificar(novaSenha), agora);
  }

  private boolean aguardandoIntervalo(Usuario usuario, Instant agora) {
    return codigos
        .findFirstByUsuarioOrderByCriadoEmDesc(usuario)
        .filter(ultimo -> !ultimo.permiteNovoEnvio(agora, politica.intervaloEntreCodigos()))
        .isPresent();
  }

  /**
   * Cada palpite errado é contado no código vigente. Esgotadas as tentativas ele morre e a pessoa
   * precisa pedir outro — é o que torna seis dígitos suficientes.
   */
  private CodigoDeRecuperacao exigirCodigoVigente(String email, String codigo, Instant agora) {
    Usuario usuario =
        usuarios
            .findByEmail(Usuario.normalizarEmail(email))
            .orElseThrow(CodigoInvalidoException::new);
    contexto.registrar("usuario.id", usuario.getId());

    CodigoDeRecuperacao ultimo =
        codigos
            .findFirstByUsuarioOrderByCriadoEmDesc(usuario)
            .orElseThrow(CodigoInvalidoException::new);

    boolean vigente = ultimo.estaVigente(agora, politica.tentativasPorCodigo());
    contexto.decisao("recuperacao.codigo_vigente", vigente);
    if (!vigente) {
      throw new CodigoInvalidoException();
    }

    boolean codigoConfere = cofre.confere(codigo, ultimo.getCodigo());
    contexto.decisao("recuperacao.codigo_confere", codigoConfere);
    if (!codigoConfere) {
      ultimo.registrarTentativa();
      throw new CodigoInvalidoException();
    }
    return ultimo;
  }
}
