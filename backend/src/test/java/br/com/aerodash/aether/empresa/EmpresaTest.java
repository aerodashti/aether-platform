package br.com.aerodash.aether.empresa;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("Empresa")
class EmpresaTest {

  private static final Instant AGORA = Instant.parse("2026-09-09T12:00:00Z");

  @Test
  @DisplayName("o aviso aceita a faixa que faz sentido e recusa o resto")
  void aFaixaDoAviso() {
    Empresa empresa = nova();

    empresa.alterarAvisoDeVencimento(1, AGORA);
    assertThat(empresa.getDiasDeAviso()).isEqualTo(1);

    empresa.alterarAvisoDeVencimento(365, AGORA);
    assertThat(empresa.getDiasDeAviso()).isEqualTo(365);

    assertThatThrownBy(() -> empresa.alterarAvisoDeVencimento(0, AGORA))
        .isInstanceOf(AvisoDeVencimentoInvalidoException.class);
    assertThatThrownBy(() -> empresa.alterarAvisoDeVencimento(366, AGORA))
        .isInstanceOf(AvisoDeVencimentoInvalidoException.class);
  }

  @Test
  @DisplayName("aviso recusado não altera o valor vigente")
  void avisoRecusadoNaoAltera() {
    Empresa empresa = nova();
    empresa.alterarAvisoDeVencimento(60, AGORA);

    assertThatThrownBy(() -> empresa.alterarAvisoDeVencimento(-5, AGORA))
        .isInstanceOf(AvisoDeVencimentoInvalidoException.class);

    assertThat(empresa.getDiasDeAviso()).isEqualTo(60);
  }

  @Test
  @DisplayName("alterar dados não toca no CNPJ — é o documento do contrato")
  void alterarDadosNaoTocaNoCnpj() {
    Empresa empresa = nova();

    empresa.alterarDados(
        "Outra Air", "Outra Air LTDA", "outro@administraair.com.br", "+55 11 4000-0000", AGORA);

    assertThat(empresa.getNomeFantasia()).isEqualTo("Outra Air");
    assertThat(empresa.getCnpj()).isEqualTo("19274653000188");
  }

  private static Empresa nova() {
    return new Empresa("19274653000188", 30, AGORA);
  }
}
