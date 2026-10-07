package br.com.aerodash.aether.autenticacao;

import br.com.aerodash.aether.comum.observabilidade.ContextoDaRequisicao;
import java.time.Instant;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * O primeiro passo de "esqueci minha senha": pedir o código de seis dígitos. Conferir o código e
 * trocar a senha ficam em {@link RecuperacaoDeSenhaService}.
 *
 * <p>Pedir um código nunca falha do ponto de vista de quem chamou — e-mail desconhecido recebe a
 * mesma resposta que e-mail cadastrado. É o que impede a tela de recuperação de virar um
 * verificador de quais endereços existem na plataforma.
 *
 * <p>O tempo é igual só até o envio: o código gasta o mesmo BCrypt nos dois casos, mas o e-mail sai
 * de forma síncrona, e só para contas ativas. Com SMTP configurado, a latência ainda distingue quem
 * tem conta; fechar essa diferença pede o envio depois do commit, fora da requisição.
 */
@Service
public class SolicitacaoDeCodigoService {

  private final UsuarioRepository usuarios;
  private final CodigoDeRecuperacaoRepository codigos;
  private final EnviadorDeCodigoDeRecuperacao enviador;
  private final CofreDeSegredos cofre;
  private final PoliticaDeAcesso politica;
  private final ContextoDaRequisicao contexto;

  public SolicitacaoDeCodigoService(
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

  /**
   * Sempre retorna sem erro. O que varia é se um e-mail sai ou não — e quem não recebe gasta o
   * tempo do BCrypt que o código novo gastaria, para a latência não denunciar a conta.
   */
  @Transactional
  public void solicitar(String email) {
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

  private boolean aguardandoIntervalo(Usuario usuario, Instant agora) {
    return codigos
        .findFirstByUsuarioOrderByCriadoEmDesc(usuario)
        .filter(ultimo -> !ultimo.permiteNovoEnvio(agora, politica.intervaloEntreCodigos()))
        .isPresent();
  }
}
