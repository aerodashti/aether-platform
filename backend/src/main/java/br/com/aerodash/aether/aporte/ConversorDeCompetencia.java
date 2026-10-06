package br.com.aerodash.aether.aporte;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import java.time.LocalDate;
import java.time.YearMonth;

/**
 * A competência é um mês, e o banco a guarda como o dia 1 dele: assim ela ordena, compara e entra
 * em BETWEEN como data, e o CHECK da tabela recusa qualquer outro dia.
 */
@Converter
public class ConversorDeCompetencia implements AttributeConverter<YearMonth, LocalDate> {

  @Override
  public LocalDate convertToDatabaseColumn(YearMonth competencia) {
    return competencia == null ? null : competencia.atDay(1);
  }

  @Override
  public YearMonth convertToEntityAttribute(LocalDate data) {
    return data == null ? null : YearMonth.from(data);
  }
}
