/**
 * utils/currencies.js
 * Lista de monedas soportadas con su símbolo, bandera y país.
 */

export const CURRENCIES = [
  { code: 'MXN', symbol: '$',  name: 'Peso mexicano',       flag: '🇲🇽', countryCode: 'mx', country: 'México'         },
  { code: 'USD', symbol: '$',  name: 'Dólar americano',     flag: '🇺🇸', countryCode: 'us', country: 'Estados Unidos'  },
  { code: 'EUR', symbol: '€',  name: 'Euro',                flag: '🇪🇺', countryCode: 'eu', country: 'Europa'          },
  { code: 'COP', symbol: '$',  name: 'Peso colombiano',     flag: '🇨🇴', countryCode: 'co', country: 'Colombia'        },
  { code: 'ARS', symbol: '$',  name: 'Peso argentino',      flag: '🇦🇷', countryCode: 'ar', country: 'Argentina'       },
  { code: 'CLP', symbol: '$',  name: 'Peso chileno',        flag: '🇨🇱', countryCode: 'cl', country: 'Chile'           },
  { code: 'PEN', symbol: 'S/', name: 'Sol peruano',         flag: '🇵🇪', countryCode: 'pe', country: 'Perú'            },
  { code: 'BRL', symbol: 'R$', name: 'Real brasileño',      flag: '🇧🇷', countryCode: 'br', country: 'Brasil'          },
  { code: 'GTQ', symbol: 'Q',  name: 'Quetzal',             flag: '🇬🇹', countryCode: 'gt', country: 'Guatemala'       },
  { code: 'HNL', symbol: 'L',  name: 'Lempira',             flag: '🇭🇳', countryCode: 'hn', country: 'Honduras'        },
  { code: 'CRC', symbol: '₡',  name: 'Colón costarricense', flag: '🇨🇷', countryCode: 'cr', country: 'Costa Rica'      },
  { code: 'DOP', symbol: '$',  name: 'Peso dominicano',     flag: '🇩🇴', countryCode: 'do', country: 'Rep. Dominicana' },
  { code: 'BOB', symbol: 'Bs', name: 'Boliviano',           flag: '🇧🇴', countryCode: 'bo', country: 'Bolivia'         },
  { code: 'PYG', symbol: '₲',  name: 'Guaraní',             flag: '🇵🇾', countryCode: 'py', country: 'Paraguay'        },
  { code: 'UYU', symbol: '$',  name: 'Peso uruguayo',       flag: '🇺🇾', countryCode: 'uy', country: 'Uruguay'         },
  { code: 'VES', symbol: 'Bs', name: 'Bolívar',             flag: '🇻🇪', countryCode: 've', country: 'Venezuela'       },
  { code: 'GBP', symbol: '£',  name: 'Libra esterlina',     flag: '🇬🇧', countryCode: 'gb', country: 'Reino Unido'     },
  { code: 'CAD', symbol: '$',  name: 'Dólar canadiense',    flag: '🇨🇦', countryCode: 'ca', country: 'Canadá'          },
  { code: 'JPY', symbol: '¥',  name: 'Yen japonés',         flag: '🇯🇵', countryCode: 'jp', country: 'Japón'           },
  { code: 'CNY', symbol: '¥',  name: 'Yuan chino',          flag: '🇨🇳', countryCode: 'cn', country: 'China'           },
];

/** Obtiene un objeto de moneda por código. Fallback a USD. */
export function getCurrencyByCode(code) {
  return CURRENCIES.find(c => c.code === code) ?? CURRENCIES.find(c => c.code === 'USD');
}

/**
 * Mapa completo de código de país ISO 3166-1 alpha-2 → código de moneda.
 * Cubre más de 60 países para la detección automática del locale del dispositivo.
 */
const COUNTRY_CURRENCY_MAP = {
  // América Latina
  mx: 'MXN', pe: 'PEN', co: 'COP', ar: 'ARS', cl: 'CLP',
  br: 'BRL', gt: 'GTQ', hn: 'HNL', cr: 'CRC', do: 'DOP',
  bo: 'BOB', py: 'PYG', uy: 'UYU', ve: 'VES', pa: 'USD',
  ec: 'USD', sv: 'USD', ni: 'NIO', pr: 'USD', cu: 'CUP',
  ht: 'HTG', jm: 'JMD', tt: 'TTD', gy: 'GYD',

  // América del Norte
  us: 'USD', ca: 'CAD', bz: 'BZD',

  // Europa
  es: 'EUR', de: 'EUR', fr: 'EUR', it: 'EUR', pt: 'EUR',
  nl: 'EUR', be: 'EUR', at: 'EUR', ie: 'EUR', fi: 'EUR',
  gr: 'EUR', lu: 'EUR', sk: 'EUR', si: 'EUR', ee: 'EUR',
  lv: 'EUR', lt: 'EUR', mt: 'EUR', cy: 'EUR',
  gb: 'GBP', ch: 'CHF', se: 'SEK', no: 'NOK', dk: 'DKK',
  pl: 'PLN', cz: 'CZK', hu: 'HUF', ro: 'RON', bg: 'BGN',
  hr: 'EUR', ru: 'RUB', ua: 'UAH', rs: 'RSD', tr: 'TRY',
  is: 'ISK',

  // Asia
  jp: 'JPY', cn: 'CNY', kr: 'KRW', in: 'INR', sg: 'SGD',
  hk: 'HKD', tw: 'TWD', th: 'THB', id: 'IDR', my: 'MYR',
  ph: 'PHP', vn: 'VND', pk: 'PKR', bd: 'BDT', lk: 'LKR',
  np: 'NPR', ae: 'AED', sa: 'SAR', il: 'ILS', kw: 'KWD',
  qa: 'QAR', bh: 'BHD', om: 'OMR', kz: 'KZT',

  // Oceanía
  au: 'AUD', nz: 'NZD',

  // África
  za: 'ZAR', ng: 'NGN', ke: 'KES', gh: 'GHS', tz: 'TZS',
  et: 'ETB', eg: 'EGP', ma: 'MAD', dz: 'DZD',
};

/**
 * Detecta la moneda por defecto según el locale del dispositivo.
 * Lee navigator.language (ej. "es-PE", "es-MX") sin pedir permisos.
 * Usa COUNTRY_CURRENCY_MAP para cubrir +60 países.
 * Devuelve el código de moneda correspondiente, o 'USD' como fallback.
 */
export function detectDefaultCurrency() {
  try {
    const locale = navigator.language || navigator.languages?.[0] || '';
    const countryCode = locale.split('-')[1]?.toLowerCase();

    if (!countryCode) return 'USD';

    return COUNTRY_CURRENCY_MAP[countryCode] ?? 'USD';
  } catch {
    return 'USD';
  }
}



/** Formatea un monto con el símbolo narrowSymbol de la moneda via Intl. */
export function formatAmountWithSymbol(amount, currencyCode) {
  if (amount == null || isNaN(Number(amount))) return '0';
  const code = getCurrencyByCode(currencyCode).code;
  try {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: code,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    const cur = getCurrencyByCode(currencyCode);
    const formatted = new Intl.NumberFormat('es-MX', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
    return `${cur.symbol} ${formatted}`;
  }
}

/** Formatea un monto con el símbolo de la moneda (sin código). */
export function formatWithCurrency(amount, currencyCode) {
  return formatAmountWithSymbol(amount, currencyCode);
}
