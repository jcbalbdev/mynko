/**
 * importCSV.js
 * Utilities for importing CSV data back into HappyWallet
 */

/**
 * Parse CSV content into an array of objects
 */
export function parseCSV(csvContent) {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('El archivo CSV está vacío o no es válido');
  }

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Parse CSV values, handling quoted fields with commas
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        if (inQuotes && line[j + 1] === '"') {
          current += '"';
          j++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    data.push(row);
  }

  return { headers, data };
}

/**
 * Identify which section the data belongs to based on headers
 */
export function identifySection(headers) {
  const headerSet = new Set(headers.map(h => h.toLowerCase()));

  if (headerSet.has('de cuenta') && headerSet.has('a cuenta')) {
    return 'transfers';
  }
  if (headerSet.has('es tarjeta crédito')) {
    return 'accounts';
  }
  if (headerSet.has('tipo') && headerSet.has('frecuencia')) {
    return 'recurring';
  }
  if (headerSet.has('cuotas')) {
    return 'charges';
  }
  if (headerSet.has('categoría')) {
    return 'expenses';
  }

  return null;
}

/**
 * Parse expense row from CSV
 */
export function parseExpenseRow(row) {
  return {
    date: row['Fecha'] ? new Date(row['Fecha']).toISOString() : new Date().toISOString(),
    description: row['Descripción'] || '',
    category: row['Categoría'] || '',
    color: row['Color'] || '#666666',
    type: row['Tipo'] === 'Ingreso' ? 'ingreso'
          : row['Tipo'] === 'Gasto Compartido' ? 'compartido'
          : row['Tipo'] === 'Cambio de Moneda' ? 'cambio'
          : 'personal',
    amount: parseFloat(row['Monto']) || 0,
    currency: row['Moneda'] || 'MXN',
    accountId: row['Cuenta'] || null,
    location: row['Ubicación'] || null,
    sharedWith: row['Persona Compartida'] || null,
    sharedOwes: row['Monto Adeudado'] ? parseFloat(row['Monto Adeudado']) : null,
  };
}

/**
 * Parse account row from CSV
 */
export function parseAccountRow(row) {
  return {
    name: row['Nombre'] || '',
    type: row['Tipo'] === 'Efectivo' ? 'efectivo'
          : row['Tipo'] === 'Banco' ? 'banco'
          : row['Tipo'] === 'Ahorro' ? 'ahorro'
          : 'banco',
    currency: row['Moneda'] || 'MXN',
    balance: parseFloat(row['Saldo']) || 0,
    isCredit: row['Es Tarjeta Crédito'] === 'Sí',
    creditLimit: row['Límite'] ? parseFloat(row['Límite']) : null,
    cutDay: row['Día Corte'] ? parseInt(row['Día Corte']) : null,
    paymentDay: row['Día Pago'] ? parseInt(row['Día Pago']) : null,
  };
}

/**
 * Parse transfer row from CSV
 */
export function parseTransferRow(row) {
  return {
    fromAccountId: row['De Cuenta'] || null,
    toAccountId: row['A Cuenta'] || null,
    amount: parseFloat(row['Monto']) || 0,
    currency: row['Moneda'] || 'MXN',
    note: row['Nota'] || '',
    date: row['Fecha'] ? new Date(row['Fecha']).toISOString() : new Date().toISOString(),
  };
}

/**
 * Parse recurring expense row from CSV
 */
export function parseRecurringRow(row) {
  return {
    description: row['Descripción'] || '',
    entryType: row['Tipo'] === 'Suscripción' ? 'subscription' : 'recurring',
    amount: parseFloat(row['Monto']) || 0,
    currency: row['Moneda'] || 'MXN',
    category: row['Categoría'] || '',
    color: row['Color'] || '#666666',
    frequency: row['Frecuencia'] === 'Semanal' ? 'weekly'
               : row['Frecuencia'] === 'Mensual' ? 'monthly'
               : row['Frecuencia'] === 'Anual' ? 'yearly'
               : 'monthly',
    accountId: row['Cuenta'] || null,
    isActive: row['Activo'] !== 'No',
    nextDueDate: row['Próximo Vencimiento'] ? new Date(row['Próximo Vencimiento']).toISOString() : null,
  };
}

/**
 * Parse charge row from CSV
 */
export function parseChargeRow(row) {
  return {
    description: row['Descripción'] || '',
    amount: parseFloat(row['Monto']) || 0,
    currency: row['Moneda'] || 'MXN',
    installments: parseInt(row['Cuotas']) || 1,
    installmentAmount: parseFloat(row['Monto por Cuota']) || parseFloat(row['Monto']) || 0,
    accountId: row['Tarjeta'] || null,
    date: row['Fecha'] ? new Date(row['Fecha']).toISOString() : new Date().toISOString(),
  };
}

/**
 * Parse CSV file and return structured data by section
 */
export function parseCSVSections(csvContent) {
  const sections = csvContent.split(/^=== .+ ===$/m).filter(s => s.trim());
  const result = {
    expenses: [],
    accounts: [],
    transfers: [],
    recurring: [],
    charges: [],
  };

  for (const section of sections) {
    const lines = section.trim().split('\n').filter(l => l.trim());
    if (lines.length < 2) continue;

    try {
      const { headers, data } = parseCSV(section);
      const sectionType = identifySection(headers);

      if (sectionType === 'expenses') {
        result.expenses = data.map(parseExpenseRow);
      } else if (sectionType === 'accounts') {
        result.accounts = data.map(parseAccountRow);
      } else if (sectionType === 'transfers') {
        result.transfers = data.map(parseTransferRow);
      } else if (sectionType === 'recurring') {
        result.recurring = data.map(parseRecurringRow);
      } else if (sectionType === 'charges') {
        result.charges = data.map(parseChargeRow);
      }
    } catch (err) {
      console.error('[parseCSVSections] Error parsing section:', err.message);
    }
  }

  return result;
}

/**
 * Validate parsed data
 */
export function validateImportData(data) {
  const errors = [];

  if (data.expenses.length === 0 && data.accounts.length === 0 &&
      data.transfers.length === 0 && data.recurring.length === 0 &&
      data.charges.length === 0) {
    errors.push('No se encontraron datos válidos para importar');
  }

  for (let i = 0; i < data.expenses.length; i++) {
    const exp = data.expenses[i];
    if (!exp.description) errors.push(`Gasto ${i + 1}: Descripción requerida`);
    if (!exp.amount || exp.amount <= 0) errors.push(`Gasto ${i + 1}: Monto debe ser mayor a 0`);
  }

  for (let i = 0; i < data.accounts.length; i++) {
    const acc = data.accounts[i];
    if (!acc.name) errors.push(`Cuenta ${i + 1}: Nombre requerido`);
  }

  for (let i = 0; i < data.transfers.length; i++) {
    const tf = data.transfers[i];
    if (!tf.fromAccountId || !tf.toAccountId) errors.push(`Transferencia ${i + 1}: Cuentas origen y destino requeridas`);
    if (!tf.amount || tf.amount <= 0) errors.push(`Transferencia ${i + 1}: Monto debe ser mayor a 0`);
  }

  return { isValid: errors.length === 0, errors };
}
