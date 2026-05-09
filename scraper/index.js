import { ScraperSNIIM } from "./lib/ScraperSNIIM.js";
import { writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = resolve(__dirname, "../data/platano_tabasco.json");

(async () => {
  const scraper = new ScraperSNIIM({
    startDate: "01/01/2025",
    endDate: "01/01/2026",
    productId: 732, // platano tabasco
    limit: 6000, // 500 records per page → 12 pages → 6000 records
  });

  const results = await scraper.scrape();
  console.log(`Total registros: ${results.length}`);

  mkdirSync(resolve(__dirname, "../data"), { recursive: true });
  writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2));
  console.log(`Archivo JSON guardado en: ${OUTPUT_PATH}`);
})();
