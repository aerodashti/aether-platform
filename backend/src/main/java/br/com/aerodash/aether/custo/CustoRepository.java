package br.com.aerodash.aether.custo;

import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Quatro consultas derivadas, como no diário de voos: o PostgreSQL não tipa {@code ? is null} para
 * datas, e o service escolhe a consulta registrando a decisão. O recorte natural — uma competência
 * de uma aeronave — é de dezenas de linhas; a linha de TOTAL soma o recorte inteiro.
 */
public interface CustoRepository extends JpaRepository<Custo, Long> {

  List<Custo> findByAeronaveIdAndDataBetweenOrderByDataDescIdDesc(
      Long aeronaveId, LocalDate inicio, LocalDate fim);

  List<Custo> findByAeronaveIdOrderByDataDescIdDesc(Long aeronaveId);

  List<Custo> findByDataBetweenOrderByDataDescIdDesc(LocalDate inicio, LocalDate fim);

  List<Custo> findAllByOrderByDataDescIdDesc();
}
