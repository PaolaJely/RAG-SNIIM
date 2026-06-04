import { ScraperSNIIM } from "./lib/ScraperSNIIM.js";
import { writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, "../data");

const CONCURRENCY = 3;
const START_DATE = "01/01/2025";
const END_DATE = "01/01/2026";
const LIMIT = 6000;

const productos = [
  { id: 31, nombre: "acelga_primera" },
  { id: 130, nombre: "aguacate_criollo_primera" },
  { id: 131, nombre: "aguacate_fuerte_primera" },
  { id: 133, nombre: "aguacate_hass_primera" },
  { id: 136, nombre: "aguacate_hass_calidad_extra" },
  { id: 137, nombre: "aguacate_hass_calidad_super_extra" },
  { id: 135, nombre: "aguacate_hass_adelantado_primera" },
  { id: 138, nombre: "aguacate_hass_flor_vieja_primera" },
  { id: 139, nombre: "aguacate_pagua_primera" },
  { id: 142, nombre: "ajo_blanco_primera" },
  { id: 144, nombre: "ajo_blanco_8_primera" },
  { id: 146, nombre: "ajo_morado_primera" },
  { id: 152, nombre: "apio_primera" },
  { id: 157, nombre: "berenjena_primera" },
  { id: 160, nombre: "betabel_primera" },
  { id: 162, nombre: "brocoli_primera" },
  { id: 181, nombre: "cacahuate_primera" },
  { id: 166, nombre: "calabacita_criolla_primera" },
  { id: 170, nombre: "calabacita_italiana_primera" },
  { id: 180, nombre: "calabacita_regional_primera" },
  { id: 169, nombre: "calabaza_castilla_primera" },
  { id: 175, nombre: "camote_primera" },
  { id: 178, nombre: "cana_primera" },
  { id: 183, nombre: "cebolla_bola_primera" },
  { id: 182, nombre: "cebolla_bola_grande_primera" },
  { id: 190, nombre: "cebolla_rabo_primera" },
  { id: 187, nombre: "cebolla_morada_primera" },
  { id: 208, nombre: "cilantro_primera" },
  { id: 196, nombre: "ciruela_amarilla_primera" },
  { id: 197, nombre: "ciruela_claudia_primera" },
  { id: 198, nombre: "ciruela_huesuda_amarilla_primera" },
  { id: 199, nombre: "ciruela_huesuda_roja_primera" },
  { id: 200, nombre: "ciruela_moscatel_primera" },
  { id: 201, nombre: "ciruela_negra_primera" },
  { id: 203, nombre: "ciruela_pasa_primera" },
  { id: 207, nombre: "ciruela_roja_primera" },
  { id: 250, nombre: "coco_primera" },
  { id: 253, nombre: "col_grande_primera" },
  { id: 257, nombre: "col_mediana_primera" },
  { id: 265, nombre: "col_sin_clasificacion_primera" },
  { id: 263, nombre: "coliflor_grande_primera" },
  { id: 261, nombre: "coliflor_mediana_primera" },
  { id: 260, nombre: "coliflor_sin_clasificacion_primera" },
  { id: 270, nombre: "champinon_primera" },
  { id: 275, nombre: "chayote_primera" },
  { id: 272, nombre: "chayote_sin_espinas_primera" },
  { id: 285, nombre: "chicharo_primera" },
  { id: 279, nombre: "chicharo_arrugado_primera" },
  { id: 215, nombre: "chile_anaheim_primera" },
  { id: 216, nombre: "chile_ancho_primera" },
  { id: 221, nombre: "chile_california_primera" },
  { id: 222, nombre: "chile_caloro_primera" },
  { id: 223, nombre: "chile_caribe_primera" },
  { id: 220, nombre: "chile_cat_primera" },
  { id: 225, nombre: "chile_chilaca_primera" },
  { id: 213, nombre: "chile_arbol_fresco_primera" },
  { id: 217, nombre: "chile_arbol_seco_primera" },
  { id: 227, nombre: "chile_dulce_primera" },
  { id: 228, nombre: "chile_guajillo_primera" },
  { id: 230, nombre: "chile_habanero_primera" },
  { id: 232, nombre: "chile_hungaro_primera" },
  { id: 233, nombre: "chile_jalapeno_primera" },
  { id: 236, nombre: "chile_mirasol_primera" },
  { id: 237, nombre: "chile_pasilla_primera" },
  { id: 239, nombre: "chile_pimiento_morron_primera" },
  { id: 242, nombre: "chile_poblano_primera" },
  { id: 238, nombre: "chile_puya_fresco_primera" },
  { id: 245, nombre: "chile_puya_seco_primera" },
  { id: 246, nombre: "chile_serrano_primera" },
  { id: 290, nombre: "durazno_amarillo_primera" },
  { id: 294, nombre: "durazno_melocoton_primera" },
  { id: 297, nombre: "durazno_prisco_primera" },
  { id: 302, nombre: "ejote_primera" },
  { id: 299, nombre: "ejote_largo_primera" },
  { id: 304, nombre: "ejote_redondo_primera" },
  { id: 308, nombre: "elote_primera" },
  { id: 306, nombre: "elote_grande_primera" },
  { id: 307, nombre: "elote_mediano_primera" },
  { id: 312, nombre: "epazote_primera" },
  { id: 314, nombre: "esparrago_primera" },
  { id: 316, nombre: "espinaca_primera" },
  { id: 358, nombre: "fresa_primera" },
  { id: 356, nombre: "fresa_chandler_primera" },
  { id: 372, nombre: "granada_china_primera" },
  { id: 373, nombre: "granada_roja_primera" },
  { id: 374, nombre: "guanabana_primera" },
  { id: 378, nombre: "guayaba_primera" },
  { id: 385, nombre: "haba_verde_primera" },
  { id: 389, nombre: "jamaica_primera" },
  { id: 392, nombre: "jicama_primera" },
  { id: 396, nombre: "jicama_mediana_primera" },
  { id: 397, nombre: "jicama_pinatera_primera" },
  { id: 399, nombre: "kiwi_primera" },
  { id: 401, nombre: "lechuga_orejona_grande_primera" },
  { id: 403, nombre: "lechuga_orejona_sin_clasificacion_primera" },
  { id: 405, nombre: "lechuga_romanita_grande_primera" },
  { id: 407, nombre: "lechuga_romanita_mediana_primera" },
  { id: 409, nombre: "lechuga_romanita_sin_clasificacion_primera" },
  { id: 413, nombre: "lima_primera" },
  { id: 417, nombre: "limon_con_semilla_2_primera" },
  { id: 418, nombre: "limon_con_semilla_3_primera" },
  { id: 419, nombre: "limon_con_semilla_4_primera" },
  { id: 421, nombre: "limon_con_semilla_5_primera" },
  { id: 423, nombre: "limon_con_semilla_sin_clasificacion_primera" },
  { id: 426, nombre: "limon_sin_semilla_primera" },
  { id: 429, nombre: "mamey_primera" },
  { id: 451, nombre: "mandarina_primera" },
  { id: 447, nombre: "mandarina_monica_primera" },
  { id: 455, nombre: "mandarina_reyna_primera" },
  { id: 459, nombre: "mandarina_tangerina_primera" },
  { id: 465, nombre: "mango_ataulfo_primera" },
  { id: 469, nombre: "mango_criollo_primera" },
  { id: 473, nombre: "mango_haden_primera" },
  { id: 479, nombre: "mango_kent_primera" },
  { id: 480, nombre: "mango_manila_primera" },
  { id: 485, nombre: "mango_manililla_primera" },
  { id: 489, nombre: "mango_oro_primera" },
  { id: 494, nombre: "mango_tommy_primera" },
  { id: 519, nombre: "manzana_golden_delicious_primera" },
  { id: 522, nombre: "manzana_red_delicious_primera" },
  { id: 526, nombre: "manzana_starking_primera" },
  { id: 499, nombre: "melon_cantaloupe_9_primera" },
  { id: 500, nombre: "melon_cantaloupe_12_primera" },
  { id: 501, nombre: "melon_cantaloupe_14_primera" },
  { id: 502, nombre: "melon_cantaloupe_15_primera" },
  { id: 503, nombre: "melon_cantaloupe_16_primera" },
  { id: 505, nombre: "melon_cantaloupe_18_primera" },
  { id: 506, nombre: "melon_cantaloupe_22_primera" },
  { id: 507, nombre: "melon_cantaloupe_23_primera" },
  { id: 508, nombre: "melon_cantaloupe_27_primera" },
  { id: 510, nombre: "melon_cantaloupe_36_primera" },
  { id: 512, nombre: "melon_cantaloupe_45_primera" },
  { id: 513, nombre: "melon_cantaloupe_48_primera" },
  { id: 516, nombre: "melon_cantaloupe_sin_clasificacion_primera" },
  { id: 529, nombre: "membrillo_primera" },
  { id: 539, nombre: "nanche_primera" },
  { id: 534, nombre: "naranja_agria_primera" },
  { id: 536, nombre: "naranja_march_chica_primera" },
  { id: 537, nombre: "naranja_march_grande_primera" },
  { id: 538, nombre: "naranja_march_mediana_primera" },
  { id: 546, nombre: "naranja_valencia_chica_primera" },
  { id: 549, nombre: "naranja_valencia_grande_primera" },
  { id: 551, nombre: "naranja_valencia_mediana_primera" },
  { id: 554, nombre: "nectarina_primera" },
  { id: 560, nombre: "nopal_primera" },
  { id: 556, nombre: "nopal_grande_primera" },
  { id: 565, nombre: "nuez_primera" },
  { id: 566, nombre: "nuez_western_primera" },
  { id: 563, nombre: "nuez_cascara_papel_primera" },
  { id: 567, nombre: "nuez_wichita_primera" },
  { id: 607, nombre: "oregano_primera" },
  { id: 740, nombre: "papa_alpha_primera" },
  { id: 748, nombre: "papa_galeana_primera" },
  { id: 749, nombre: "papa_gema_primera" },
  { id: 753, nombre: "papa_marciana_primera" },
  { id: 766, nombre: "papa_rouset_primera" },
  { id: 767, nombre: "papa_san_jose_primera" },
  { id: 620, nombre: "papaya_amarilla_primera" },
  { id: 609, nombre: "papaya_maradol_primera" },
  { id: 623, nombre: "papaya_roja_primera" },
  { id: 771, nombre: "pepino_primera" },
  { id: 630, nombre: "pera_angel_primera" },
  { id: 645, nombre: "pera_asiatica_primera" },
  { id: 632, nombre: "pera_bartlett_135_primera" },
  { id: 626, nombre: "pera_bosco_primera" },
  { id: 634, nombre: "pera_danjou_100_primera" },
  { id: 638, nombre: "pera_lechera_primera" },
  { id: 639, nombre: "pera_mantequilla_primera" },
  { id: 640, nombre: "pera_paraiso_primera" },
  { id: 635, nombre: "perejil_primera" },
  { id: 646, nombre: "pina_chica_primera" },
  { id: 648, nombre: "pina_grande_primera" },
  { id: 651, nombre: "pina_mediana_primera" },
  { id: 655, nombre: "pistache_primera" },
  { id: 774, nombre: "pitaya_primera" },
  { id: 663, nombre: "platano_chiapas_primera" },
  { id: 665, nombre: "platano_chiapas_exportacion_primera" },
  { id: 666, nombre: "platano_dominico_primera" },
  { id: 670, nombre: "platano_enano_gigante_primera" },
  { id: 723, nombre: "platano_macho_primera" },
  { id: 728, nombre: "platano_manzano_primera" },
  { id: 727, nombre: "platano_morado_primera" },
  { id: 731, nombre: "platano_pera_primera" },
  { id: 732, nombre: "platano_tabasco_primera" },
  { id: 736, nombre: "platano_veracruz_primera" },
  { id: 775, nombre: "rabano_primera" },
  { id: 783, nombre: "sandia_blanca_primera" },
  { id: 785, nombre: "sandia_charleston_primera" },
  { id: 787, nombre: "sandia_sangria_primera" },
  { id: 791, nombre: "sandia_jubilee_primera" },
  { id: 795, nombre: "sandia_negra_primera" },
  { id: 796, nombre: "sandia_peacock_primera" },
  { id: 799, nombre: "sandia_rayada_primera" },
  { id: 800, nombre: "tamarindo_primera" },
  { id: 804, nombre: "tejocote_primera" },
  { id: 836, nombre: "tomate_bola_primera" },
  { id: 839, nombre: "tomate_saladette_primera" },
  { id: 842, nombre: "tomate_verde_primera" },
  { id: 811, nombre: "toronja_blanca_primera" },
  { id: 824, nombre: "toronja_roja_primera" },
  { id: 823, nombre: "toronja_roja_mediana_primera" },
  { id: 832, nombre: "toronja_rosada_primera" },
  { id: 848, nombre: "tuna_primera" },
  { id: 845, nombre: "tuna_blanca_primera" },
  { id: 851, nombre: "uva_blanca_primera" },
  { id: 854, nombre: "uva_calmeria_primera" },
  { id: 852, nombre: "uva_cardenal_primera" },
  { id: 857, nombre: "uva_flame_primera" },
  { id: 858, nombre: "uva_globo_primera" },
  { id: 861, nombre: "uva_moscatel_primera" },
  { id: 862, nombre: "uva_pasa_primera" },
  { id: 863, nombre: "uva_perlette_primera" },
  { id: 866, nombre: "uva_queen_primera" },
  { id: 869, nombre: "uva_sin_semilla_primera" },
  { id: 871, nombre: "uva_superior_primera" },
  { id: 872, nombre: "uva_thompson_primera" },
  { id: 876, nombre: "yerbabuena_primera" },
  { id: 878, nombre: "zanahoria_lena_primera" },
  { id: 880, nombre: "zanahoria_mediana_primera" },
  { id: 884, nombre: "zanahoria_polvo_primera" },
  { id: 888, nombre: "zapote_primera" },
  { id: 891, nombre: "zarzamora_primera" },
];

/**
 * Scrapea un producto y guarda el resultado en data/<nombre>.json.
 * @param {{ id: number, nombre: string }} producto
 * @param {number} index  posición en la lista (para logs)
 * @param {number} total  total de productos
 */
async function scrapeProducto(producto, index, total) {
  const outputPath = resolve(DATA_DIR, `${producto.nombre}.json`);
  console.log(`[${index + 1}/${total}] Iniciando: ${producto.nombre} (id=${producto.id})`);

  try {
    const scraper = new ScraperSNIIM({
      startDate: START_DATE,
      endDate: END_DATE,
      productId: producto.id,
      limit: LIMIT,
    });

    const results = await scraper.scrape();
    writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(`[${index + 1}/${total}] ✓ ${producto.nombre} — ${results.length} registros`);
  } catch (err) {
    console.error(`[${index + 1}/${total}] ✗ Error en ${producto.nombre}: ${err.message}`);
  }
}

/**
 * Ejecuta tareas con un máximo de `concurrency` promesas simultáneas.
 * @param {Array} items
 * @param {number} concurrency
 * @param {Function} fn  (item, index, total) => Promise
 */
async function runWithConcurrency(items, concurrency, fn) {
  const total = items.length;
  let currentIndex = 0;

  async function worker() {
    while (currentIndex < total) {
      const index = currentIndex++;
      await fn(items[index], index, total);
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);
}

(async () => {
  mkdirSync(DATA_DIR, { recursive: true });

  const total = productos.length;
  console.log(`Scrapeando ${total} productos con concurrencia ${CONCURRENCY}...`);
  console.log(`Rango de fechas: ${START_DATE} → ${END_DATE}\n`);

  const inicio = Date.now();
  await runWithConcurrency(productos, CONCURRENCY, scrapeProducto);
  const segundos = ((Date.now() - inicio) / 1000).toFixed(1);

  console.log(`\nCompletado en ${segundos}s. Archivos guardados en: ${DATA_DIR}`);
})();
