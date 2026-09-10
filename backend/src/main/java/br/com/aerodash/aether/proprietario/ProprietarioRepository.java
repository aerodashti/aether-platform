package br.com.aerodash.aether.proprietario;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProprietarioRepository extends JpaRepository<Proprietario, Long> {

  /**
   * Todos, em ordem de nome, sem paginação de propósito: os proprietários são poucas dezenas por
   * conta — a tela é a lista de quem participa da frota, não um relatório. O recorte por busca e
   * situação é do front, pelo mesmo motivo.
   */
  List<Proprietario> findAllByOrderByNomeAsc();

  /** O documento é gravado normalizado, então a busca também recebe o valor já normalizado. */
  Optional<Proprietario> findByCpfCnpj(String cpfCnpj);
}
