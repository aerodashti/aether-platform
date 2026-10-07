package br.com.aerodash.aether.aeronave;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

public interface AeronaveRepository extends JpaRepository<Aeronave, Long> {

  /** A matrícula é gravada normalizada, então a busca também recebe o valor já normalizado. */
  Optional<Aeronave> findByMatricula(String matricula);

  /**
   * A frota inteira, em ordem de matrícula.
   *
   * <p>Sem paginação de propósito: o primeiro cliente tem 30 aeronaves e a tela do protótipo não
   * pagina — ela é a lista da frota, não um relatório. Paginar aqui seria interface para um
   * problema que ninguém tem.
   */
  List<Aeronave> findAllByOrderByMatriculaAsc();

  /**
   * A aeronave com a linha travada até o fim da transação, para quem soma nos contadores — o diário
   * de voos. Sem a trava, dois lançamentos simultâneos liam o mesmo contador, cada um somava o seu
   * voo e o segundo a gravar apagava o primeiro.
   */
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  Optional<Aeronave> findTravadaById(Long id);
}
