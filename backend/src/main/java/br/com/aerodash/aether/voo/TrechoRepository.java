package br.com.aerodash.aether.voo;

import jakarta.persistence.LockModeType;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

/**
 * Sem paginação de propósito — o recorte natural é uma competência de uma aeronave, poucas dezenas
 * de trechos, e a linha de TOTAIS soma o recorte inteiro.
 *
 * <p>São quatro consultas derivadas, e não uma com parâmetros opcionais: o PostgreSQL não tipa
 * {@code ? is null} para datas, e o service escolhe a consulta registrando a decisão.
 */
public interface TrechoRepository extends JpaRepository<Trecho, Long> {

  List<Trecho> findByAeronaveIdAndDataBetweenOrderByDataDescRelatorioDeVooDescNumeroDoTrechoDesc(
      Long aeronaveId, LocalDate inicio, LocalDate fim);

  List<Trecho> findByAeronaveIdOrderByDataDescRelatorioDeVooDescNumeroDoTrechoDesc(Long aeronaveId);

  List<Trecho> findByDataBetweenOrderByDataDescRelatorioDeVooDescNumeroDoTrechoDesc(
      LocalDate inicio, LocalDate fim);

  List<Trecho> findAllByOrderByDataDescRelatorioDeVooDescNumeroDoTrechoDesc();

  /**
   * O trecho com a linha travada, para a correção e a exclusão estornarem o que está gravado — e
   * não o que uma correção simultânea acabou de substituir.
   */
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  Optional<Trecho> findTravadoById(Long id);
}
