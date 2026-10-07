package br.com.aerodash.aether.proprietario;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

@DisplayName("Proprietario")
class ProprietarioTest {

  private static final Instant AGORA = Instant.parse("2026-09-10T12:00:00Z");
  private static final Instant DEPOIS = Instant.parse("2026-09-11T08:00:00Z");

  private Proprietario novo() {
    return new Proprietario(
        "  Ricardo Meirelles  ",
        "123.456.789-09",
        "  Ricardo@Exemplo.com.br ",
        " +55 11 98888-0000 ",
        CorDeIdentificacao.PETROLEO,
        AGORA);
  }

  @Nested
  @DisplayName("normalização no cadastro")
  class Normalizacao {

    @Test
    @DisplayName("guarda o documento só com dígitos e o e-mail em minúsculas")
    void normalizaAoCriar() {
      Proprietario proprietario = novo();

      assertThat(proprietario.getNome()).isEqualTo("Ricardo Meirelles");
      assertThat(proprietario.getCpfCnpj()).isEqualTo("12345678909");
      assertThat(proprietario.getEmail()).isEqualTo("ricardo@exemplo.com.br");
      assertThat(proprietario.getTelefone()).isEqualTo("+55 11 98888-0000");
    }

    @Test
    @DisplayName("documento e e-mail vazios viram nulos, não string vazia")
    void vazioViraNulo() {
      Proprietario proprietario =
          new Proprietario("Ana", "  ", "  ", "  ", CorDeIdentificacao.VERDE, AGORA);

      assertThat(proprietario.getCpfCnpj()).isNull();
      assertThat(proprietario.getEmail()).isNull();
      assertThat(proprietario.getTelefone()).isNull();
      assertThat(proprietario.possuiCpfCnpj()).isFalse();
    }
  }

  @Nested
  @DisplayName("nome")
  class Nome {

    @Test
    @DisplayName("tira o que não se vê: espaço de largura zero e espaço não separável nas pontas")
    void tiraInvisiveis() {
      Proprietario proprietario =
          new Proprietario(
              "\u00a0Ri\u200bcardo Meirelles\u200b ",
              null,
              null,
              null,
              CorDeIdentificacao.AZUL,
              AGORA);

      assertThat(proprietario.getNome()).isEqualTo("Ricardo Meirelles");
    }

    @Test
    @DisplayName("na atualização também")
    void tiraInvisiveisAoAtualizar() {
      Proprietario proprietario = novo();

      proprietario.atualizarCadastro(
          "\u200bHelena Sarraf\u00a0", null, null, null, CorDeIdentificacao.VERDE, DEPOIS);

      assertThat(proprietario.getNome()).isEqualTo("Helena Sarraf");
    }
  }

  @Test
  @DisplayName("guarda o CNPJ alfanumérico sem pontuação e em maiúsculas")
  void guardaCnpjAlfanumerico() {
    Proprietario proprietario =
        new Proprietario(
            "Vetor SPE", "12.abc.345/01de-35", null, null, CorDeIdentificacao.AMBAR, AGORA);

    assertThat(proprietario.getCpfCnpj()).isEqualTo("12ABC34501DE35");
    assertThat(proprietario.possuiCpfCnpj()).isTrue();
  }

  @Nested
  @DisplayName("situação")
  class Situacao {

    @Test
    @DisplayName("nasce ativo")
    void nasceAtivo() {
      assertThat(novo().estaAtivo()).isTrue();
    }

    @Test
    @DisplayName("desativar preserva o cadastro e marca o momento")
    void desativa() {
      Proprietario proprietario = novo();

      proprietario.desativar(DEPOIS);

      assertThat(proprietario.estaAtivo()).isFalse();
      assertThat(proprietario.getSituacao()).isEqualTo(SituacaoDoProprietario.INATIVO);
      assertThat(proprietario.getNome()).isEqualTo("Ricardo Meirelles");
      assertThat(proprietario.getAtualizadoEm()).isEqualTo(DEPOIS);
    }

    @Test
    @DisplayName("reativar devolve ao estado ativo")
    void reativa() {
      Proprietario proprietario = novo();
      proprietario.desativar(DEPOIS);

      proprietario.reativar(DEPOIS);

      assertThat(proprietario.estaAtivo()).isTrue();
    }
  }

  @Test
  @DisplayName("atualizar cadastro renormaliza todos os campos")
  void atualizaCadastro() {
    Proprietario proprietario = novo();

    proprietario.atualizarCadastro(
        " Meirelles Participações ",
        "12.345.678/0001-99",
        "CONTATO@MEIRELLES.COM.BR",
        "",
        CorDeIdentificacao.AMBAR,
        DEPOIS);

    assertThat(proprietario.getNome()).isEqualTo("Meirelles Participações");
    assertThat(proprietario.getCpfCnpj()).isEqualTo("12345678000199");
    assertThat(proprietario.getEmail()).isEqualTo("contato@meirelles.com.br");
    assertThat(proprietario.getTelefone()).isNull();
    assertThat(proprietario.getCorDeIdentificacao()).isEqualTo(CorDeIdentificacao.AMBAR);
    assertThat(proprietario.getAtualizadoEm()).isEqualTo(DEPOIS);
  }
}
