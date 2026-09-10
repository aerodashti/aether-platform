package br.com.aerodash.aether.proprietario;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import br.com.aerodash.aether.comum.erro.RecursoNaoEncontradoException;
import br.com.aerodash.aether.comum.observabilidade.ContextoDaRequisicao;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("ProprietarioService")
class ProprietarioServiceTest {

  private static final Instant AGORA = Instant.parse("2026-09-10T12:00:00Z");

  @Mock private ProprietarioRepository proprietarios;
  @Mock private ContextoDaRequisicao contexto;

  private ProprietarioService service;

  @BeforeEach
  void montar() {
    // O mapper real, não um mock: o mapeamento é parte do contrato que estes testes verificam,
    // e um mock devolvendo qualquer coisa esconderia um campo trocado.
    ProprietarioMapper mapper = new ProprietarioMapperImpl();
    service =
        new ProprietarioService(
            proprietarios, mapper, Clock.fixed(AGORA, ZoneOffset.UTC), contexto);
    when(proprietarios.save(any())).thenAnswer(chamada -> chamada.getArgument(0));
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
    when(proprietarios.findByCpfCnpj("12345678901")).thenReturn(Optional.empty());

    ProprietarioResponse response = service.criar(request("123.456.789-01"));

    assertThat(response.cpfCnpj()).isEqualTo("12345678901");
    assertThat(response.situacao()).isEqualTo(SituacaoDoProprietario.ATIVO);
    verify(proprietarios).save(any());
  }

  @Test
  @DisplayName("recusa documento com comprimento inválido, antes de tocar o banco")
  void recusaDocumentoInvalido() {
    assertThatThrownBy(() -> service.criar(request("123")))
        .isInstanceOf(CpfCnpjInvalidoException.class);
    verify(proprietarios, never()).save(any());
  }

  @Test
  @DisplayName("recusa documento que já pertence a outro proprietário")
  void recusaDocumentoDuplicado() {
    Proprietario existente = comId(7L, "12345678901");
    when(proprietarios.findByCpfCnpj("12345678901")).thenReturn(Optional.of(existente));

    assertThatThrownBy(() -> service.criar(request("123.456.789-01")))
        .isInstanceOf(CpfCnpjJaCadastradoException.class);
    verify(proprietarios, never()).save(any());
  }

  @Test
  @DisplayName("na atualização, o próprio documento não conta como duplicado")
  void atualizaSemColidirConsigo() {
    Proprietario existente = comId(7L, "12345678901");
    when(proprietarios.findById(7L)).thenReturn(Optional.of(existente));
    when(proprietarios.findByCpfCnpj("12345678901")).thenReturn(Optional.of(existente));

    ProprietarioResponse response = service.atualizar(7L, request("123.456.789-01"));

    assertThat(response.cpfCnpj()).isEqualTo("12345678901");
  }

  @Test
  @DisplayName("desativar e reativar mudam a situação sem apagar nada")
  void desativaEReativa() {
    Proprietario existente = comId(7L, "12345678901");
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

  @Test
  @DisplayName("lista em ordem de nome, como o repositório devolve")
  void lista() {
    when(proprietarios.findAllByOrderByNomeAsc())
        .thenReturn(List.of(comId(1L, null), comId(2L, "12345678901")));

    assertThat(service.listar()).hasSize(2);
    verify(contexto).registrar("proprietarios.total", 2);
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
