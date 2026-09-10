package br.com.aerodash.aether.autenticacao;

import br.com.aerodash.aether.comum.observabilidade.ContextoDaRequisicao;
import java.time.Instant;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * O ciclo do convite: emitir, reemitir e concluir.
 *
 * <p>Existe separado da administração de usuários porque a conclusão não é ato de administrador — é
 * a própria pessoa convidada, sem sessão, chegando pelo link. Os dois lados do convite se encontram
 * só na tabela.
 */
@Service
public class ConviteService {

  private final ConviteRepository convites;
  private final EnviadorDeConvite enviador;
  private final CofreDeSegredos cofre;
  private final PoliticaDeAcesso politica;
  private final ContextoDaRequisicao contexto;

  public ConviteService(
      ConviteRepository convites,
      EnviadorDeConvite enviador,
      CofreDeSegredos cofre,
      PoliticaDeAcesso politica,
      ContextoDaRequisicao contexto) {
    this.convites = convites;
    this.enviador = enviador;
    this.cofre = cofre;
    this.politica = politica;
    this.contexto = contexto;
  }

  /**
   * Emite um convite e mata o anterior, se houver.
   *
   * <p>Reenviar não pode deixar dois links vivos: o administrador reenvia justamente quando duvida
   * do primeiro, e um link antigo que continua funcionando é um segredo a mais circulando por
   * e-mail sem que ninguém saiba.
   */
  @Transactional
  public void emitir(Usuario usuario, Instant agora) {
    convites
        .findFirstByUsuarioOrderByCriadoEmDesc(usuario)
        .filter(anterior -> anterior.estaVigente(agora))
        .ifPresent(anterior -> anterior.invalidar(agora));

    String token = cofre.novoTokenDeSessao();
    convites.save(new Convite(usuario, cofre.resumir(token), agora, politica.validadeDoConvite()));
    enviador.enviar(usuario, token);
  }

  /**
   * A pessoa convidada cria a própria senha e, com isso, ativa a conta.
   *
   * <p>Quem chama não tem sessão: o token do link é a credencial. Ele é gasto no mesmo instante em
   * que a senha nasce, então o link não serve para uma segunda troca.
   */
  @Transactional
  public void concluir(String token, String novaSenha) {
    Instant agora = politica.agora();
    boolean possuiToken = token != null && !token.isBlank();
    contexto.decisao("convite.possui_token", possuiToken);
    if (!possuiToken) {
      throw new ConviteInvalidoException();
    }

    Convite convite =
        convites.findByToken(cofre.resumir(token)).orElseThrow(ConviteInvalidoException::new);
    contexto.registrar("usuario.id", convite.getUsuario().getId());

    boolean vigente = convite.estaVigente(agora);
    contexto.decisao("convite.vigente", vigente);
    if (!vigente) {
      throw new ConviteInvalidoException();
    }

    convite.marcarComoUsado(agora);
    convite.getUsuario().definirSenha(cofre.codificar(novaSenha), agora);
  }
}
