package br.com.aerodash.aether.autenticacao;

import br.com.aerodash.aether.comum.erro.RecursoNaoEncontradoException;
import br.com.aerodash.aether.comum.observabilidade.ContextoDaRequisicao;
import java.time.Instant;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Trocar a própria senha, estando logado.
 *
 * <p>É caminho diferente da recuperação, e a diferença é quem prova o quê: lá a pessoa provou ter
 * acesso ao e-mail porque esqueceu a senha; aqui ela já está dentro, e precisa provar **as duas
 * coisas** — que sabe a senha atual e que continua tendo o e-mail ({@link CodigoDaTrocaDeSenha}). É
 * o que impede alguém que encontrou a estação destravada de trocar a senha e tomar a conta.
 */
@Service
public class TrocaDeSenhaService {

  private final UsuarioRepository usuarios;
  private final CodigoDaTrocaDeSenha codigo;
  private final SessaoDeAcessoRepository sessoes;
  private final CofreDeSegredos cofre;
  private final PoliticaDeAcesso politica;
  private final ContextoDaRequisicao contexto;

  public TrocaDeSenhaService(
      UsuarioRepository usuarios,
      CodigoDaTrocaDeSenha codigo,
      SessaoDeAcessoRepository sessoes,
      CofreDeSegredos cofre,
      PoliticaDeAcesso politica,
      ContextoDaRequisicao contexto) {
    this.usuarios = usuarios;
    this.codigo = codigo;
    this.sessoes = sessoes;
    this.cofre = cofre;
    this.politica = politica;
    this.contexto = contexto;
  }

  /** Manda o código para o e-mail cadastrado. Respeita o mesmo intervalo entre envios. */
  @Transactional
  public void solicitarToken(Long usuarioId) {
    codigo.enviar(exigirUsuario(usuarioId), politica.agora());
  }

  /**
   * Troca a senha e encerra as outras sessões do usuário: quem troca a senha por suspeitar de
   * acesso indevido não pode deixar a sessão do invasor aberta. A sessão de quem pediu continua.
   *
   * <p>{@code noRollbackFor} preserva o que foi contado antes da recusa — a tentativa do código e a
   * falha da senha atual. Sem ele os limites que tornam os dois segredos seguros nunca seriam
   * atingidos.
   */
  @Transactional(
      noRollbackFor = {
        CodigoInvalidoException.class,
        SenhaAtualIncorretaException.class,
        TrocaDeSenhaBloqueadaException.class
      })
  public void trocar(
      Long usuarioId,
      String tokenDaSessao,
      String senhaAtual,
      String novaSenha,
      String codigoInformado) {
    Instant agora = politica.agora();
    Usuario usuario = exigirUsuario(usuarioId);
    exigirSenhaAtual(usuario, senhaAtual, agora);
    exigirSenhaNova(senhaAtual, novaSenha);
    codigo.gastar(usuario, codigoInformado, agora);

    usuario.definirSenha(cofre.codificar(novaSenha), agora);
    encerrarOutrasSessoes(usuario, tokenDaSessao, agora);
  }

  /**
   * A senha atual conta tentativas como a entrada, e na mesma contagem: errar aqui também tranca a
   * conta, e a conta trancada também não troca a senha.
   */
  private void exigirSenhaAtual(Usuario usuario, String senhaAtual, Instant agora) {
    boolean bloqueado = usuario.estaBloqueado(agora);
    contexto.decisao("troca_de_senha.bloqueado", bloqueado);
    if (bloqueado) {
      throw new TrocaDeSenhaBloqueadaException(usuario.minutosAteODesbloqueio(agora));
    }

    boolean senhaConfere =
        usuario.getSenha().filter(atual -> cofre.confere(senhaAtual, atual)).isPresent();
    contexto.decisao("troca_de_senha.senha_atual_confere", senhaConfere);
    if (senhaConfere) {
      return;
    }

    usuario.registrarFalhaDeEntrada(
        agora, politica.tentativasAteBloquear(), politica.duracaoDoBloqueio());
    boolean bloqueouAgora = usuario.estaBloqueado(agora);
    contexto.decisao("troca_de_senha.bloqueou_agora", bloqueouAgora);
    if (bloqueouAgora) {
      throw new TrocaDeSenhaBloqueadaException(usuario.minutosAteODesbloqueio(agora));
    }
    throw new SenhaAtualIncorretaException();
  }

  /** A senha atual já foi conferida: comparar os textos basta, sem gastar outro BCrypt. */
  private void exigirSenhaNova(String senhaAtual, String novaSenha) {
    boolean repeteAAtual = novaSenha.equals(senhaAtual);
    contexto.decisao("troca_de_senha.nova_repete_a_atual", repeteAAtual);
    if (repeteAAtual) {
      throw new SenhaRepetidaException();
    }
  }

  private void encerrarOutrasSessoes(Usuario usuario, String tokenDaSessao, Instant agora) {
    String mantida = cofre.resumir(tokenDaSessao);
    List<SessaoDeAcesso> outras =
        sessoes.findByUsuarioAndEncerradaEmIsNull(usuario).stream()
            .filter(sessao -> !sessao.possuiToken(mantida))
            .toList();
    outras.forEach(sessao -> sessao.encerrar(agora));
    contexto.registrar("troca_de_senha.sessoes_encerradas", outras.size());
  }

  private Usuario exigirUsuario(Long id) {
    contexto.registrar("usuario.id", id);
    return usuarios
        .findById(id)
        .orElseThrow(() -> new RecursoNaoEncontradoException("Usuário não encontrado."));
  }
}
