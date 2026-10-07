package br.com.aerodash.aether.custo;

import br.com.aerodash.aether.aeronave.Aeronave;
import br.com.aerodash.aether.aeronave.AeronaveRepository;
import br.com.aerodash.aether.comum.erro.RecursoNaoEncontradoException;
import br.com.aerodash.aether.comum.observabilidade.ContextoDaRequisicao;
import br.com.aerodash.aether.proprietario.Proprietario;
import br.com.aerodash.aether.proprietario.ProprietarioRepository;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Os lançamentos de custo: o que a aeronave gastou, classificado para o rateio e as análises. */
@Service
public class CustoService {

  private static final String CAMPO_AERONAVE = "aeronaveId";
  private static final String CAMPO_CAMBIO = "cambio";
  private static final String CAMPO_PROPRIETARIO = "proprietarioId";
  private static final DateTimeFormatter DATA = DateTimeFormatter.ofPattern("dd/MM/yyyy");

  private final CustoRepository custos;
  private final AeronaveRepository aeronaves;
  private final ProprietarioRepository proprietarios;
  private final ParticipantesDoCusto participantes;
  private final Clock relogio;
  private final ContextoDaRequisicao contexto;

  public CustoService(
      CustoRepository custos,
      AeronaveRepository aeronaves,
      ProprietarioRepository proprietarios,
      ParticipantesDoCusto participantes,
      Clock relogio,
      ContextoDaRequisicao contexto) {
    this.custos = custos;
    this.aeronaves = aeronaves;
    this.proprietarios = proprietarios;
    this.participantes = participantes;
    this.relogio = relogio;
    this.contexto = contexto;
  }

  @Transactional(readOnly = true)
  public LancamentosResponse listar(Long aeronaveId, YearMonth competencia) {
    contexto.decisao("custos.filtroPorAeronave", aeronaveId != null);
    contexto.decisao("custos.filtroPorCompetencia", competencia != null);
    List<Custo> recorte = recorteDe(aeronaveId, competencia);

    contexto.registrar("custos.lancamentos", recorte.size());
    return new LancamentosResponse(paraLinhas(recorte), totaisDe(recorte));
  }

  @Transactional
  public CustoResponse criar(CustoRequest request) {
    exigirAeronave(request.aeronaveId());
    validarCambio(request);
    validarAtribuicao(request);

    Custo custo = new Custo(request.aeronaveId(), dadosDe(request), Instant.now(relogio));
    exigirCoerencia(custo);
    custo = custos.save(custo);

    contexto.registrar("custo.id", custo.getId());
    contexto.decisao("custo.rateado", custo.ehRateado());
    return paraLinhas(List.of(custo)).get(0);
  }

  @Transactional
  public CustoResponse atualizar(Long id, CustoRequest request) {
    Custo custo = exigirCusto(id);

    boolean trocaDeAeronave = !Objects.equals(request.aeronaveId(), custo.getAeronaveId());
    contexto.decisao("custo.trocaDeAeronave", trocaDeAeronave);
    if (trocaDeAeronave) {
      throw new CustoInvalidoException(
          "A aeronave do lançamento não muda: exclua e relance na aeronave certa.", CAMPO_AERONAVE);
    }
    validarCambio(request);
    // Quem saiu da aeronave fica inativo, e os custos dele seguem corrigíveis sem trocar de dono:
    // trocar falsearia o histórico e o rateio dos meses passados.
    boolean atribuicaoMudou = !custo.estaAtribuidoA(request.proprietarioId());
    contexto.decisao("custo.atribuicaoMudou", atribuicaoMudou);
    if (atribuicaoMudou) {
      validarAtribuicao(request);
    }

    custo.atualizar(dadosDe(request), Instant.now(relogio));
    // A recusa desfaz a transação: nada da correção chega ao banco.
    exigirCoerencia(custo);
    return paraLinhas(List.of(custo)).get(0);
  }

  @Transactional
  public void excluir(Long id) {
    Custo custo = exigirCusto(id);
    custos.delete(custo);
    contexto.registrar("custo.excluido", id);
  }

  private void validarCambio(CustoRequest request) {
    boolean cambioObrigatorio = request.moeda() != MoedaDoCusto.BRL;
    contexto.decisao("custo.moedaEstrangeira", cambioObrigatorio);
    if (cambioObrigatorio && request.cambio() == null) {
      throw new CustoInvalidoException(
          "Lançamento em moeda estrangeira exige o câmbio do dia.", CAMPO_CAMBIO);
    }
    if (!cambioObrigatorio && request.cambio() != null) {
      throw new CustoInvalidoException("Lançamento em BRL não carrega câmbio.", CAMPO_CAMBIO);
    }
  }

  private void validarAtribuicao(CustoRequest request) {
    boolean atribuido = request.proprietarioId() != null;
    contexto.decisao("custo.atribuido", atribuido);
    if (!atribuido) {
      return;
    }
    Proprietario dono =
        proprietarios
            .findById(request.proprietarioId())
            .orElseThrow(
                () ->
                    new CustoInvalidoException("Proprietário não encontrado.", CAMPO_PROPRIETARIO));
    contexto.decisao("custo.proprietarioAtivo", dono.estaAtivo());
    if (!dono.estaAtivo()) {
      throw new CustoInvalidoException(
          "Proprietário inativo não recebe atribuição de custo: reative "
              + dono.getNome()
              + " antes.",
          CAMPO_PROPRIETARIO);
    }
    boolean participa =
        participantes.participaOuParticipou(request.aeronaveId(), request.proprietarioId());
    contexto.decisao("custo.proprietarioParticipa", participa);
    if (!participa) {
      throw new CustoInvalidoException(
          dono.getNome()
              + " nunca participou desta aeronave: inclua no contrato quem vai pagar ou rateie o"
              + " custo.",
          CAMPO_PROPRIETARIO);
    }
  }

  /** O que só o lançamento montado sabe: a data contra hoje e o BRL que o câmbio derivou. */
  private void exigirCoerencia(Custo custo) {
    LocalDate hoje = LocalDate.now(relogio);
    boolean dataAceitavel = custo.possuiDataAceitavel(hoje);
    contexto.decisao("custo.dataAceitavel", dataAceitavel);
    if (!dataAceitavel) {
      throw new CustoInvalidoException(
          "Use uma data entre "
              + DATA.format(Custo.PRIMEIRA_DATA_ACEITA)
              + " e "
              + DATA.format(Custo.ultimaDataAceita(hoje))
              + ", até "
              + Custo.DIAS_DE_ANTECEDENCIA
              + " dias à frente de hoje.",
          "data");
    }
    boolean valorDentroDoLimite = custo.possuiValorDentroDoLimite();
    contexto.decisao("custo.valorDentroDoLimite", valorDentroDoLimite);
    if (!valorDentroDoLimite) {
      throw new CustoInvalidoException(
          "Convertido para reais, o lançamento passa de R$ 999.999.999.999,99.", "valor");
    }
  }

  private List<Custo> recorteDe(Long aeronaveId, YearMonth competencia) {
    if (aeronaveId != null && competencia != null) {
      return custos.findByAeronaveIdAndDataBetweenOrderByDataDescIdDesc(
          aeronaveId, competencia.atDay(1), competencia.atEndOfMonth());
    }
    if (aeronaveId != null) {
      return custos.findByAeronaveIdOrderByDataDescIdDesc(aeronaveId);
    }
    if (competencia != null) {
      return custos.findByDataBetweenOrderByDataDescIdDesc(
          competencia.atDay(1), competencia.atEndOfMonth());
    }
    return custos.findAllByOrderByDataDescIdDesc();
  }

  private DadosDoCusto dadosDe(CustoRequest request) {
    return new DadosDoCusto(
        request.categoria(),
        request.data(),
        request.descricao(),
        request.relatorioDeVoo(),
        request.proprietarioId(),
        request.notaFiscal(),
        request.moeda(),
        request.valor(),
        request.cambio());
  }

  /** A aeronave vem no corpo: inexistente é recusa do campo, não um endereço que não existe. */
  private void exigirAeronave(Long aeronaveId) {
    contexto.registrar("aeronave.id", aeronaveId);
    boolean existe = aeronaves.existsById(aeronaveId);
    contexto.decisao("custo.aeronaveExiste", existe);
    if (!existe) {
      throw new CustoInvalidoException("Aeronave não encontrada.", CAMPO_AERONAVE);
    }
  }

  private Custo exigirCusto(Long id) {
    contexto.registrar("custo.id", id);
    return custos
        .findById(id)
        .orElseThrow(() -> new RecursoNaoEncontradoException("Lançamento não encontrado."));
  }

  /** Nome, cor e matrícula em lote: a grade não faz uma busca por linha. */
  private List<CustoResponse> paraLinhas(List<Custo> recorte) {
    Map<Long, Aeronave> frota =
        aeronaves
            .findAllById(recorte.stream().map(Custo::getAeronaveId).distinct().toList())
            .stream()
            .collect(Collectors.toMap(Aeronave::getId, Function.identity()));
    Map<Long, Proprietario> donos =
        proprietarios
            .findAllById(
                recorte.stream()
                    .map(Custo::getProprietarioId)
                    .filter(Objects::nonNull)
                    .distinct()
                    .toList())
            .stream()
            .collect(Collectors.toMap(Proprietario::getId, Function.identity()));

    return recorte.stream().map(custo -> paraLinha(custo, frota, donos)).toList();
  }

  private CustoResponse paraLinha(
      Custo custo, Map<Long, Aeronave> frota, Map<Long, Proprietario> donos) {
    Aeronave aeronave = frota.get(custo.getAeronaveId());
    Proprietario dono =
        custo.getProprietarioId() == null ? null : donos.get(custo.getProprietarioId());
    return new CustoResponse(
        custo.getId(),
        custo.getAeronaveId(),
        aeronave == null ? null : aeronave.getMatricula(),
        custo.getTipo(),
        custo.getCategoria(),
        custo.getData(),
        custo.getDescricao(),
        custo.getRelatorioDeVoo(),
        custo.getProprietarioId(),
        dono == null ? null : dono.getNome(),
        dono == null ? null : dono.getCorDeIdentificacao(),
        custo.ehRateado(),
        custo.getNotaFiscal(),
        custo.getMoeda(),
        custo.getValorOriginal(),
        custo.getCambio(),
        custo.getValor());
  }

  private LancamentosResponse.TotaisDosLancamentos totaisDe(List<Custo> recorte) {
    BigDecimal fixos = somaDe(recorte, TipoDeCusto.FIXO);
    BigDecimal variaveis = somaDe(recorte, TipoDeCusto.VARIAVEL);
    return new LancamentosResponse.TotaisDosLancamentos(fixos, variaveis, fixos.add(variaveis));
  }

  private BigDecimal somaDe(List<Custo> recorte, TipoDeCusto tipo) {
    return recorte.stream()
        .filter(custo -> custo.getTipo() == tipo)
        .map(Custo::getValor)
        .reduce(BigDecimal.ZERO, BigDecimal::add);
  }
}
