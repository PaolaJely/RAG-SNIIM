import "dotenv/config";
import { writeFile } from "fs/promises";
import { Stagehand } from "@browserbasehq/stagehand";
import { z } from "zod";

async function main() {
  const stagehand = new Stagehand({
    env: "BROWSERBASE"
  });

  await stagehand.init();

  const page = stagehand.context.pages()[0];
  const results = [];

  await page.goto("https://www.lagranbodega.com.mx/platano-tabasco-/p");
  let extractResult = await stagehand.extract(
    "extract product details",
    z.object({
      productName: z.string(),
      price: z.string()
    })
  );
  extractResult.marketplace = "La Gran Bodega";
  delete extractResult.cacheStatus;
  results.push(extractResult);

  await page.goto("https://convy.mx/products/platano-tabasco-1-kg");
  extractResult = await stagehand.extract(
    "extract product details",
    z.object({
      productName: z.string(),
      price: z.string()
    })
  );
  extractResult.marketplace = "Convy";
  delete extractResult.cacheStatus;
  results.push(extractResult);

  await page.goto("https://hiperabasto.mx/products/platano-tabasco-amarillo?variant=49912355619129&country=MX&currency=MXN");
  extractResult = await stagehand.extract(
    "extract product details",
    z.object({
      productName: z.string(),
      price: z.string()
    })
  );
  extractResult.marketplace = "Hiperabasto";
  delete extractResult.cacheStatus;
  results.push(extractResult);

  // Guardar resultados en un archivo JSON
  await writeFile(
    "../data/results.json",
    JSON.stringify(results, null, 2),
    "utf-8"
  );

  await stagehand.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});