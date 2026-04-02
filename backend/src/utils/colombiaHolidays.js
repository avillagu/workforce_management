const { DateTime } = require('luxon');

/**
 * Calculador de festivos para Colombia (Ley Emiliani)
 * Implementación Anti-Cachos (UTC-safe)
 */
class ColombiaHolidays {
  /**
   * Verifica si una fecha es festiva en Colombia
   * @param {DateTime} date Luxon DateTime object
   */
  static isHoliday(date) {
    if (!date || !date.isValid) return false;
    const holidays = this.getHolidaysForYear(date.year);
    // Comparar usando el mismo zone (UTC preferiblemente)
    return holidays.some(h => h.month === date.month && h.day === date.day);
  }

  /**
   * Genera lista de festivos para un año específico
   */
  static getHolidaysForYear(year) {
    const list = [];
    const opts = { zone: 'utc' };

    // 1. Fijos (No se mueven por Ley Emiliani)
    list.push(DateTime.fromObject({ year, month: 1, day: 1 }, opts));
    list.push(DateTime.fromObject({ year, month: 5, day: 1 }, opts));
    list.push(DateTime.fromObject({ year, month: 7, day: 20 }, opts));
    list.push(DateTime.fromObject({ year, month: 8, day: 7 }, opts));
    list.push(DateTime.fromObject({ year, month: 12, day: 8 }, opts));
    list.push(DateTime.fromObject({ year, month: 12, day: 25 }, opts));

    // 2. Ley Emiliani (Se mueven al siguiente lunes si no caen lunes)
    list.push(this.moveToMonday(DateTime.fromObject({ year, month: 1, day: 6 }, opts))); // Reyes
    list.push(this.moveToMonday(DateTime.fromObject({ year, month: 3, day: 19 }, opts))); // San José
    list.push(this.moveToMonday(DateTime.fromObject({ year, month: 6, day: 29 }, opts))); // San Pedro
    list.push(this.moveToMonday(DateTime.fromObject({ year, month: 8, day: 15 }, opts))); // Asunción
    list.push(this.moveToMonday(DateTime.fromObject({ year, month: 10, day: 12 }, opts))); // Raza
    list.push(this.moveToMonday(DateTime.fromObject({ year, month: 11, day: 1 }, opts))); // Todos los Santos
    list.push(this.moveToMonday(DateTime.fromObject({ year, month: 11, day: 11 }, opts))); // Ind. Cartagena

    // 3. Basados en Pascua (Semana Santa y móviles)
    const easter = this.calculateEaster(year);
    list.push(easter.minus({ days: 3 })); // Jueves Santo
    list.push(easter.minus({ days: 2 })); // Viernes Santo
    list.push(this.moveToMonday(easter.plus({ days: 43 }))); // Ascensión
    list.push(this.moveToMonday(easter.plus({ days: 64 }))); // Corpus Christi
    list.push(this.moveToMonday(easter.plus({ days: 71 }))); // Sagrado Corazón

    return list;
  }

  /**
   * Mueve la fecha al siguiente lunes si no es lunes.
   */
  static moveToMonday(date) {
    if (date.weekday === 1) return date;
    return date.plus({ days: 8 - date.weekday });
  }

  /**
   * Algoritmo de Butcher-Meeus para cálculo de Pascua
   */
  static calculateEaster(year) {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return DateTime.fromObject({ year, month, day }, { zone: 'utc' });
  }
}

module.exports = ColombiaHolidays;
