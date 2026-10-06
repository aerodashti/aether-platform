package br.com.aerodash.aether.documento;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import br.com.aerodash.aether.aeronave.AeronaveRepository;
import br.com.aerodash.aether.comum.observabilidade.ContextoDaRequisicao;
import java.io.ByteArrayInputStream;
import java.time.Clock;
import java.time.Instant;
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
@DisplayName("DocumentoService")
class DocumentoServiceTest {

  @Mock private DocumentoRepository documentos;
  @Mock private AeronaveRepository aeronaves;
  @Mock private ArmazenamentoDeArquivos armazenamento;
  @Mock private ContextoDaRequisicao contexto;

  private DocumentoService service;

  @BeforeEach
  void montar() {
    service =
        new DocumentoService(
            documentos,
            aeronaves,
            armazenamento,
            Clock.fixed(Instant.parse("2026-10-06T12:00:00Z"), ZoneOffset.UTC),
            contexto);
    when(aeronaves.existsById(1L)).thenReturn(true);
    when(documentos.save(any())).thenAnswer(chamada -> chamada.getArgument(0));
  }

  private static ArquivoEnviado arquivo(String nome, long tamanho) {
    return new ArquivoEnviado(nome, tamanho, () -> new ByteArrayInputStream(new byte[] {1, 2, 3}));
  }

  @Test
  @DisplayName("um arquivo recusado barra o envio inteiro antes de gravar qualquer um")
  void tudoOuNada() throws Exception {
    assertThatThrownBy(
            () ->
                service.enviar(
                    1L, List.of(arquivo("CVA.pdf", 3), arquivo("pagina.html", 3)), "Patrícia"))
        .isInstanceOf(DocumentoInvalidoException.class)
        .hasMessageContaining("pagina.html")
        .hasMessageContaining("PDF");
    verify(armazenamento, never()).guardar(any(), any());
  }

  @Test
  @DisplayName("se o banco falha no meio, os arquivos já gravados são apagados")
  void limpaSeFalhar() throws Exception {
    when(documentos.save(any()))
        .thenAnswer(chamada -> chamada.getArgument(0))
        .thenThrow(new IllegalStateException("banco caiu"));

    assertThatThrownBy(
            () -> service.enviar(1L, List.of(arquivo("a.pdf", 3), arquivo("b.pdf", 3)), "Patrícia"))
        .isInstanceOf(IllegalStateException.class);

    ArgumentCaptor<String> gravadas = ArgumentCaptor.forClass(String.class);
    verify(armazenamento, org.mockito.Mockito.times(2)).guardar(gravadas.capture(), any());
    for (String chave : gravadas.getAllValues()) {
      verify(armazenamento).apagar(chave);
    }
  }

  @Test
  @DisplayName("grava com chave gerada, não com o nome do usuário, e registra quem enviou")
  void chaveGerada() throws Exception {
    List<DocumentoResponse> salvos =
        service.enviar(1L, List.of(arquivo("C:\\fakepath\\Apólice.pdf", 3)), "Patrícia");

    assertThat(salvos.get(0).nome()).isEqualTo("Apólice.pdf");
    assertThat(salvos.get(0).tipoDeConteudo()).isEqualTo("application/pdf");
    assertThat(salvos.get(0).enviadoPor()).isEqualTo("Patrícia");
    ArgumentCaptor<String> chave = ArgumentCaptor.forClass(String.class);
    verify(armazenamento).guardar(chave.capture(), any());
    assertThat(chave.getValue()).matches("[0-9a-f-]{36}");
  }
}
