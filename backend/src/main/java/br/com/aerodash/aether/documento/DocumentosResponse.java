package br.com.aerodash.aether.documento;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

/** Os documentos de uma aeronave, do mais recente ao mais antigo, e o espaço que ocupam. */
@Schema(description = "Documentos de uma aeronave")
public record DocumentosResponse(
    List<DocumentoResponse> documentos,
    @Schema(description = "Soma dos tamanhos, em bytes") long tamanhoTotal) {}
