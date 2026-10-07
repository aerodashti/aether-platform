package br.com.aerodash.aether.proprietario;

import br.com.aerodash.aether.comum.erro.RecursoNaoEncontradoException;
import br.com.aerodash.aether.comum.observabilidade.ContextoDaRequisicao;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.hibernate.exception.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Quem participa da frota: cadastro, contato e situação de cada proprietário. */
@Service
public class ProprietarioService {

  /** O nome da UNIQUE de {@code V6__cria_proprietario.sql}. */
  private static final String DOCUMENTO_UNICO = "proprietario_cpf_cnpj_unico";

  private final ProprietarioRepository proprietarios;
  private final ProprietarioMapper mapper;
  private final ParticipacoesVigentes participacoes;
  private final Clock relogio;
  private final ContextoDaRequisicao contexto;

  public ProprietarioService(
      ProprietarioRepository proprietarios,
      ProprietarioMapper mapper,
      ParticipacoesVigentes participacoes,
      Clock relogio,
      ContextoDaRequisicao contexto) {
    this.proprietarios = proprietarios;
    this.mapper = mapper;
    this.participacoes = participacoes;
    this.relogio = relogio;
    this.contexto = contexto;
  }

  @Transactional(readOnly = true)
  public List<ProprietarioResponse> listar() {
    List<ProprietarioResponse> lista =
        proprietarios.findAllByOrderByNomeAsc().stream().map(mapper::paraResponse).toList();

    contexto.registrar("proprietarios.total", lista.size());
    contexto.registrar(
        "proprietarios.inativos",
        lista.stream().filter(p -> p.situacao() == SituacaoDoProprietario.INATIVO).count());
    return lista;
  }

  @Transactional
  public ProprietarioResponse criar(ProprietarioRequest request) {
    String cpfCnpj = validarCpfCnpj(request.cpfCnpj(), null);

    Proprietario proprietario =
        new Proprietario(
            request.nome(),
            cpfCnpj,
            request.email(),
            request.telefone(),
            request.corDeIdentificacao(),
            Instant.now(relogio));
    gravarConferindoDocumento(() -> proprietarios.saveAndFlush(proprietario));

    contexto.registrar("proprietario.id", proprietario.getId());
    return mapper.paraResponse(proprietario);
  }

  @Transactional
  public ProprietarioResponse atualizar(Long id, ProprietarioRequest request) {
    Proprietario proprietario = buscar(id);
    String cpfCnpj = validarCpfCnpj(request.cpfCnpj(), proprietario.getId());

    proprietario.atualizarCadastro(
        request.nome(),
        cpfCnpj,
        request.email(),
        request.telefone(),
        request.corDeIdentificacao(),
        Instant.now(relogio));
    gravarConferindoDocumento(proprietarios::flush);
    return mapper.paraResponse(proprietario);
  }

  @Transactional
  public ProprietarioResponse desativar(Long id) {
    Proprietario proprietario = buscar(id);
    contexto.decisao("proprietario.estaAtivo", proprietario.estaAtivo());
    boolean participa = participacoes.participaDeContratoVigente(id);
    contexto.decisao("proprietario.participaDeContratoVigente", participa);
    if (participa) {
      throw new ProprietarioComParticipacaoException(proprietario.getNome());
    }
    proprietario.desativar(Instant.now(relogio));
    return mapper.paraResponse(proprietario);
  }

  @Transactional
  public ProprietarioResponse reativar(Long id) {
    Proprietario proprietario = buscar(id);
    contexto.decisao("proprietario.estaAtivo", proprietario.estaAtivo());
    proprietario.reativar(Instant.now(relogio));
    return mapper.paraResponse(proprietario);
  }

  private Proprietario buscar(Long id) {
    contexto.registrar("proprietario.id", id);
    return proprietarios
        .findById(id)
        .orElseThrow(() -> new RecursoNaoEncontradoException("Proprietário não encontrado."));
  }

  /**
   * Normaliza e valida o documento, e garante a unicidade contra os demais cadastros. Devolve a
   * forma normalizada — é ela que a entidade grava.
   *
   * @param idAtual o próprio registro numa atualização, para não colidir consigo mesmo.
   */
  private String validarCpfCnpj(String cpfCnpj, Long idAtual) {
    String normalizado = CpfCnpj.normalizar(cpfCnpj);

    boolean valido = CpfCnpj.ehValido(normalizado);
    contexto.decisao("proprietario.cpfCnpjValido", valido);
    if (!valido) {
      throw new CpfCnpjInvalidoException();
    }

    Optional<Proprietario> titular =
        Optional.ofNullable(normalizado)
            .flatMap(proprietarios::findByCpfCnpj)
            .filter(existente -> !existente.getId().equals(idAtual));
    contexto.decisao("proprietario.cpfCnpjDuplicado", titular.isPresent());
    if (titular.isPresent()) {
      throw new CpfCnpjJaCadastradoException(titular.get().getNome(), titular.get().estaAtivo());
    }
    return normalizado;
  }

  /**
   * Leva a gravação ao banco já, para a UNIQUE do documento responder aqui dentro. Dois salvamentos
   * simultâneos do mesmo documento passam os dois pela consulta de {@link #validarCpfCnpj}, e só o
   * banco pega o segundo — que precisa ouvir o mesmo 409 no campo, e não um "registro duplicado"
   * genérico.
   */
  private void gravarConferindoDocumento(Runnable gravacao) {
    try {
      gravacao.run();
    } catch (DataIntegrityViolationException violacao) {
      boolean documentoRepetido = violouDocumentoUnico(violacao);
      contexto.decisao("proprietario.cpfCnpjDuplicadoNoBanco", documentoRepetido);
      if (documentoRepetido) {
        throw new CpfCnpjJaCadastradoException();
      }
      throw violacao;
    }
  }

  /** Se a recusa do banco foi a UNIQUE do documento, e não outra restrição da tabela. */
  static boolean violouDocumentoUnico(DataIntegrityViolationException violacao) {
    for (Throwable causa = violacao.getCause(); causa != null; causa = causa.getCause()) {
      if (causa instanceof ConstraintViolationException restricao) {
        return DOCUMENTO_UNICO.equalsIgnoreCase(restricao.getConstraintName());
      }
    }
    return false;
  }
}
