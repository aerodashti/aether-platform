#!/usr/bin/env node
/**
 * Gera tokens.css e tokens.ts a partir de tokens.json.
 *
 * tokens.json é a fonte única. Os dois arquivos gerados nunca são editados à mão:
 * rode `npm run gerar-tokens` depois de qualquer mudança.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const pasta = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'design-system', 'tokens');
const tokens = JSON.parse(readFileSync(join(pasta, 'tokens.json'), 'utf8'));

const AVISO = '/* Gerado por scripts/gerar-tokens.mjs. Não edite: mexa em tokens.json. */';

const TEMAS = ['claro', 'escuro'];

/** Onde o nome da categoria não serve de prefixo do token, o prefixo está aqui. */
const PREFIXOS = { cores: 'cor', espacamento: 'espaco' };

/**
 * Uma categoria é tematizada quando declara os dois temas. Cor e elevação são: no claro a camada
 * vem da sombra, no escuro vem de um contorno de luz de 1px — não dá para ser o mesmo valor.
 */
const ehTematizada = (valores) => TEMAS.every((tema) => tema in valores);

/** Achata uma categoria em pares [nome-do-token, valor], já com o prefixo final. */
function achatar(categoria, valores) {
  const pares = [];
  for (const [chave, valor] of Object.entries(valores)) {
    if (typeof valor === 'object') {
      // tipografia e movimento agrupam por subcategoria: o grupo vira o prefixo.
      for (const [subChave, subValor] of Object.entries(valor)) {
        pares.push([`${chave}-${subChave}`, subValor]);
      }
    } else {
      pares.push([`${PREFIXOS[categoria] ?? categoria}-${chave}`, valor]);
    }
  }
  return pares;
}

// As chaves iniciadas por `$` são anotações para quem lê o arquivo, não tokens.
const categorias = Object.keys(tokens).filter((nome) => !nome.startsWith('$'));
const tematizadas = categorias.filter((nome) => ehTematizada(tokens[nome]));
const estaticas = categorias.filter((nome) => !ehTematizada(tokens[nome]));

const doTema = (tema) => tematizadas.flatMap((nome) => achatar(nome, tokens[nome][tema]));
const estaticos = estaticas.flatMap((nome) => achatar(nome, tokens[nome]));

const bloco = (pares, recuo = '  ') =>
  pares.map(([nome, valor]) => `${recuo}--${nome}: ${valor};`).join('\n');

const css = `${AVISO}

:root {
${bloco([...doTema('claro'), ...estaticos])}
}

:root[data-theme='escuro'] {
${bloco(doTema('escuro'))}
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme='claro']) {
${bloco(doTema('escuro'), '    ')}
  }
}
`;
writeFileSync(join(pasta, 'tokens.css'), css);

/** Agrupa os pares por prefixo para virar um objeto aninhado e tipado no TypeScript. */
function agrupar(pares) {
  const grupos = {};
  for (const [nome] of pares) {
    const [grupo, ...resto] = nome.split('-');
    grupos[grupo] ??= {};
    grupos[grupo][resto.join('-')] = `var(--${nome})`;
  }
  return grupos;
}

const grupos = agrupar([...doTema('claro'), ...estaticos]);
const corpo = Object.entries(grupos)
  .map(([grupo, valores]) => {
    const linhas = Object.entries(valores)
      .map(([chave, valor]) => `    '${chave}': '${valor}',`)
      .join('\n');
    return `  ${grupo}: {\n${linhas}\n  },`;
  })
  .join('\n');

const tipos = Object.keys(grupos)
  .map(
    (grupo) =>
      `export type ${grupo[0].toUpperCase()}${grupo.slice(1)} = keyof typeof tokens.${grupo};`,
  )
  .join('\n');

writeFileSync(
  join(pasta, 'tokens.ts'),
  `${AVISO}

export const tokens = {
${corpo}
} as const;

${tipos}
`,
);

console.info(
  `tokens.css e tokens.ts gerados com ${doTema('claro').length + estaticos.length} tokens.`,
);
