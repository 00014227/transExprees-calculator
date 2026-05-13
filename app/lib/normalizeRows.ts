import { COLUMN_ALIASES } from "./columnMap";
import { EXCEL_SERVICE_TYPE_TO_DB } from "./serviceTypeMap";

export function normalizeRows(rawRows: any[]) {
  return rawRows.map((row, idx) => {
    const extracted: any = {};

    // -----------------------------
    // 1. Извлекаем нужные колонки
    // -----------------------------
    for (const [key, value] of Object.entries(row)) {
      const mapKey = COLUMN_ALIASES[key.toLowerCase().replace(/\s+/g, " ").trim()];
      if (!mapKey) continue;

      if (mapKey === "weight") {
        if (!extracted.weight && value !== null && value !== "") {
          extracted.weight = Number(String(value).replace(",", "."));
        }
      } else {
        extracted[mapKey] = String(value).trim();
      }
    }

    // -----------------------------
    // 2. Валидация
    // -----------------------------
    let error: string | null = null;

    if (!extracted.order_id) {
      error = "Не указан номер заказа";
    } else if (!extracted.from_city) {
      error = "Не указан город отправителя";
    } else if (!extracted.to_city) {
      error = "Не указан город получателя";
    } else if (!extracted.service_type_id) {
      error = "Не указан тип услуги";
    } else if (!extracted.weight || isNaN(extracted.weight)) {
      error = "Некорректный платный вес";
    }

    // -----------------------------
    // 3. Тип услуги (Excel → DB)
    // -----------------------------
    const excelServiceType = Number(extracted.service_type_id);
    const dbServiceType =
      EXCEL_SERVICE_TYPE_TO_DB[excelServiceType];

    if (!dbServiceType && !error) {
      error = "Некорректный тип услуги";
    }

    // -----------------------------
    // 4. Результат
    // -----------------------------
    return {
      ...row, // ВСЕ оригинальные колонки (для Excel export)

      // --- данные для UI ---
      excel_service_type: excelServiceType,

      // --- нормализованные данные ---
      order_id: extracted.order_id,
      from_city: extracted.from_city,
      to_city: extracted.to_city,
      weight: Number(extracted.weight || 0),
      box_count: extracted.box_count,
      // --- системные поля ---
      _row_idx: idx,
      _order_id: extracted.order_id,
      _client_name: extracted.client_name?.trim() || null,
      _recipient_name: extracted.recipient_name?.trim() || null,
      service_type_id: dbServiceType,
      _parse_error: error
    };
  });
}
