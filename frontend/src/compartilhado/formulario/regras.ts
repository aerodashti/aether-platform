import { casasDecimais, lerNumero } from '@/compartilhado/formatacao/numero';

/**
 * Uma regra olha o texto de um campo e devolve a mensagem do problema, ou `undefined` se está
 * certo. Regras são funções puras e pequenas; o formulário as combina com {@link primeiraFalha}.
 */
export type Regra = (texto: string) => string | undefined;

/** A mensagem da primeira regra que falhar, na ordem dada — a mais básica vem primeiro. */
export function primeiraFalha(texto: string, ...regras: Regra[]): string | undefined {
  for (const regra of regras) {
    const falha = regra(texto);
    if (falha !== undefined) {
      return falha;
    }
  }
  return undefined;
}

function estaVazio(texto: string): boolean {
  return texto.trim() === '';
}

/** Vazio, ou só com espaços, é falta — o servidor recusa os dois. */
export function obrigatorio(mensagem: string): Regra {
  return (texto) => (estaVazio(texto) ? mensagem : undefined);
}

/** O limite da coluna, dito antes de o `maxLength` cortar em silêncio o que foi colado. */
export function tamanhoMaximo(limite: number): Regra {
  return (texto) =>
    texto.trim().length > limite ? `Use no máximo ${limite} caracteres.` : undefined;
}

const NUMERO = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 4 });

interface LimitesDeNumero {
  /** Aceita o próprio mínimo. */
  minimo?: number;
  /** Precisa ser estritamente maior — o "maior que zero" de valores e horas. */
  maiorQue?: number;
  maximo?: number;
  /** Casas decimais aceitas; zero é inteiro. Casa com o `scale` da coluna. */
  casas?: number;
}

/**
 * Número no formato brasileiro (veja `lerNumero`) dentro dos limites da regra de negócio e da
 * coluna. Vazio passa: some com `obrigatorio` quando o campo não é opcional.
 */
export function numero({ minimo, maiorQue, maximo, casas }: LimitesDeNumero = {}): Regra {
  return (texto) => {
    if (estaVazio(texto)) {
      return undefined;
    }
    const valor = lerNumero(texto);
    if (valor === null) {
      return casas === 0
        ? 'Use só números inteiros.'
        : 'Use só números, com vírgula para as casas decimais.';
    }
    if (casas !== undefined && casasDecimais(texto) > casas) {
      if (casas === 0) {
        return 'Use um número inteiro.';
      }
      return casas === 1
        ? 'Use no máximo 1 casa decimal.'
        : `Use no máximo ${casas} casas decimais.`;
    }
    if (maiorQue !== undefined && valor <= maiorQue) {
      return `Informe um valor maior que ${NUMERO.format(maiorQue)}.`;
    }
    if (minimo !== undefined && valor < minimo) {
      return `O mínimo é ${NUMERO.format(minimo)}.`;
    }
    if (maximo !== undefined && valor > maximo) {
      return `O máximo é ${NUMERO.format(maximo)}.`;
    }
    return undefined;
  };
}

/** "2026-10-07" → "07/10/2026", para a mensagem falar a língua do campo. */
function dataEmTexto(iso: string): string {
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

/**
 * Data ISO (`AAAA-MM-DD`, o `value` do campo nativo) dentro de um intervalo. As datas ISO se
 * comparam como texto, então não há fuso nem `Date` no meio.
 */
export function dataEntre({
  minimo,
  maximo,
  mensagemDeMinimo,
  mensagemDeMaximo,
}: {
  minimo?: string;
  maximo?: string;
  mensagemDeMinimo?: string;
  mensagemDeMaximo?: string;
}): Regra {
  return (texto) => {
    if (estaVazio(texto)) {
      return undefined;
    }
    if (minimo !== undefined && texto < minimo) {
      return mensagemDeMinimo ?? `Use uma data a partir de ${dataEmTexto(minimo)}.`;
    }
    if (maximo !== undefined && texto > maximo) {
      return mensagemDeMaximo ?? `Use uma data até ${dataEmTexto(maximo)}.`;
    }
    return undefined;
  };
}

/**
 * A forma que o `@Email` do backend aceita: parte local sem espaço, vírgula nem ponto e vírgula, e
 * um domínio de rótulos separados por ponto. Divergir disso faz o front barrar o que o servidor
 * aceitaria, ou o contrário.
 */
const FORMATO_DE_EMAIL =
  /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)*$/;

/**
 * O `FormatoDeEmail.EXPRESSAO` do servidor, que todo request com e-mail aplica junto do `@Email`:
 * o domínio precisa de ponto e de um sufixo de duas letras ou mais — "fulano@empresa" não é
 * endereço que receba e-mail.
 */
const DOMINIO_COMPLETO = /@[^@]+\.[^@.]{2,}$/;

export function email(mensagem = 'Informe um e-mail válido, como nome@empresa.com.br.'): Regra {
  return (texto) => {
    const limpo = texto.trim();
    return limpo === '' || (FORMATO_DE_EMAIL.test(limpo) && DOMINIO_COMPLETO.test(limpo))
      ? undefined
      : mensagem;
  };
}

export const MINIMO_DA_SENHA_NOVA = 8;
/** O teto do BCrypt, que conta bytes: 72 letras acentuadas ocupam 144. */
export const MAXIMO_DA_SENHA_NOVA_EM_BYTES = 72;

const codificador = new TextEncoder();

/**
 * A `@SenhaNova` do backend, para toda senha escolhida — redefinir, concluir o convite e trocar a
 * própria: ao menos 8 caracteres e no máximo 72 bytes em UTF-8. O espaço da ponta é parte da senha
 * e conta. Vazio passa: some com `obrigatorio`.
 */
export function senhaNova(): Regra {
  return (texto) => {
    if (texto === '') {
      return undefined;
    }
    if ([...texto].length < MINIMO_DA_SENHA_NOVA) {
      return `A senha precisa de ao menos ${MINIMO_DA_SENHA_NOVA} caracteres.`;
    }
    if (codificador.encode(texto).length > MAXIMO_DA_SENHA_NOVA_EM_BYTES) {
      return `A senha passa do limite de ${MAXIMO_DA_SENHA_NOVA_EM_BYTES} caracteres (letras acentuadas e símbolos contam como dois ou mais).`;
    }
    return undefined;
  };
}

/** A mesma expressão de `FormatoDeTelefone` no backend: 8 a 20 caracteres, ao menos 8 dígitos. */
const FORMATO_DE_TELEFONE = /^(?=(?:\D*\d){8})\+?[0-9 ()-]{8,20}$/;

export function telefone(
  mensagem = 'Use só números, com +, espaço, parênteses ou hífen, como +55 11 98888-0000.',
): Regra {
  return (texto) =>
    estaVazio(texto) || FORMATO_DE_TELEFONE.test(texto.trim()) ? undefined : mensagem;
}

/** "AAAA-MM", com mês de 01 a 12 — o que o campo de mês entrega, ou o que se digita onde ele falta. */
const FORMATO_DE_COMPETENCIA = /^\d{4}-(0[1-9]|1[0-2])$/;

export function ehCompetencia(texto: string): boolean {
  return FORMATO_DE_COMPETENCIA.test(texto);
}

export function competencia(mensagem = 'Use o formato AAAA-MM, como 2026-10.'): Regra {
  return (texto) => (estaVazio(texto) || ehCompetencia(texto.trim()) ? undefined : mensagem);
}
