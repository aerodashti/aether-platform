package br.com.aerodash.aether.documento;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Onde os documentos ficam guardados.
 *
 * @param diretorio onde o adaptador de disco guarda os arquivos; em produção, um volume persistente
 *     incluído no backup
 */
@ConfigurationProperties("aether.documentos")
public record PropriedadesDeDocumentos(String diretorio) {}
