const { DateTime } = require('luxon');

class ColombiaHolidays {
  static isHoliday(date) {
    const holidays = this.getHolidaysForYear(date.year);
    return holidays.some(h => h.hasSame(date, 'day'));
  }

  static getHolidaysForYear(year) {
    const list = [];
    // 1. Fijos
    list.push(DateTime.fromObject({ year, month: 1, day: 1 }));
    list.push(DateTime.fromObject({ year, month: 5, day: 1 }));
    list.push(DateTime.fromObject({ year, month: 7, day: 20 }));
    list.push(DateTime.fromObject({ year, month: 8, day: 7 }));
    list.push(DateTime.fromObject({ year, month: 12, day: 8 }));
    list.push(DateTime.fromObject({ year, month: 12, day: 25 }));

    // 2. Ley Emiliani (Mover a lunes)
    list.push(this.moveToMonday(DateTime.fromObject({ year, month: 1, day: 6 })));
    list.push(this.moveToMonday(DateTime.fromObject({ year, month: 3, day: 19 })));
    list.push(this.moveToMonday(DateTime.fromObject({ year, month: 6, day: 29 })));
    list.push(this.moveToMonday(DateTime.fromObject({ year, month: 8, day: 15 })));
    list.push(this.moveToMonday(DateTime.fromObject({ year, month: 10, day: 12 })));
    list.push(this.moveToMonday(DateTime.fromObject({ year, month: 11, day: 1 })));
    list.push(this.moveToMonday(DateTime.fromObject({ year, month: 11, day: 11 })));

    // 3. Pascua
    const easter = this.calculateEaster(year);
    list.push(easter.minus({ days: 3 })); // Jueves Santo
    list.push(easter.minus({ days: 2 })); // Viernes Santo
    list.push(this.moveToMonday(easter.plus({ days: 43 }))); // Ascensión
    list.push(this.moveToMonday(easter.plus({ days: 64 }))); // Corpus Christi
    list.push(this.moveToMonday(easter.plus({ days: 71 }))); // Sagrado Corazón

    return list;
  }

  static moveToMonday(date) {
    if (date.weekday === 1) return date;
    return date.plus({ days: 8 - date.weekday });
  }

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
    return DateTime.fromObject({ year, month, day });
  }
}

module.exports = ColombiaHolidays;
