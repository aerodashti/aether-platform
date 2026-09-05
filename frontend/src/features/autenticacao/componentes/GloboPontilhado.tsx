import {
  geoBounds,
  geoContains,
  geoDistance,
  geoInterpolate,
  geoGraticule,
  geoOrthographic,
  geoPath,
} from 'd3-geo';
import { useEffect, useRef } from 'react';

import estilos from './GloboPontilhado.module.css';

/** Colar o globo é caro; girar é barato. Um quarto de grau por quadro dá uma volta em ~24 s. */
const GRAUS_POR_QUADRO = 0.18;

/** Graus entre pontos da malha. Abaixo de 1.2 o custo explode: cresce com o quadrado do inverso. */
const ESPACAMENTO_PADRAO = 1.4;

/** Teto de pontos. Estourou, a malha afrouxa sozinha em vez de travar a aba. */
const MAXIMO_DE_PONTOS = 9000;

const FATOR_DE_AFROUXAMENTO = 1.28;
const TENTATIVAS_DE_MALHA = 4;

/** Rotação inicial: o Atlântico Sul de frente, que põe o Brasil no centro. */
const ROTACAO_INICIAL: [number, number] = [-40, -12];

/**
 * Silhueta vetorial de um avião visto de cima, num quadrado de 100×100.
 *
 * <p>Fica como texto, e o `Path2D` só é construído dentro do efeito: montá-lo no topo do módulo
 * quebraria qualquer ambiente sem canvas — o jsdom dos testes, entre eles — só por importar a tela.
 */
const TRACADO_DO_AVIAO =
  'M 50,2 C 47,6 46,15 46,35 L 12,65 L 13,69 L 46,58 L 46,72 C 43,72 41,75 41,82' +
  ' C 41,86 44,87 46,87 L 46,92 L 30,96 L 30,99 L 50,96 L 70,99 L 70,96 L 54,92' +
  ' L 54,87 C 56,87 59,86 59,82 C 59,75 57,72 54,72 L 54,58 L 87,69 L 88,65 L 54,35' +
  ' C 54,15 53,6 50,2 Z';

const AEROPORTOS: Record<string, [number, number]> = {
  GRU: [-46.63, -23.55],
  MIA: [-80.19, 25.76],
  JFK: [-74.0, 40.71],
  LHR: [-0.12, 51.5],
  HND: [139.69, 35.68],
  SFO: [-122.41, 37.77],
  DXB: [55.27, 25.2],
  SIN: [103.82, 1.35],
  SYD: [151.21, -33.87],
  LAX: [-118.24, 34.05],
  FRA: [8.68, 50.11],
  CPT: [18.42, -33.92],
};

/** Seis rotas de longo curso, com durações diferentes para os aviões não andarem em formação. */
const ROTAS: ReadonlyArray<[string, string, number, number]> = [
  ['GRU', 'MIA', 21000, 0],
  ['JFK', 'LHR', 24000, 4000],
  ['HND', 'SFO', 27000, 9000],
  ['DXB', 'SIN', 20000, 13000],
  ['SYD', 'LAX', 30000, 6000],
  ['FRA', 'CPT', 23000, 16000],
];

type Ponto = [lng: number, lat: number, x: number, y: number, z: number];

interface Paleta {
  acento: string;
  pontos: string;
  contorno: string;
  esferaCentro: string;
  esferaBorda: string;
}

interface GeoJson {
  features: Array<{ type: string; geometry: unknown; properties?: unknown }>;
}

interface GloboPontilhadoProps {
  /** Caminho do GeoJSON de terras. Falhando, o globo desenha sem continentes em vez de sumir. */
  fonteDaTerra?: string;
  espacamento?: number;
}

/**
 * Globo pontilhado com tráfego aéreo — o painel direito da tela de entrada.
 *
 * <p>É decorativo: `aria-hidden`, e a tela funciona inteira sem ele. Se o GeoJSON não carregar,
 * restam a esfera e o graticule; se o movimento for recusado por preferência do sistema, ele para
 * de girar mas continua desenhado.
 */
export function GloboPontilhado({
  fonteDaTerra = '/dados/terra-110m.json',
  espacamento = ESPACAMENTO_PADRAO,
}: GloboPontilhadoProps) {
  const container = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!container.current || !canvas.current) {
      return;
    }
    // Tipos declarados já não-nulos: o estreitamento do `if` acima não alcança o corpo das funções
    // declaradas adiante, que são içadas para antes dele.
    const moldura: HTMLDivElement = container.current;
    const tela: HTMLCanvasElement = canvas.current;

    const pincel = tela.getContext('2d');
    if (!pincel) {
      return;
    }
    // O tipo é declarado já não-nulo: o estreitamento do `if` acima não alcança o corpo das
    // funções declaradas adiante, que são içadas para antes dele.
    const ctx: CanvasRenderingContext2D = pincel;
    const aviao = new Path2D(TRACADO_DO_AVIAO);

    const projecao = geoOrthographic().clipAngle(90).rotate(ROTACAO_INICIAL);
    const caminho = geoPath(projecao, ctx);
    const malhaDeMeridianos = geoGraticule().step([20, 20]);
    const rotas = ROTAS.map(([origem, destino, duracao, atraso]) => {
      const a = AEROPORTOS[origem] ?? [0, 0];
      const b = AEROPORTOS[destino] ?? [0, 0];
      return { a, interpolar: geoInterpolate(a, b), duracao, atraso };
    });

    const rotacao: [number, number] = [...ROTACAO_INICIAL];
    let largura = 0;
    let altura = 0;
    let raio = 0;
    let pontos: Ponto[] = [];
    let terra: GeoJson | null = null;
    let automatico = true;
    let paleta = lerPaleta(moldura);
    let quadro = 0;

    const semMovimento = window.matchMedia('(prefers-reduced-motion: reduce)');

    function gerarPontos(mapa: GeoJson, passoInicial: number): Ponto[] {
      let passo = passoInicial;
      for (let tentativa = 0; tentativa < TENTATIVAS_DE_MALHA; tentativa += 1) {
        const gerados: Ponto[] = [];
        for (const feicao of mapa.features) {
          const [[oesteMin, sulMin], [lesteMax, norteMax]] = geoBounds(
            feicao as Parameters<typeof geoBounds>[0],
          );
          for (let lng = oesteMin; lng <= lesteMax; lng += passo) {
            for (let lat = sulMin; lat <= norteMax; lat += passo) {
              if (!geoContains(feicao as Parameters<typeof geoContains>[0], [lng, lat])) {
                continue;
              }
              // Guarda o vetor cartesiano junto: assim o descarte do hemisfério oposto vira um
              // produto escalar por quadro, em vez de trigonometria ponto a ponto.
              const radLat = (lat * Math.PI) / 180;
              const radLng = (lng * Math.PI) / 180;
              const cosLat = Math.cos(radLat);
              gerados.push([
                lng,
                lat,
                cosLat * Math.cos(radLng),
                cosLat * Math.sin(radLng),
                Math.sin(radLat),
              ]);
            }
          }
        }
        if (gerados.length <= MAXIMO_DE_PONTOS) {
          return gerados;
        }
        passo *= FATOR_DE_AFROUXAMENTO;
      }
      return [];
    }

    function desenharEsfera(escala: number, centroX: number, centroY: number, fator: number) {
      ctx.beginPath();
      ctx.arc(centroX, centroY, escala, 0, Math.PI * 2);
      const brilho = ctx.createRadialGradient(
        centroX - escala * 0.32,
        centroY - escala * 0.32,
        escala * 0.08,
        centroX,
        centroY,
        escala,
      );
      brilho.addColorStop(0, paleta.esferaCentro);
      brilho.addColorStop(1, paleta.esferaBorda);
      ctx.fillStyle = brilho;
      ctx.fill();
      ctx.lineWidth = 1.1 * fator;
      ctx.strokeStyle = paleta.contorno;
      ctx.globalAlpha = 0.45;
      ctx.stroke();
      ctx.globalAlpha = 1;

      ctx.beginPath();
      caminho(malhaDeMeridianos());
      ctx.strokeStyle = paleta.acento;
      ctx.globalAlpha = 0.09;
      ctx.lineWidth = 0.7 * fator;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    function desenharTerra(fator: number) {
      if (!terra) {
        return;
      }
      ctx.beginPath();
      for (const feicao of terra.features) {
        caminho(feicao as Parameters<typeof caminho>[0]);
      }
      ctx.strokeStyle = paleta.contorno;
      ctx.globalAlpha = 0.3;
      ctx.lineWidth = 0.7 * fator;
      ctx.stroke();
      ctx.globalAlpha = 1;

      const lado = Math.max(0.85, 1.2 * fator);
      ctx.fillStyle = paleta.pontos;
      const radLat = (rotacao[1] * Math.PI) / 180;
      const radLng = (-rotacao[0] * Math.PI) / 180;
      const cosLat = Math.cos(-radLat);
      const vistaX = cosLat * Math.cos(radLng);
      const vistaY = cosLat * Math.sin(radLng);
      const vistaZ = Math.sin(-radLat);

      for (const ponto of pontos) {
        const [lng, lat, x, y, z] = ponto;
        if (x * vistaX + y * vistaY + z * vistaZ <= 0.02) {
          continue;
        }
        const projetado = projecao([lng, lat]);
        if (!projetado) {
          continue;
        }
        ctx.fillRect(projetado[0] - lado, projetado[1] - lado, lado * 2, lado * 2);
      }
    }

    function desenharVoos(fator: number, momento: number) {
      const centro: [number, number] = [-rotacao[0], -rotacao[1]];
      for (const rota of rotas) {
        const avanco = ((momento + rota.atraso) % rota.duracao) / rota.duracao;
        const atual = rota.interpolar(avanco);
        if (geoDistance(atual, centro) > Math.PI / 2) {
          continue;
        }
        const posicao = projecao(atual);
        if (!posicao) {
          continue;
        }

        ctx.beginPath();
        caminho({ type: 'LineString', coordinates: [rota.a, atual] });
        ctx.strokeStyle = paleta.acento;
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = 1.1 * fator;
        ctx.stroke();
        ctx.globalAlpha = 1;

        const adiante = projecao(rota.interpolar(Math.min(1, avanco + 0.01)));
        const angulo = adiante ? Math.atan2(adiante[1] - posicao[1], adiante[0] - posicao[0]) : 0;
        const escala = (34 * fator) / 100;
        ctx.save();
        ctx.translate(posicao[0], posicao[1]);
        ctx.rotate(angulo + Math.PI / 2);
        ctx.scale(escala, escala);
        ctx.translate(-50, -50);
        ctx.fillStyle = paleta.acento;
        ctx.fill(aviao);
        ctx.restore();
      }
    }

    function desenhar(momento: number) {
      ctx.clearRect(0, 0, largura, altura);
      const escala = projecao.scale();
      const fator = raio === 0 ? 1 : escala / raio;
      desenharEsfera(escala, largura / 2, altura / 2, fator);
      desenharTerra(fator);
      desenharVoos(fator, momento);
    }

    function redimensionar() {
      const caixa = moldura.getBoundingClientRect();
      largura = Math.max(60, caixa.width);
      altura = Math.max(60, caixa.height);
      raio = Math.min(largura, altura) / 2.08;
      // Teto de 2: acima disso o custo quadruplica sem diferença visível.
      const densidade = Math.min(2, window.devicePixelRatio || 1);
      tela.width = largura * densidade;
      tela.height = altura * densidade;
      ctx.setTransform(densidade, 0, 0, densidade, 0, 0);
      projecao.scale(raio).translate([largura / 2, altura / 2]);
      paleta = lerPaleta(moldura);
      desenhar(0);
    }

    const observador = new ResizeObserver(redimensionar);
    observador.observe(moldura);
    redimensionar();

    // O tema troca os tokens; sem reler a paleta o globo ficaria com as cores do tema anterior.
    const observadorDeTema = new MutationObserver(() => {
      paleta = lerPaleta(moldura);
    });
    observadorDeTema.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    let ativo = true;
    const animar = (momento: number) => {
      if (!ativo) {
        return;
      }
      quadro = requestAnimationFrame(animar);
      // Aba escondida ou painel fora de tela: nada a desenhar, e continuar custaria bateria.
      if (document.hidden || moldura.offsetParent === null || largura <= 60) {
        return;
      }
      if (automatico && !semMovimento.matches) {
        rotacao[0] += GRAUS_POR_QUADRO;
        projecao.rotate(rotacao);
      }
      desenhar(momento);
    };
    quadro = requestAnimationFrame(animar);

    let arrastando: { x: number; y: number; rotacao: [number, number] } | null = null;
    const aoPressionar = (evento: PointerEvent) => {
      arrastando = { x: evento.clientX, y: evento.clientY, rotacao: [...rotacao] };
      automatico = false;
      tela.setPointerCapture(evento.pointerId);
    };
    const aoMover = (evento: PointerEvent) => {
      if (!arrastando) {
        return;
      }
      rotacao[0] = arrastando.rotacao[0] + (evento.clientX - arrastando.x) * 0.45;
      rotacao[1] = Math.max(
        -90,
        Math.min(90, arrastando.rotacao[1] - (evento.clientY - arrastando.y) * 0.45),
      );
      projecao.rotate(rotacao);
    };
    const aoSoltar = (evento: PointerEvent) => {
      if (!arrastando) {
        return;
      }
      arrastando = null;
      tela.releasePointerCapture(evento.pointerId);
      // Uma pausa antes de retomar, para o giro não "arrancar" no instante em que se solta.
      window.setTimeout(() => {
        automatico = true;
      }, 400);
    };
    tela.addEventListener('pointerdown', aoPressionar);
    tela.addEventListener('pointermove', aoMover);
    tela.addEventListener('pointerup', aoSoltar);
    tela.addEventListener('pointercancel', aoSoltar);

    const cancelar = new AbortController();
    fetch(fonteDaTerra, { signal: cancelar.signal })
      .then((resposta) => (resposta.ok ? resposta.json() : Promise.reject(new Error('mapa'))))
      .then((mapa: GeoJson) => {
        terra = mapa;
        pontos = gerarPontos(mapa, espacamento);
      })
      // Sem continentes o globo continua legível: esfera, meridianos e rotas. Degradar em silêncio
      // é deliberado — não há nada que a pessoa na tela de entrada possa fazer a respeito.
      .catch(() => {});

    return () => {
      ativo = false;
      cancelAnimationFrame(quadro);
      cancelar.abort();
      observador.disconnect();
      observadorDeTema.disconnect();
      tela.removeEventListener('pointerdown', aoPressionar);
      tela.removeEventListener('pointermove', aoMover);
      tela.removeEventListener('pointerup', aoSoltar);
      tela.removeEventListener('pointercancel', aoSoltar);
    };
  }, [fonteDaTerra, espacamento]);

  return (
    <div ref={container} className={estilos.moldura} aria-hidden="true">
      <canvas ref={canvas} className={estilos.tela} />
    </div>
  );
}

/** As cores vêm dos tokens: o canvas não enxerga CSS, então elas são lidas e repassadas. */
function lerPaleta(elemento: Element): Paleta {
  const estilo = getComputedStyle(elemento);
  const token = (nome: string, reserva: string) => estilo.getPropertyValue(nome).trim() || reserva;
  return {
    acento: token('--cor-acento', '#2e5e86'),
    pontos: token('--cor-acento-claro', '#85a9cc'),
    contorno: token('--cor-borda-forte', '#c3ccd8'),
    esferaCentro: token('--cor-superficie', '#fdfeff'),
    esferaBorda: token('--cor-superficie-sutil', '#f6f8fa'),
  };
}
