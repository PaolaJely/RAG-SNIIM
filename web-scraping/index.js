import { ScraperSNIIM } from "./lib/ScraperSNIIM.js";
import { writeFileSync } from "fs";



(async () => {
  const scraper = new ScraperSNIIM({
    startDate: "01/01/2025",
    endDate: "01/01/2026",
    productId: 732, // platano tabasco
    limit: 6000, // 500 records per page, so this will fetch 12 pages then 500*12 = 6000
  });

  const results = await scraper.scrape();
  console.log(`Total registros ${results.length}`);

  writeFileSync('platano_tabasco.json', JSON.stringify(results, null, 2));
  console.log("Archivo JSON creado con éxito");
})();
