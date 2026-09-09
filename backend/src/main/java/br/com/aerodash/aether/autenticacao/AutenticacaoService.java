package br.com.aerodash.aether.autenticacao;

import br.com.aerodash.aether.comum.observabilidade.ContextoDaRequisicao;
import java.time.Instant;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Entrada, consulta e encerramento de sessão.
 *
 * <p>Todas as recusas de entrada saem como a mesma {@link CredenciaisInvalidasException}: e-mail
 * desconhecido, senha errada, conta inativa e convite pendente respondem igual, porque a diferença
 * entre elas é justamente o que revelaria quem tem conta na plataforma.
 */
@Service
public class AutenticacaoService {

  private final UsuarioRepository usuarios;
  private final SessaoDeAcessoRepository sessoes;
  private final UsuarioMapper mapper;
  private final CofreDeSegredos cofre;
  private final PoliticaDeAcesso politica;
  private final ContextoDaRequisicao contexto;

  public AutenticacaoService(
      UsuarioRepository usuarios,
      SessaoDeAcessoRepository sessoes,
      UsuarioMapper mapper,
      CofreDeSegredos cofre,
      PoliticaDeAcesso politica,
      ContextoDaRequisicao contexto) {
    this.usuarios = usuarios;
    this.sessoes = sessoes;
    this.mapper = mapper;
    this.cofre = cofre;
    this.politica = politica;
    this.contexto = contexto;
  }

  /**
   * {@code noRollbackFor} é o que faz o bloqueio existir. A contagem de falhas é gravada na
   * entidade e logo em seguida o método lança — e uma exceção não verificada desfaz a transação por
   * padrão, levando o contador junto. Sem esta anotação, tentar a senha errada mil vezes deixaria o
   * contador eternamente em zero.
   */
  @Transactional(
      noRollbackFor = {CredenciaisInvalidasException.class, AcessoBloqueadoException.class})
  public SessaoAberta entrar(String email, String senha) {
    Instant agora = politica.agora();
    Usuario usuario = exigirCredenciaisValidas(email, senha, agora);
    usuario.registrarEntrada(agora);
    return abrirSessao(usuario, agora);
  }

  @Transactional(readOnly = true)
  public SessaoResponse consultarSessao(String token) {
    SessaoDeAcesso sessao = exigirSessaoVigente(token, politica.agora());
    contexto.registrar("usuario.id", sessao.getUsuario().getId());
    return mapper.paraResponse(sessao.getUsuario());
  }

  /** Encerrar é idempotente: sair duas vezes, ou sair sem cookie, não é erro. */
  @Transactional
  public void sair(String token) {
    boolean possuiToken = token != null && !token.isBlank();
    contexto.decisao("autenticacao.possui_token", possuiToken);
    if (!possuiToken) {
      return;
    }
    Instant agora = politica.agora();
    sessoes.findByToken(cofre.resumir(token)).ifPresent(sessao -> sessao.encerrar(agora));
  }

  private Usuario exigirCredenciaisValidas(String email, String senha, Instant agora) {
    Optional<Usuario> encontrado = usuarios.findByEmail(Usuario.normalizarEmail(email));
    boolean usuarioExiste = encontrado.isPresent();
    contexto.decisao("autenticacao.usuario_existe", usuarioExiste);
    if (!usuarioExiste) {
      cofre.gastarTempoDeCodificacao(senha);
      throw new CredenciaisInvalidasException();
    }

    Usuario usuario = encontrado.orElseThrow();
    contexto.registrar("usuario.id", usuario.getId());
    return exigirUsuarioApto(usuario, senha, agora);
  }

  private Usuario exigirUsuarioApto(Usuario usuario, String senha, Instant agora) {
    boolean bloqueado = usuario.estaBloqueado(agora);
    contexto.decisao("autenticacao.bloqueado", bloqueado);
    if (bloqueado) {
      throw new AcessoBloqueadoException();
    }

    boolean podeEntrar = usuario.podeEntrar(agora);
    contexto.decisao("autenticacao.pode_entrar", podeEntrar);
    if (!podeEntrar) {
      throw new CredenciaisInvalidasException();
    }

    boolean senhaConfere = cofre.confere(senha, usuario.getSenha().orElseThrow());
    contexto.decisao("autenticacao.senha_confere", senhaConfere);
    if (!senhaConfere) {
      usuario.registrarFalhaDeEntrada(
          agora, politica.tentativasAteBloquear(), politica.duracaoDoBloqueio());
      throw new CredenciaisInvalidasException();
    }
    return usuario;
  }

  private SessaoDeAcesso exigirSessaoVigente(String token, Instant agora) {
    boolean possuiToken = token != null && !token.isBlank();
    contexto.decisao("autenticacao.possui_token", possuiToken);
    if (!possuiToken) {
      throw new SessaoInvalidaException();
    }

    SessaoDeAcesso sessao =
        sessoes.findByToken(cofre.resumir(token)).orElseThrow(SessaoInvalidaException::new);
    boolean vigente = sessao.estaVigente(agora);
    contexto.decisao("autenticacao.sessao_vigente", vigente);
    if (!vigente) {
      throw new SessaoInvalidaException();
    }
    return sessao;
  }

  private SessaoAberta abrirSessao(Usuario usuario, Instant agora) {
    String token = cofre.novoTokenDeSessao();
    sessoes.save(
        new SessaoDeAcesso(usuario, cofre.resumir(token), agora, politica.duracaoDaSessao()));
    return new SessaoAberta(token, politica.duracaoDaSessao(), mapper.paraResponse(usuario));
  }
}
