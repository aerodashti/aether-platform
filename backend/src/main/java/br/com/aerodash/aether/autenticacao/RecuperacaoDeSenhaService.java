package br.com.aerodash.aether.autenticacao;

import br.com.aerodash.aether.comum.observabilidade.ContextoDaRequisicao;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Os três passos de "esqueci minha senha": pedir o código, conferir o código, trocar a senha.
 *
 * <p>Pedir um código nunca falha do ponto de vista de quem chamou — e-mail desconhecido responde
 * igual a e-mail cadastrado, na resposta e no tempo. É o que impede a tela de recuperação de virar
 * um verificador de quais endereços existem na plataforma.
 */
@Service
public class RecuperacaoDeSenhaService {

  private final UsuarioRepository usuarios;
  private final CodigoDeRecuperacaoRepository codigos;
  private final SessaoDeAcessoRepository sessoes;
  private final EnviadorDeCodigoDeRecuperacao enviador;
  private final CofreDeSegredos cofre;
  private final PoliticaDeAcesso politica;
  private final ContextoDaRequisicao contexto;

  public RecuperacaoDeSenhaService(
      UsuarioRepository usuarios,
      CodigoDeRecuperacaoRepository codigos,
      SessaoDeAcessoRepository sessoes,
      EnviadorDeCodigoDeRecuperacao enviador,
      CofreDeSegredos cofre,
      PoliticaDeAcesso politica,
      ContextoDaRequisicao contexto) {
    this.usuarios = usuarios;
    this.codigos = codigos;
    this.sessoes = sessoes;
    this.enviador = enviador;
    this.cofre = cofre;
    this.politica = politica;
    this.contexto = contexto;
  }

  /**
   * Sempre retorna sem erro. O que varia é se um e-mail sai ou não — e quem não recebe gasta o
   * tempo do BCrypt que o código novo gastaria, para a latência não denunciar a conta.
   */
  @Transactional
  public void solicitarCodigo(String email) {
    Instant agora = politica.agora();
    Optional<Usuario> encontrado = usuarios.findByEmail(Usuario.normalizarEmail(email));

    boolean podeReceber = encontrado.filter(Usuario::podeRecuperarSenha).isPresent();
    contexto.decisao("recuperacao.pode_receber", podeReceber);
    if (!podeReceber) {
      cofre.gastarTempoDeConferencia();
      return;
    }

    Usuario usuario = encontrado.orElseThrow();
    contexto.registrar("usuario.id", usuario.getId());

    boolean aguardandoIntervalo = aguardandoIntervalo(usuario, agora);
    contexto.decisao("recuperacao.aguardando_intervalo", aguardandoIntervalo);
    if (aguardandoIntervalo) {
      cofre.gastarTempoDeConferencia();
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

  /**
   * Troca a senha e encerra todas as sessões abertas: quem redefine a senha pode estar fugindo de
   * um invasor, e a sessão dele não deve sobreviver à troca.
   */
  @Transactional(noRollbackFor = CodigoInvalidoException.class)
  public void redefinirSenha(String email, String codigo, String novaSenha) {
    Instant agora = politica.agora();
    CodigoDeRecuperacao vigente = exigirCodigoVigente(email, codigo, agora);
    Usuario usuario = vigente.getUsuario();
    exigirSenhaDiferenteDaAtual(usuario, novaSenha);

    vigente.marcarComoUsado(agora);
    usuario.definirSenha(cofre.codificar(novaSenha), agora);
    List<SessaoDeAcesso> abertas = sessoes.findByUsuarioAndEncerradaEmIsNull(usuario);
    contexto.registrar("recuperacao.sessoes_encerradas", abertas.size());
    abertas.forEach(sessao -> sessao.encerrar(agora));
  }

  private void exigirSenhaDiferenteDaAtual(Usuario usuario, String novaSenha) {
    boolean repetida =
        usuario.getSenha().filter(atual -> cofre.confere(novaSenha, atual)).isPresent();
    contexto.decisao("recuperacao.senha_repetida", repetida);
    if (repetida) {
      throw new SenhaRepetidaException();
    }
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
   *
   * <p>O código de quem foi desativado depois de pedi-lo também morre: sem isso, redefinir a senha
   * reativaria a conta pela porta dos fundos.
   */
  private CodigoDeRecuperacao exigirCodigoVigente(String email, String codigo, Instant agora) {
    Usuario usuario =
        usuarios
            .findByEmail(Usuario.normalizarEmail(email))
            .orElseThrow(CodigoInvalidoException::new);
    contexto.registrar("usuario.id", usuario.getId());

    boolean podeRecuperar = usuario.podeRecuperarSenha();
    contexto.decisao("recuperacao.pode_recuperar", podeRecuperar);
    if (!podeRecuperar) {
      throw new CodigoInvalidoException();
    }

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
