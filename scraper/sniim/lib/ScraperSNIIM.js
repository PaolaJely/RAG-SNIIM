import { chromium } from "playwright";

export class ScraperSNIIM {
  /**
   * @param {Object} params
   * @param {string} params.startDate - DD/MM/YYYY (ej: "01/01/2025")
   * @param {string} params.endDate   - DD/MM/YYYY (ej: "31/12/2025")
   * @param {number} params.productId - ID del catálogo de productos SNIIM
   * @param {number} params.limit     - Registros totales a obtener (500 por página)
   */
  constructor({ startDate, endDate, productId, limit }) {
    if (!startDate || !endDate || !productId || !limit) {
      throw new Error("startDate, endDate, productId y limit son requeridos.");
    }

    this.startDate = startDate;
    this.endDate = endDate;
    this.productId = productId;
    this.limit = limit;

    this.origenId = -1;
    this.destinoId = -1;
    this.preciosPorId = 1;
  }

  buildUrl() {
    return (
      `https://www.economia-sniim.gob.mx/Nuevo/Consultas/MercadosNacionales/` +
      `PreciosDeMercado/Agricolas/ResultadosConsultaFechaFrutasYHortalizas.aspx` +
      `?fechaInicio=${this.startDate}&fechaFinal=${this.endDate}` +
      `&ProductoId=${this.productId}&OrigenId=${this.origenId}&Origen=Todos` +
      `&DestinoId=${this.destinoId}&Destino=Todos` +
      `&PreciosPorId=${this.preciosPorId}&RegistrosPorPagina=${this.limit}`
    );
  }

  async scrape() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto(this.buildUrl(), { waitUntil: "networkidle" });
    await page.waitForSelector("#tblResultados");

    const data = await page.evaluate(() => {
      const table = document.querySelector("#tblResultados");
      if (!table) return [];

      const rows = Array.from(table.querySelectorAll("tr"));
      if (rows.length === 0) return [];

      const headers = Array.from(rows[0].querySelectorAll("th, td")).map(
        (cell) => cell.innerText.trim()
      );

      return rows.slice(2).map((row) => {
        const cells = Array.from(row.querySelectorAll("td")).map((td) =>
          td.innerText.trim()
        );
        const obj = {};
        headers.forEach((header, i) => {
          obj[header] = cells[i] ?? null;
        });
        return obj;
      });
    });

    await browser.close();
    return data;
  }
}
