package br.com.aerodash.aether.voo;

import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

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
}
