package br.com.aerodash.aether.autenticacao;

import br.com.aerodash.aether.comum.observabilidade.ContextoDaRequisicao;
import java.time.Instant;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Os dois passos de "esqueci minha senha" que usam o código: conferi-lo e trocar a senha. Pedir o
 * código fica em {@link SolicitacaoDeCodigoService}.
 */
@Service
public class RecuperacaoDeSenhaService {

  private final UsuarioRepository usuarios;
  private final CodigoDeRecuperacaoRepository codigos;
  private final SessaoDeAcessoRepository sessoes;
  private final CofreDeSegredos cofre;
  private final PoliticaDeAcesso politica;
  private final ContextoDaRequisicao contexto;

  public RecuperacaoDeSenhaService(
      UsuarioRepository usuarios,
      CodigoDeRecuperacaoRepository codigos,
      SessaoDeAcessoRepository sessoes,
      CofreDeSegredos cofre,
      PoliticaDeAcesso politica,
      ContextoDaRequisicao contexto) {
    this.usuarios = usuarios;
    this.codigos = codigos;
    this.sessoes = sessoes;
    this.cofre = cofre;
    this.politica = politica;
    this.contexto = contexto;
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
