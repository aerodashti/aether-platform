package br.com.aerodash.aether.documento;

import br.com.aerodash.aether.aeronave.AeronaveRepository;
import br.com.aerodash.aether.comum.erro.RecursoNaoEncontradoException;
import br.com.aerodash.aether.comum.observabilidade.ContextoDaRequisicao;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * Os documentos de cada aeronave. Banco e armazenamento andam juntos: o envio que falha no meio
 * apaga os arquivos que já tinha gravado, e a remoção só apaga o arquivo depois que o banco
 * confirmou — nunca sobra linha apontando para arquivo que não existe.
 */
@Service
public class DocumentoService {

  /**
   * Quantos arquivos cabem num envio. O Tomcat aceita mais partes que isto ({@code
   * server.tomcat.max-part-count}) para que o envio que passa do limite chegue aqui e ouça qual é.
   */
  public static final int ARQUIVOS_POR_ENVIO = 10;

  private static final Logger log = LoggerFactory.getLogger(DocumentoService.class);

  private final DocumentoRepository documentos;
  private final AeronaveRepository aeronaves;
  private final ArmazenamentoDeArquivos armazenamento;
  private final Clock relogio;
  private final ContextoDaRequisicao contexto;

  public DocumentoService(
      DocumentoRepository documentos,
      AeronaveRepository aeronaves,
      ArmazenamentoDeArquivos armazenamento,
      Clock relogio,
      ContextoDaRequisicao contexto) {
    this.documentos = documentos;
    this.aeronaves = aeronaves;
    this.armazenamento = armazenamento;
    this.relogio = relogio;
    this.contexto = contexto;
  }

  @Transactional(readOnly = true)
  public DocumentosResponse listar(Long aeronaveId) {
    exigirAeronave(aeronaveId);
    List<DocumentoResponse> lista =
        documentos.findByAeronaveIdOrderByCriadoEmDescIdDesc(aeronaveId).stream()
            .map(DocumentoService::paraResposta)
            .toList();
    contexto.registrar("documentos.quantidade", lista.size());
    return new DocumentosResponse(
        lista, lista.stream().mapToLong(DocumentoResponse::tamanho).sum());
  }

  @Transactional
  public List<DocumentoResponse> enviar(
      Long aeronaveId, List<ArquivoEnviado> arquivos, String enviadoPor) {
    exigirAeronave(aeronaveId);
    contexto.registrar("documentos.enviados", arquivos.size());
    if (arquivos.isEmpty()) {
      throw new DocumentoInvalidoException("Escolha ao menos um arquivo.");
    }
    boolean demais = arquivos.size() > ARQUIVOS_POR_ENVIO;
    contexto.decisao("documentos.passaDoLimiteDoEnvio", demais);
    if (demais) {
      throw new DocumentoInvalidoException(
          "Envie até " + ARQUIVOS_POR_ENVIO + " arquivos por vez.");
    }
    // Confere todos antes de gravar o primeiro: um envio de cinco com um recusado não pela metade.
    List<TipoDeArquivo> tipos = arquivos.stream().map(this::conferir).toList();

    Instant agora = Instant.now(relogio);
    List<String> gravados = new ArrayList<>();
    try {
      List<DocumentoResponse> salvos = new ArrayList<>();
      for (int i = 0; i < arquivos.size(); i++) {
        ArquivoEnviado arquivo = arquivos.get(i);
        Documento documento =
            new Documento(
                aeronaveId, arquivo.nome(), tipos.get(i), arquivo.tamanho(), enviadoPor, agora);
        try (InputStream conteudo = arquivo.conteudo().abrir()) {
          armazenamento.guardar(documento.getChave(), conteudo);
        }
        gravados.add(documento.getChave());
        salvos.add(paraResposta(documentos.save(documento)));
      }
      return salvos;
    } catch (IOException | RuntimeException falha) {
      apagarSemFalhar(gravados);
      throw falha instanceof IOException io
          ? new UncheckedIOException(io)
          : (RuntimeException) falha;
    }
  }

  @Transactional(readOnly = true)
  public ConteudoDoDocumento abrir(Long aeronaveId, Long id) {
    Documento documento = exigirDocumento(aeronaveId, id);
    try {
      return new ConteudoDoDocumento(
          documento.getNome(),
          documento.getTipoDeConteudo(),
          documento.getTamanho(),
          armazenamento.abrir(documento.getChave()));
    } catch (IOException falta) {
      // A linha existe e o arquivo não: alguém mexeu no armazenamento por fora.
      log.warn("Documento {} sem conteúdo no armazenamento", id, falta);
      throw new RecursoNaoEncontradoException("O arquivo deste documento não foi encontrado.");
    }
  }

  @Transactional
  public void remover(Long aeronaveId, Long id) {
    Documento documento = exigirDocumento(aeronaveId, id);
    documentos.delete(documento);
    String chave = documento.getChave();
    // O arquivo sai depois do commit: se o banco desistir, o documento continua inteiro.
    TransactionSynchronizationManager.registerSynchronization(
        new TransactionSynchronization() {
          @Override
          public void afterCommit() {
            apagarSemFalhar(List.of(chave));
          }
        });
    contexto.registrar("documento.removido", id);
  }

  /** Na ordem do mais barato ao mais caro: o conteúdo só é lido se o resto já passou. */
  private TipoDeArquivo conferir(ArquivoEnviado arquivo) {
    String nome = Documento.nomeLimpo(arquivo.nome());
    exigirTamanho(arquivo.tamanho(), nome);
    exigirNome(nome);
    TipoDeArquivo tipo = exigirTipo(nome);
    exigirConteudo(arquivo, nome, tipo);
    return tipo;
  }

  private void exigirTamanho(long tamanho, String nome) {
    boolean cabe = Documento.cabeNoLimite(tamanho);
    contexto.decisao("documento.cabeNoLimite", cabe);
    if (!cabe) {
      throw new DocumentoInvalidoException(
          tamanho <= 0
              ? "O arquivo \"" + nome + "\" está vazio."
              : "O arquivo \"" + nome + "\" passa de 20 MB.");
    }
  }

  private void exigirNome(String nome) {
    boolean possuiNome = Documento.possuiNome(nome);
    contexto.decisao("documento.possuiNome", possuiNome);
    if (!possuiNome) {
      throw new DocumentoInvalidoException(
          "O arquivo \"" + nome + "\" precisa de um nome antes da extensão.");
    }
  }

  private TipoDeArquivo exigirTipo(String nome) {
    var tipo = TipoDeArquivo.doNome(nome);
    contexto.decisao("documento.tipoAceito", tipo.isPresent());
    return tipo.orElseThrow(
        () ->
            new DocumentoInvalidoException(
                "O tipo de \""
                    + nome
                    + "\" não é aceito. Aceitos: "
                    + TipoDeArquivo.aceitos()
                    + "."));
  }

  private void exigirConteudo(ArquivoEnviado arquivo, String nome, TipoDeArquivo tipo) {
    boolean confere = tipo.reconhece(inicioDe(arquivo));
    contexto.decisao("documento.conteudoConfere", confere);
    if (!confere) {
      throw new DocumentoInvalidoException(
          "O conteúdo de \""
              + nome
              + "\" não é de um arquivo "
              + tipo.getNome()
              + ": confira se ele abre antes de enviar.");
    }
  }

  private static byte[] inicioDe(ArquivoEnviado arquivo) {
    try (InputStream conteudo = arquivo.conteudo().abrir()) {
      return conteudo.readNBytes(AssinaturaDoConteudo.BYTES_LIDOS);
    } catch (IOException falha) {
      throw new UncheckedIOException(falha);
    }
  }

  private void apagarSemFalhar(List<String> chaves) {
    for (String chave : chaves) {
      try {
        armazenamento.apagar(chave);
      } catch (IOException | RuntimeException falha) {
        // Arquivo órfão no armazenamento: não quebra ninguém, mas ocupa espaço até alguém limpar.
        log.warn("Arquivo {} ficou órfão no armazenamento", chave, falha);
      }
    }
  }

  private void exigirAeronave(Long aeronaveId) {
    contexto.registrar("aeronave.id", aeronaveId);
    if (!aeronaves.existsById(aeronaveId)) {
      throw new RecursoNaoEncontradoException("Aeronave não encontrada.");
    }
  }

  private Documento exigirDocumento(Long aeronaveId, Long id) {
    contexto.registrar("documento.id", id);
    return documentos
        .findByIdAndAeronaveId(id, aeronaveId)
        .orElseThrow(() -> new RecursoNaoEncontradoException("Documento não encontrado."));
  }

  private static DocumentoResponse paraResposta(Documento documento) {
    return new DocumentoResponse(
        documento.getId(),
        documento.getAeronaveId(),
        documento.getNome(),
        documento.getTipoDeConteudo(),
        documento.getTamanho(),
        documento.getEnviadoPor(),
        documento.getCriadoEm());
  }
}
