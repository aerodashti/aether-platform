package br.com.aerodash.aether.manutencao;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import br.com.aerodash.aether.aeronave.Aeronave;
import br.com.aerodash.aether.aeronave.PendenciaOperacional;
import br.com.aerodash.aether.aeronave.SituacaoRegular;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
@DisplayName("Pendências de manutenção")
class PendenciasDeManutencaoTest {

  private static final Instant AGORA = Instant.parse("2026-10-06T12:00:00Z");
  private static final LocalDate HOJE = LocalDate.of(2026, 10, 6);

  @Mock private ParametroDeControleRepository parametros;
  @Mock private ManutencaoRepository manutencoes;

  private static ParametroDeControle parametroDeData(String nome, LocalDate limite) {
    return new ParametroDeControle(
        1L,
        new DadosDoParametro(nome, TipoDeParametro.DATA, null, limite, BigDecimal.valueOf(30)),
        AGORA);
  }

  @Test
  @DisplayName("estourado e atrasada impedem o voo; perto do limite só pede atenção")
  void classifica() {
    Aeronave aeronave =
        new Aeronave("PS-MEP", "Citation", "SBSP", HOJE.plusYears(1), HOJE.plusYears(1), AGORA);
    ReflectionTestUtils.setField(aeronave, "id", 1L);
    ParametroDeControle pesagem = parametroDeData("Pesagem regulamentar", HOJE.minusDays(46));
    ParametroDeControle inspecao = parametroDeData("Inspeção anual", HOJE.plusDays(10));
    when(parametros.findAll()).thenReturn(List.of(pesagem, inspecao));
    when(manutencoes.findByStatusAndDataBeforeOrderByDataAsc(
            eq(StatusDaManutencao.PROGRAMADA), any()))
        .thenReturn(
            List.of(
                new Manutencao(
                    1L,
                    new DadosDaManutencao(HOJE.minusDays(14), null, null, "Inspeção 100 h", null),
                    AGORA)));

    List<PendenciaOperacional> pendencias =
        new PendenciasDeManutencao(parametros, manutencoes)
            .pendenciasDe(List.of(aeronave), HOJE, 30)
            .get(1L);

    assertThat(pendencias)
        .extracting(PendenciaOperacional::descricao, PendenciaOperacional::situacao)
        .containsExactlyInAnyOrder(
            org.assertj.core.groups.Tuple.tuple(
                "Limite estourado: Pesagem regulamentar", SituacaoRegular.VENCIDO),
            org.assertj.core.groups.Tuple.tuple(
                "Inspeção anual perto do limite", SituacaoRegular.ATENCAO),
            org.assertj.core.groups.Tuple.tuple(
                "Manutenção atrasada desde 22/09/2026", SituacaoRegular.VENCIDO));
  }
}
