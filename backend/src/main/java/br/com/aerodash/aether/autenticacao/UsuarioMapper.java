package br.com.aerodash.aether.autenticacao;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

/** Converte a entidade em DTO: a borda HTTP nunca vê um {@code Usuario}. */
@Mapper(componentModel = "spring")
public interface UsuarioMapper {

  SessaoResponse paraResponse(Usuario usuario);

  /**
   * {@code ultimoAcesso} é lido por expressão porque o getter devolve {@code Optional} — a entidade
   * usa Optional para que "nunca entrou" seja impossível de confundir com zero, e o MapStruct não
   * desembrulha isso sozinho.
   */
  @Mapping(target = "ultimoAcesso", expression = "java(usuario.getUltimoAcesso().orElse(null))")
  UsuarioResponse paraLinhaDaLista(Usuario usuario);
}
