# ADR-0020: Os arquivos dos documentos ficam no disco do servidor, atrás de uma porta

> **Quando ler este arquivo:** antes de subir o Aether num servidor novo, de mudar para uma nuvem
> ou de criar outra feature que guarde arquivo.

- **Status:** aceito
- **Data:** 2026-10-06

## Contexto

A tela de Documentos anexa arquivos à aeronave (contrato, apólice, CVA digitalizado, laudos). O
primeiro deploy será numa VPS da Hostinger; mais adiante, conforme o produto crescer, a ideia é
migrar para GCP ou AWS. Não há infraestrutura de arquivos hoje, e o volume esperado é pequeno —
dezenas de arquivos por aeronave, de até 20 MB.

## Decisão

O conteúdo fica num diretório do servidor (`aether.documentos.diretorio`), gravado pelo
adaptador `ArmazenamentoEmDisco` da porta `ArmazenamentoDeArquivos`; o banco guarda só os
metadados, e cada arquivo é endereçado por uma chave UUID gerada pelo Aether.

## Alternativas consideradas

| Alternativa | Por que não |
| --- | --- |
| Conteúdo no PostgreSQL (`bytea`) | Um backup só, mas o banco cresce com arquivos que nunca são consultados, e a migração para a nuvem levaria os arquivos de dentro do banco para um bucket — exportação em vez de cópia |
| Object storage desde já (MinIO na VPS, S3/GCS na nuvem) | É o destino, mas exige mais uma peça rodando e credenciais na VPS antes de haver necessidade. A porta deixa esse passo para quando a nuvem chegar |
| Nome original do arquivo como caminho no disco | Nome vindo do usuário vira caminho: colisão, acento, `../`. A chave UUID elimina as três |

## Consequências

- **Na VPS, o diretório precisa estar num volume persistente e entrar no backup** junto com o
  banco. Banco sem o diretório (ou o contrário) é documento listado que não abre.
- Migrar para a nuvem é: escrever o adaptador (`ArmazenamentoEmS3`, `…EmGcs`), copiar a pasta
  para o bucket mantendo os nomes (as chaves) e trocar o bean. Tela, regra e banco não mudam.
- O download sai sempre como anexo, com o tipo da lista fechada do Aether (`TipoDeArquivo`) e
  `nosniff`: um arquivo enviado nunca vira página servida pelo nosso domínio.
- Envio e remoção mantêm banco e disco coerentes: envio que falha apaga o que já gravou; remoção
  apaga o arquivo só depois do commit. O que escapar (queda no meio) vira arquivo órfão, com WARN
  no log — ocupa espaço, não quebra nada.
- Remover apaga de verdade (decisão de produto, 2026-10-06); a tela avisa que não pode ser
  desfeito.
- **Até 10 arquivos por envio** (`DocumentoService.ARQUIVOS_POR_ENVIO`), conferidos na tela e no
  servidor (400 em `campos.arquivos`). O Tomcat aceita até 50 partes (`server.tomcat.max-part-count`)
  só para o excesso chegar ao serviço e ouvir qual é o limite; acima disso, o tratador responde 400
  pedindo menos arquivos. Um teste de integração com `RANDOM_PORT` passa pelo Tomcat de verdade e
  trava esse arranjo.
- O nome sem parte-base é recusado, e o conteúdo é conferido pela **assinatura do conteúdo**
  (`AssinaturaDoConteudo`), não só pela extensão.
- No front, a soma do envio fica 1 MB abaixo do `max-request-size`, pela folga dos cabeçalhos do
  multipart. O download é por `fetch` e `Blob` (`compartilhado/arquivos/salvarArquivo.ts`, também
  usado pelo CSV de custos): a âncora vai ao `body` e o endereço só é revogado 40 s depois, para o
  navegador terminar de ler o arquivo.

## Quando revisitar

Quando o Aether sair da VPS para GCP ou AWS, quando houver mais de um servidor de aplicação (o
disco local deixa de ser compartilhado), ou quando o diretório passar de alguns GB.
