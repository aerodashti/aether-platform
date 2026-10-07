package br.com.aerodash.aether.autenticacao;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("TermoDeBusca")
class TermoDeBuscaTest {

  @Test
  @DisplayName("os dois alfabetos têm o mesmo tamanho: senão o translate apagaria letras")
  void alfabetosCasam() {
    assertThat(TermoDeBusca.SEM_ACENTO).hasSameSizeAs(TermoDeBusca.COM_ACENTO);
  }

  @Test
  @DisplayName("cada letra acentuada vira a mesma letra sem acento, em minúsculas")
  void letraAcentuadaViraSemAcento() {
    assertThat(TermoDeBusca.paraLike(" Conceição Ávila ")).isEqualTo("%conceicao avila%");
  }

  @Test
  @DisplayName("os curingas do like viram texto, e o próprio escape também")
  void curingasViramTexto() {
    assertThat(TermoDeBusca.paraLike("50%_a!")).isEqualTo("%50!%!_a!!%");
  }

  @Test
  @DisplayName("busca vazia casa com tudo")
  void buscaVaziaCasaComTudo() {
    assertThat(TermoDeBusca.paraLike(null)).isEqualTo("%");
    assertThat(TermoDeBusca.paraLike("   ")).isEqualTo("%");
  }
}
