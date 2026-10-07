package br.com.aerodash.aether.autenticacao;

import br.com.aerodash.aether.comum.erro.RecursoNaoEncontradoException;
import br.com.aerodash.aether.comum.observabilidade.ContextoDaRequisicao;
import java.time.Instant;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * A administração de usuários — a tela restrita a administradores.
 *
 * <p>Este serviço não confere papel: quem faz isso é a cadeia de filtros, num lugar só, para toda
 * rota sob {@code /usuarios}. O que ele guarda é a regra que a autorização não alcança — ninguém
 * mexe no próprio acesso.
 */
@Service
public class UsuarioService {

  private final UsuarioRepository usuarios;
  private final ConviteService convites;
  private final CodigoDeRecuperacaoRepository codigos;
  private final UsuarioMapper mapper;
  private final PoliticaDeAcesso politica;
  private final ContextoDaRequisicao contexto;

  public UsuarioService(
      UsuarioRepository usuarios,
      ConviteService convites,
      CodigoDeRecuperacaoRepository codigos,
      UsuarioMapper mapper,
      PoliticaDeAcesso politica,
      ContextoDaRequisicao contexto) {
    this.usuarios = usuarios;
    this.convites = convites;
    this.codigos = codigos;
    this.mapper = mapper;
    this.politica = politica;
    this.contexto = contexto;
  }

  @Transactional(readOnly = true)
  public Page<UsuarioResponse> listar(
      String busca, PapelDoUsuario papel, SituacaoDoUsuario situacao, Pageable paginacao) {
    Page<UsuarioResponse> pagina =
        usuarios
            .buscar(TermoDeBusca.paraLike(busca), papel, situacao, paginacao)
            .map(mapper::paraLinhaDaLista);
    contexto.registrar("usuarios.encontrados", pagina.getTotalElements());
    return pagina;
  }

  /** Cria a pessoa em PENDENTE e manda o convite. Senha nenhuma é definida aqui. */
  @Transactional
  public UsuarioResponse convidar(String nome, String email, PapelDoUsuario papel) {
    Instant agora = politica.agora();
    String normalizado = Usuario.normalizarEmail(email);

    boolean jaCadastrado = usuarios.existsByEmail(normalizado);
    contexto.decisao("usuarios.email_ja_cadastrado", jaCadastrado);
    if (jaCadastrado) {
      throw new EmailJaCadastradoException();
    }

    Usuario convidado = usuarios.save(new Usuario(nome, normalizado, papel, agora));
    contexto.registrar("usuario.id", convidado.getId());
    convites.emitir(convidado, agora);
    return mapper.paraLinhaDaLista(convidado);
  }

  /** Reenviar só faz sentido para quem ainda não concluiu o convite. */
  @Transactional
  public void reenviarConvite(Long id) {
    Usuario usuario = exigirUsuario(id);
    boolean aguardaConvite = usuario.aguardaConvite();
    contexto.decisao("usuarios.aguarda_convite", aguardaConvite);
    if (!aguardaConvite) {
      throw new ConviteInvalidoException();
    }
    convites.emitir(usuario, politica.agora());
  }

  /**
   * Revoga o acesso, e com ele os segredos que ainda o devolveriam: o convite pendente e o código
   * de recuperação pedido antes. Os dois terminam em {@code definirSenha}, que ativa a pessoa — sem
   * isto, o link do convite reativaria quem acabou de ser desativado.
   */
  @Transactional
  public UsuarioResponse desativar(Long id, UsuarioAutenticado solicitante) {
    Usuario usuario = exigirOutroUsuario(id, solicitante);
    Instant agora = politica.agora();
    usuario.desativar(agora);
    convites.revogar(usuario, agora);
    revogarCodigoDeRecuperacao(usuario, agora);
    return mapper.paraLinhaDaLista(usuario);
  }

  @Transactional
  public UsuarioResponse reativar(Long id, UsuarioAutenticado solicitante) {
    Usuario usuario = exigirOutroUsuario(id, solicitante);
    usuario.reativar(politica.agora());
    return mapper.paraLinhaDaLista(usuario);
  }

  private void revogarCodigoDeRecuperacao(Usuario usuario, Instant agora) {
    Optional<CodigoDeRecuperacao> pendente =
        codigos
            .findFirstByUsuarioOrderByCriadoEmDesc(usuario)
            .filter(codigo -> !codigo.foiUsado() && !codigo.estaExpirado(agora));
    contexto.decisao("usuarios.codigo_pendente_revogado", pendente.isPresent());
    pendente.ifPresent(codigo -> codigo.revogar(agora));
  }

  private Usuario exigirOutroUsuario(Long id, UsuarioAutenticado solicitante) {
    boolean ehSiMesmo = id.equals(solicitante.id());
    contexto.decisao("usuarios.eh_si_mesmo", ehSiMesmo);
    if (ehSiMesmo) {
      throw new AcaoSobreSiMesmoException();
    }
    return exigirUsuario(id);
  }

  private Usuario exigirUsuario(Long id) {
    contexto.registrar("usuario.id", id);
    return usuarios
        .findById(id)
        .orElseThrow(() -> new RecursoNaoEncontradoException("Usuário não encontrado."));
  }
}
