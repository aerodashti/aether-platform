package br.com.aerodash.aether.autenticacao;

import br.com.aerodash.aether.comum.erro.RecursoNaoEncontradoException;
import br.com.aerodash.aether.comum.observabilidade.ContextoDaRequisicao;
import java.time.Instant;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Trocar a própria senha, estando logado.
 *
 * <p>É caminho diferente da recuperação, e a diferença é quem prova o quê: lá a pessoa provou ter
 * acesso ao e-mail porque esqueceu a senha; aqui ela já está dentro, e precisa provar **as duas
 * coisas** — que sabe a senha atual e que continua tendo o e-mail. É o que impede alguém que
 * encontrou a estação destravada de trocar a senha e tomar a conta.
 *
 * <p>Reaproveita a tabela de códigos da recuperação de propósito: é o mesmo segredo de seis
 * dígitos, com a mesma validade e o mesmo limite de tentativas. Pedir um código aqui invalida o
 * anterior, venha ele de onde vier.
 */
@Service
public class TrocaDeSenhaService {

  private final UsuarioRepository usuarios;
  private final CodigoDeRecuperacaoRepository codigos;
  private final EnviadorDeCodigoDeRecuperacao enviador;
  private final CofreDeSegredos cofre;
  private final PoliticaDeAcesso politica;
  private final ContextoDaRequisicao contexto;

  public TrocaDeSenhaService(
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

  /** Manda o código para o e-mail cadastrado. Respeita o mesmo intervalo entre envios. */
  @Transactional
  public void solicitarToken(Long usuarioId) {
    Instant agora = politica.agora();
    Usuario usuario = exigirUsuario(usuarioId);

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
   * {@code noRollbackFor} preserva a tentativa contada antes da recusa — sem ele o limite que torna
   * seis dígitos seguros nunca seria atingido.
   */
  @Transactional(
      noRollbackFor = {CodigoInvalidoException.class, SenhaAtualIncorretaException.class})
  public void trocar(Long usuarioId, String senhaAtual, String novaSenha, String codigo) {
    Instant agora = politica.agora();
    Usuario usuario = exigirUsuario(usuarioId);

    boolean senhaConfere =
        usuario.getSenha().filter(atual -> cofre.confere(senhaAtual, atual)).isPresent();
    contexto.decisao("troca_de_senha.senha_atual_confere", senhaConfere);
    if (!senhaConfere) {
      throw new SenhaAtualIncorretaException();
    }

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
    usuario.definirSenha(cofre.codificar(novaSenha), agora);
  }

  private Usuario exigirUsuario(Long id) {
    contexto.registrar("usuario.id", id);
    return usuarios
        .findById(id)
        .orElseThrow(() -> new RecursoNaoEncontradoException("Usuário não encontrado."));
  }
}
