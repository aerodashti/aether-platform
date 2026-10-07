package br.com.aerodash.aether.proprietario;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import br.com.aerodash.aether.autenticacao.PapelDoUsuario;
import br.com.aerodash.aether.comum.erro.ExcecaoDeDominio;
import br.com.aerodash.aether.comum.erro.RecursoNaoEncontradoException;
import br.com.aerodash.aether.comum.observabilidade.ContextoDaRequisicao;
import java.sql.SQLException;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import org.hibernate.exception.ConstraintViolationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("ProprietarioService")
class ProprietarioServiceTest {

  private static final Instant AGORA = Instant.parse("2026-09-10T12:00:00Z");

  @Mock private ProprietarioRepository proprietarios;
  @Mock private ParticipacoesVigentes participacoes;
  @Mock private ContextoDaRequisicao contexto;

  private ProprietarioService service;

  @BeforeEach
  void montar() {
    // O mapper real, não um mock: o mapeamento é parte do contrato que estes testes verificam,
    // e um mock devolvendo qualquer coisa esconderia um campo trocado.
    ProprietarioMapper mapper = new ProprietarioMapperImpl();
    service =
        new ProprietarioService(
            proprietarios, mapper, participacoes, Clock.fixed(AGORA, ZoneOffset.UTC), contexto);
    when(proprietarios.saveAndFlush(any())).thenAnswer(chamada -> chamada.getArgument(0));
  }

  private ProprietarioRequest request(String cpfCnpj) {
    return new ProprietarioRequest(
        "Ricardo Meirelles",
        cpfCnpj,
        "ricardo@exemplo.com.br",
        "+55 11 98888-0000",
        CorDeIdentificacao.PETROLEO);
  }

  @Test
  @DisplayName("cria com o documento normalizado")
  void criaNormalizando() {
    when(proprietarios.findByCpfCnpj("52998224725")).thenReturn(Optional.empty());

    ProprietarioResponse response = service.criar(request("529.982.247-25"));

    assertThat(response.cpfCnpj()).isEqualTo("52998224725");
    assertThat(response.situacao()).isEqualTo(SituacaoDoProprietario.ATIVO);
    verify(proprietarios).saveAndFlush(any());
  }

  @Test
  @DisplayName("cria com o CNPJ alfanumérico")
  void criaComCnpjAlfanumerico() {
    ProprietarioResponse response = service.criar(request("12.ABC.345/01DE-35"));

    assertThat(response.cpfCnpj()).isEqualTo("12ABC34501DE35");
  }

  @Test
  @DisplayName("recusa documento inválido no campo cpfCnpj, antes de tocar o banco")
  void recusaDocumentoInvalido() {
    assertThatThrownBy(() -> service.criar(request("não tenho")))
        .isInstanceOf(CpfCnpjInvalidoException.class)
        .satisfies(erro -> assertThat(campoDe(erro)).contains("cpfCnpj"));
    verify(proprietarios, never()).saveAndFlush(any());
    verify(contexto).decisao("proprietario.cpfCnpjValido", false);
  }

  @Test
  @DisplayName("recusa documento de outro proprietário dizendo de quem é")
  void recusaDocumentoDuplicado() {
    Proprietario existente = comId(7L, "52998224725");
    when(proprietarios.findByCpfCnpj("52998224725")).thenReturn(Optional.of(existente));

    assertThatThrownBy(() -> service.criar(request("529.982.247-25")))
        .isInstanceOf(CpfCnpjJaCadastradoException.class)
        .hasMessage("Este documento já é de Ricardo Meirelles.")
        .satisfies(erro -> assertThat(campoDe(erro)).contains("cpfCnpj"));
    verify(proprietarios, never()).saveAndFlush(any());
  }

  @Test
  @DisplayName("se o dono do documento está inativo, sugere reativá-lo em vez de cadastrar de novo")
  void sugereReativarOInativo() {
    Proprietario existente = comId(7L, "52998224725");
    existente.desativar(AGORA);
    when(proprietarios.findByCpfCnpj("52998224725")).thenReturn(Optional.of(existente));

    assertThatThrownBy(() -> service.criar(request("529.982.247-25")))
        .hasMessageContaining("hoje inativo: reative o cadastro dele");
  }

  @Test
  @DisplayName("na atualização, o próprio documento não conta como duplicado")
  void atualizaSemColidirConsigo() {
    Proprietario existente = comId(7L, "52998224725");
    when(proprietarios.findById(7L)).thenReturn(Optional.of(existente));
    when(proprietarios.findByCpfCnpj("52998224725")).thenReturn(Optional.of(existente));

    ProprietarioResponse response = service.atualizar(7L, request("529.982.247-25"));

    assertThat(response.cpfCnpj()).isEqualTo("52998224725");
    verify(proprietarios).flush();
  }

  @Nested
  @DisplayName("quando só o banco percebe a repetição (dois salvamentos ao mesmo tempo)")
  class Corrida {

    @Test
    @DisplayName("no cadastro, a UNIQUE do documento vira o 409 do campo")
    void cadastroViraConflito() {
      when(proprietarios.saveAndFlush(any())).thenThrow(violacao("proprietario_cpf_cnpj_unico"));

      assertThatThrownBy(() -> service.criar(request("529.982.247-25")))
          .isInstanceOf(CpfCnpjJaCadastradoException.class)
          .satisfies(erro -> assertThat(campoDe(erro)).contains("cpfCnpj"));
      verify(contexto).decisao("proprietario.cpfCnpjDuplicadoNoBanco", true);
    }

    @Test
    @DisplayName("na atualização também")
    void atualizacaoViraConflito() {
      when(proprietarios.findById(7L)).thenReturn(Optional.of(comId(7L, null)));
      doThrow(violacao("proprietario_cpf_cnpj_unico")).when(proprietarios).flush();

      assertThatThrownBy(() -> service.atualizar(7L, request("529.982.247-25")))
          .isInstanceOf(CpfCnpjJaCadastradoException.class);
    }

    @Test
    @DisplayName("outra restrição segue como veio, para o tratador global")
    void outraRestricaoSegue() {
      DataIntegrityViolationException outra = violacao("proprietario_situacao_valida");
      when(proprietarios.saveAndFlush(any())).thenThrow(outra);

      assertThatThrownBy(() -> service.criar(request(null))).isSameAs(outra);
      verify(contexto).decisao("proprietario.cpfCnpjDuplicadoNoBanco", false);
    }

    private DataIntegrityViolationException violacao(String restricao) {
      SQLException sql = new SQLException("duplicate key value", "23505");
      return new DataIntegrityViolationException(
          "could not execute statement",
          new ConstraintViolationException("could not execute statement", sql, restricao));
    }
  }

  @Nested
  @DisplayName("lista")
  class Lista {

    @BeforeEach
    void comDoisProprietarios() {
      when(proprietarios.findAllByOrderByNomeAsc())
          .thenReturn(List.of(comId(1L, null), comId(2L, "52998224725")));
    }

    @Test
    @DisplayName("em ordem de nome, como o repositório devolve")
    void emOrdemDeNome() {
      assertThat(service.listar(PapelDoUsuario.GESTOR)).hasSize(2);
      verify(contexto).registrar("proprietarios.total", 2);
    }

    @Test
    @DisplayName("documento e contato saem para quem gere a conta")
    void completaParaQuemGere() {
      ProprietarioResponse segundo = service.listar(PapelDoUsuario.ADMINISTRADOR).get(1);

      assertThat(segundo.cpfCnpj()).isEqualTo("52998224725");
      assertThat(segundo.email()).isEqualTo("ricardo@exemplo.com.br");
      verify(contexto).decisao("proprietarios.veDadosPessoais", true);
    }

    @Test
    @DisplayName("piloto e proprietário recebem nome, cor e situação, sem documento nem contato")
    void semDadosPessoaisParaOsDemais() {
      for (PapelDoUsuario papel : List.of(PapelDoUsuario.PILOTO, PapelDoUsuario.PROPRIETARIO)) {
        ProprietarioResponse segundo = service.listar(papel).get(1);

        assertThat(segundo.nome()).isEqualTo("Ricardo Meirelles");
        assertThat(segundo.corDeIdentificacao()).isEqualTo(CorDeIdentificacao.PETROLEO);
        assertThat(segundo.cpfCnpj()).isNull();
        assertThat(segundo.email()).isNull();
        assertThat(segundo.telefone()).isNull();
      }
      verify(contexto, times(2)).decisao("proprietarios.veDadosPessoais", false);
    }
  }

  @Test
  @DisplayName("quem está em contrato vigente não é desativado sem redistribuir a participação")
  void recusaQuemParticipa() {
    Proprietario helena = comId(7L, "52998224725");
    when(proprietarios.findById(7L)).thenReturn(Optional.of(helena));
    when(participacoes.participaDeContratoVigente(7L)).thenReturn(true);

    assertThatThrownBy(() -> service.desativar(7L))
        .isInstanceOf(ProprietarioComParticipacaoException.class);
    assertThat(helena.estaAtivo()).isTrue();
  }

  @Test
  @DisplayName("desativar e reativar mudam a situação sem apagar nada")
  void desativaEReativa() {
    Proprietario existente = comId(7L, "52998224725");
    when(proprietarios.findById(7L)).thenReturn(Optional.of(existente));

    assertThat(service.desativar(7L).situacao()).isEqualTo(SituacaoDoProprietario.INATIVO);
    assertThat(service.reativar(7L).situacao()).isEqualTo(SituacaoDoProprietario.ATIVO);
    assertThat(existente.getNome()).isEqualTo("Ricardo Meirelles");
  }

  @Test
  @DisplayName("id desconhecido é 404, não 500")
  void naoEncontrado() {
    when(proprietarios.findById(99L)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.desativar(99L))
        .isInstanceOf(RecursoNaoEncontradoException.class);
  }

  private static Optional<String> campoDe(Throwable erro) {
    return ((ExcecaoDeDominio) erro).getCampo();
  }

  private Proprietario comId(Long id, String cpfCnpj) {
    Proprietario proprietario =
        new Proprietario(
            "Ricardo Meirelles",
            cpfCnpj,
            "ricardo@exemplo.com.br",
            null,
            CorDeIdentificacao.PETROLEO,
            AGORA);
    // O id nasce no banco; nos testes de unidade ele entra por reflexão, como nos demais services.
    ReflectionTestUtils.setField(proprietario, "id", id);
    return proprietario;
  }
}
