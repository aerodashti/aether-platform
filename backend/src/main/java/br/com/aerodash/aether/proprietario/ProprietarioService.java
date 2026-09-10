package br.com.aerodash.aether.proprietario;

import br.com.aerodash.aether.comum.erro.RecursoNaoEncontradoException;
import br.com.aerodash.aether.comum.observabilidade.ContextoDaRequisicao;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Quem participa da frota: cadastro, contato e situação de cada proprietário. */
@Service
public class ProprietarioService {

  private final ProprietarioRepository proprietarios;
  private final ProprietarioMapper mapper;
  private final Clock relogio;
  private final ContextoDaRequisicao contexto;

  public ProprietarioService(
      ProprietarioRepository proprietarios,
      ProprietarioMapper mapper,
      Clock relogio,
      ContextoDaRequisicao contexto) {
    this.proprietarios = proprietarios;
    this.mapper = mapper;
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
    proprietario = proprietarios.save(proprietario);

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
    return mapper.paraResponse(proprietario);
  }

  @Transactional
  public ProprietarioResponse desativar(Long id) {
    Proprietario proprietario = buscar(id);
    contexto.decisao("proprietario.estaAtivo", proprietario.estaAtivo());
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
    String normalizado = Proprietario.normalizarCpfCnpj(cpfCnpj);

    boolean valido = Proprietario.cpfCnpjEhValido(normalizado);
    contexto.decisao("proprietario.cpfCnpjValido", valido);
    if (!valido) {
      throw new CpfCnpjInvalidoException();
    }

    boolean duplicado =
        normalizado != null
            && proprietarios
                .findByCpfCnpj(normalizado)
                .map(existente -> !existente.getId().equals(idAtual))
                .orElse(false);
    contexto.decisao("proprietario.cpfCnpjDuplicado", duplicado);
    if (duplicado) {
      throw new CpfCnpjJaCadastradoException();
    }
    return normalizado;
  }
}
