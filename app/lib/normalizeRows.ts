import { COLUMN_ALIASES } from "./columnMap";
import { EXCEL_SERVICE_TYPE_TO_DB } from "./serviceTypeMap";

export function normalizeRows(rawRows: any[]) {
  return rawRows.map((row) => {
    const extracted: any = {};

    // -----------------------------
    // 1. Извлекаем нужные колонки
    // -----------------------------
    for (const [key, value] of Object.entries(row)) {
      const mapKey = COLUMN_ALIASES[key.toLowerCase().trim()];
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

      // --- системные поля ---
      _order_id: extracted.order_id,
      service_type_id: dbServiceType, // 👈 ТОЛЬКО ДЛЯ BACKEND
      _parse_error: error
    };
  });
}
