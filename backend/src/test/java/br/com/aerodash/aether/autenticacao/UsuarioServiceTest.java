package br.com.aerodash.aether.autenticacao;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import br.com.aerodash.aether.comum.erro.RecursoNaoEncontradoException;
import br.com.aerodash.aether.comum.observabilidade.ContextoDaRequisicao;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.test.util.ReflectionTestUtils;

@DisplayName("UsuarioService")
class UsuarioServiceTest {

  private static final Instant AGORA = Instant.parse("2026-09-04T12:00:00Z");
  private static final UsuarioAutenticado ADMINISTRADOR =
      new UsuarioAutenticado(1L, "Leonardo Andrade", PapelDoUsuario.ADMINISTRADOR);

  private UsuarioRepository usuarios;
  private ConviteService convites;
  private UsuarioService service;

  @BeforeEach
  void montar() {
    usuarios = mock(UsuarioRepository.class);
    convites = mock(ConviteService.class);
    PoliticaDeAcesso politica = mock(PoliticaDeAcesso.class);
    when(politica.agora()).thenReturn(AGORA);
    UsuarioMapper mapper = mock(UsuarioMapper.class);
    when(mapper.paraLinhaDaLista(any()))
        .thenAnswer(
            chamada -> {
              Usuario usuario = chamada.getArgument(0);
              return new UsuarioResponse(
                  usuario.getId(),
                  usuario.getNome(),
                  usuario.getEmail(),
                  usuario.getPapel(),
                  usuario.getSituacao(),
                  usuario.getUltimoAcesso().orElse(null));
            });
    service =
        new UsuarioService(usuarios, convites, mapper, politica, mock(ContextoDaRequisicao.class));
  }

  @Test
  @DisplayName("convidar cria em PENDENTE, sem senha, e emite o convite")
  void convidarCriaPendenteEEmiteConvite() {
    when(usuarios.existsByEmail("camila@administraair.com.br")).thenReturn(false);
    when(usuarios.save(any())).thenAnswer(chamada -> chamada.getArgument(0));

    UsuarioResponse criado =
        service.convidar(
            "Camila Nogueira", "  Camila@AdministraAir.com.BR ", PapelDoUsuario.GESTOR);

    assertThat(criado.situacao()).isEqualTo(SituacaoDoUsuario.PENDENTE);
    assertThat(criado.email()).isEqualTo("camila@administraair.com.br");
    assertThat(criado.ultimoAcesso()).isNull();

    ArgumentCaptor<Usuario> gravado = ArgumentCaptor.forClass(Usuario.class);
    verify(usuarios).save(gravado.capture());
    assertThat(gravado.getValue().possuiSenha()).isFalse();
    verify(convites).emitir(gravado.getValue(), AGORA);
  }

  @Test
  @DisplayName("e-mail repetido é recusado antes de gravar — e o administrador ouve o motivo")
  void emailRepetidoEhRecusado() {
    when(usuarios.existsByEmail("camila@administraair.com.br")).thenReturn(true);

    assertThatThrownBy(
            () -> service.convidar("Camila", "camila@administraair.com.br", PapelDoUsuario.GESTOR))
        .isInstanceOf(EmailJaCadastradoException.class);

    verify(usuarios, never()).save(any());
    verify(convites, never()).emitir(any(), any());
  }

  @Test
  @DisplayName("desativar a si mesmo é recusado: ninguém se tranca do lado de fora")
  void desativarSiMesmoEhRecusado() {
    assertThatThrownBy(() -> service.desativar(ADMINISTRADOR.id(), ADMINISTRADOR))
        .isInstanceOf(AcaoSobreSiMesmoException.class);

    verify(usuarios, never()).findById(any());
  }

  @Test
  @DisplayName("reativar a si mesmo cai na mesma recusa")
  void reativarSiMesmoEhRecusado() {
    assertThatThrownBy(() -> service.reativar(ADMINISTRADOR.id(), ADMINISTRADOR))
        .isInstanceOf(AcaoSobreSiMesmoException.class);
  }

  @Test
  @DisplayName("desativar outro usuário revoga o acesso e devolve a linha atualizada")
  void desativarOutroRevogaOAcesso() {
    Usuario alvo = comId(7L);
    alvo.definirSenha("hash", AGORA);
    when(usuarios.findById(7L)).thenReturn(Optional.of(alvo));

    UsuarioResponse resposta = service.desativar(7L, ADMINISTRADOR);

    assertThat(resposta.situacao()).isEqualTo(SituacaoDoUsuario.INATIVO);
  }

  @Test
  @DisplayName("usuário inexistente vira 404 de domínio")
  void usuarioInexistenteVira404() {
    when(usuarios.findById(99L)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.desativar(99L, ADMINISTRADOR))
        .isInstanceOf(RecursoNaoEncontradoException.class);
  }

  @Test
  @DisplayName("reenviar convite só vale para quem ainda não concluiu")
  void reenviarSoValeParaPendente() {
    Usuario ativo = comId(7L);
    ativo.definirSenha("hash", AGORA);
    when(usuarios.findById(7L)).thenReturn(Optional.of(ativo));

    assertThatThrownBy(() -> service.reenviarConvite(7L))
        .isInstanceOf(ConviteInvalidoException.class);

    verify(convites, never()).emitir(any(), any());
  }

  @Test
  @DisplayName("busca vazia vira o curinga que casa com todo mundo")
  void buscaVaziaViraCuringa() {
    PageRequest paginacao = PageRequest.of(0, 20, Sort.by("nome"));
    when(usuarios.buscar(any(), any(), any(), eq(paginacao))).thenReturn(Page.empty(paginacao));

    service.listar("  ", null, null, paginacao);

    verify(usuarios).buscar("%", null, null, paginacao);
  }

  @Test
  @DisplayName("a busca é insensível a maiúsculas e casa no meio do texto")
  void buscaCasaNoMeioDoTexto() {
    PageRequest paginacao = PageRequest.of(0, 20, Sort.by("nome"));
    when(usuarios.buscar(any(), any(), any(), eq(paginacao))).thenReturn(Page.empty(paginacao));

    service.listar(" Nogueira ", PapelDoUsuario.GESTOR, SituacaoDoUsuario.PENDENTE, paginacao);

    verify(usuarios)
        .buscar("%nogueira%", PapelDoUsuario.GESTOR, SituacaoDoUsuario.PENDENTE, paginacao);
  }

  /**
   * O id é do JPA: em teste unitário não há quem o atribua, e a regra de "si mesmo" precisa dele.
   */
  private static Usuario comId(long id) {
    Usuario usuario =
        new Usuario("Camila Nogueira", "camila@administraair.com.br", PapelDoUsuario.GESTOR, AGORA);
    ReflectionTestUtils.setField(usuario, "id", id);
    return usuario;
  }
}
