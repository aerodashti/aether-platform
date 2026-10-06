package br.com.aerodash.aether.documento;

import br.com.aerodash.aether.autenticacao.UsuarioAutenticado;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * Os documentos de uma aeronave, sob a rota dela: ler é de quem tem sessão; enviar e remover, de
 * quem gere — as mesmas regras de {@code /aeronaves/**} em {@code ConfiguracaoDeSeguranca}.
 */
@RestController
@RequestMapping("/aeronaves/{aeronaveId}/documentos")
@Tag(name = "Documentos", description = "Arquivos anexados a uma aeronave")
public class DocumentoController {

  private final DocumentoService documentos;

  public DocumentoController(DocumentoService documentos) {
    this.documentos = documentos;
  }

  @GetMapping
  @Operation(summary = "Lista os documentos da aeronave, do mais recente ao mais antigo")
  public DocumentosResponse listar(@PathVariable Long aeronaveId) {
    return documentos.listar(aeronaveId);
  }

  @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  @ResponseStatus(HttpStatus.CREATED)
  @Operation(summary = "Anexa um ou mais arquivos, de até 20 MB cada")
  public List<DocumentoResponse> enviar(
      @PathVariable Long aeronaveId,
      @RequestPart("arquivos") List<MultipartFile> arquivos,
      @AuthenticationPrincipal UsuarioAutenticado solicitante) {
    return documentos.enviar(
        aeronaveId,
        arquivos.stream()
            .map(
                arquivo ->
                    new ArquivoEnviado(
                        arquivo.getOriginalFilename(), arquivo.getSize(), arquivo::getInputStream))
            .toList(),
        solicitante.nome());
  }

  /**
   * Sempre como anexo, com o tipo da lista do Aether: o navegador baixa, nunca interpreta — um
   * arquivo enviado não vira página servida pelo nosso domínio.
   */
  @GetMapping("/{id}/conteudo")
  @Operation(summary = "Baixa o arquivo")
  public ResponseEntity<InputStreamResource> baixar(
      @PathVariable Long aeronaveId, @PathVariable Long id) {
    ConteudoDoDocumento conteudo = documentos.abrir(aeronaveId, id);
    return ResponseEntity.ok()
        .header(
            HttpHeaders.CONTENT_DISPOSITION,
            ContentDisposition.attachment()
                .filename(conteudo.nome(), java.nio.charset.StandardCharsets.UTF_8)
                .build()
                .toString())
        .contentType(MediaType.parseMediaType(conteudo.tipoDeConteudo()))
        .contentLength(conteudo.tamanho())
        .body(new InputStreamResource(conteudo.conteudo()));
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  @Operation(summary = "Remove o documento e o arquivo — não pode ser desfeito")
  public void remover(@PathVariable Long aeronaveId, @PathVariable Long id) {
    documentos.remover(aeronaveId, id);
  }
}
