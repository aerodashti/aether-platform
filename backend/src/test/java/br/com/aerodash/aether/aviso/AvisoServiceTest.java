package br.com.aerodash.aether.aviso;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import br.com.aerodash.aether.aeronave.AeronaveRepository;
import br.com.aerodash.aether.comum.observabilidade.ContextoDaRequisicao;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("AvisoService")
class AvisoServiceTest {

  private static final Instant AGORA = Instant.parse("2026-10-06T12:00:00Z");

  @Mock private ColetorDeAvisos coletor;
  @Mock private AvisoLidoRepository lidos;
  @Mock private AeronaveRepository aeronaves;
  @Mock private ContextoDaRequisicao contexto;

  private AvisoService service;

  @BeforeEach
  void montar() {
    service =
        new AvisoService(coletor, lidos, aeronaves, Clock.fixed(AGORA, ZoneOffset.UTC), contexto);
    when(coletor.coletar(any()))
        .thenReturn(
            List.of(
                aviso("CVA:1:2026-10-01", GravidadeDoAviso.VENCIDO, 1L),
                aviso("RETA:1:2026-10-26", GravidadeDoAviso.PROXIMO, 1L),
                aviso("CVA:2:2026-10-20", GravidadeDoAviso.PROXIMO, 2L)));
    when(aeronaves.findAllById(any())).thenReturn(List.of());
  }

  private static Aviso aviso(String chave, GravidadeDoAviso gravidade, Long aeronave) {
    return new Aviso(
        chave, CategoriaDoAviso.DOCUMENTOS, gravidade, "t", "d", aeronave, LocalDate.now(), "/x");
  }

  @Test
  @DisplayName("os indicadores contam ativos, não lidos, vencidos, próximos e aeronaves")
  void indicadores() {
    when(lidos.findByUsuarioId(5L))
        .thenReturn(List.of(new AvisoLido(5L, "CVA:1:2026-10-01", AGORA)));

    AvisosResponse resposta = service.listar(5L);

    assertThat(resposta.avisos().get(0).lido()).isTrue();
    assertThat(resposta.indicadores())
        .isEqualTo(new AvisosResponse.IndicadoresDosAvisos(3, 2, 1, 2, 2));
  }

  @Test
  @DisplayName("marcar como lido não duplica o que já estava lido")
  @SuppressWarnings("unchecked")
  void marcarSemDuplicar() {
    when(lidos.findByUsuarioId(5L)).thenReturn(List.of(new AvisoLido(5L, "A", AGORA)));

    service.marcar(5L, new LeituraRequest(List.of("A", "B", "B"), true));

    ArgumentCaptor<Iterable<AvisoLido>> salvos = ArgumentCaptor.forClass(Iterable.class);
    verify(lidos).saveAll(salvos.capture());
    assertThat(salvos.getValue()).extracting(AvisoLido::getChave).containsExactly("B");
  }

  @Test
  @DisplayName("desmarcar apaga a leitura")
  void desmarcar() {
    service.marcar(5L, new LeituraRequest(List.of("A"), false));

    verify(lidos).deleteByUsuarioIdAndChaveIn(org.mockito.ArgumentMatchers.eq(5L), anyCollection());
  }
}
