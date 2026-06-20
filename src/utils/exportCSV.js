/**
 * exportCSV.js
 * Utilities for exporting HappyWallet data to CSV format
 */

/**
 * Escape CSV values to handle commas, quotes, and newlines
 */
function escapeCSVValue(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Convert array of objects to CSV string
 */
function arrayToCSV(data, headers) {
  if (!data || data.length === 0) return '';

  const rows = [headers.join(',')];
  data.forEach(row => {
    const values = headers.map(header => escapeCSVValue(row[header]));
    rows.push(values.join(','));
  });
  return rows.join('\n');
}

/**
 * Export all user data to CSV
 * Returns a combined CSV with multiple sections
 */
export function exportAllDataToCSV(expenses, accounts, transfers, recurringExpenses, charges) {
  const sections = [];

  // Format current date for filename
  const now = new Date();
  const filename = `HappyWallet_Datos_${now.toISOString().split('T')[0]}.csv`;

  // ════════════════════════════════════
  // 1. GASTOS E INGRESOS
  // ════════════════════════════════════
  if (expenses && expenses.length > 0) {
    const expenseHeaders = [
      'ID',
      'Fecha',
      'Descripción',
      'Categoría',
      'Tipo',
      'Monto',
      'Moneda',
      'Cuenta',
      'Ubicación',
      'Compartido',
      'Persona Compartida',
      'Monto Adeudado',
    ];

    const expenseData = expenses.map(exp => ({
      'ID': exp.id,
      'Fecha': exp.date ? new Date(exp.date).toLocaleDateString('es-MX') : '',
      'Descripción': exp.description,
      'Categoría': exp.category,
      'Tipo': exp.type === 'personal' ? 'Gasto Personal'
              : exp.type === 'compartido' ? 'Gasto Compartido'
              : exp.type === 'ingreso' ? 'Ingreso'
              : exp.type === 'cambio' ? 'Cambio de Moneda'
              : exp.type,
      'Monto': exp.amount,
      'Moneda': exp.currency,
      'Cuenta': exp.accountId || '',
      'Ubicación': exp.location || '',
      'Compartido': exp.sharedWith ? 'Sí' : 'No',
      'Persona Compartida': exp.sharedWith || '',
      'Monto Adeudado': exp.sharedOwes || '',
    }));

    const expenseCSV = arrayToCSV(expenseData, expenseHeaders);
    sections.push('=== GASTOS E INGRESOS ===');
    sections.push(expenseCSV);
    sections.push('');
  }

  // ════════════════════════════════════
  // 2. CUENTAS Y SALDOS
  // ════════════════════════════════════
  if (accounts && accounts.length > 0) {
    const accountHeaders = [
      'ID',
      'Nombre',
      'Tipo',
      'Moneda',
      'Saldo',
      'Es Tarjeta Crédito',
      'Límite',
      'Día Corte',
      'Día Pago',
    ];

    const accountData = accounts.map(acc => ({
      'ID': acc.id,
      'Nombre': acc.name,
      'Tipo': acc.type === 'efectivo' ? 'Efectivo'
              : acc.type === 'banco' ? 'Banco'
              : acc.type === 'ahorro' ? 'Ahorro'
              : acc.type,
      'Moneda': acc.currency,
      'Saldo': acc.balance,
      'Es Tarjeta Crédito': acc.isCredit ? 'Sí' : 'No',
      'Límite': acc.creditLimit || '',
      'Día Corte': acc.cutDay || '',
      'Día Pago': acc.paymentDay || '',
    }));

    const accountCSV = arrayToCSV(accountData, accountHeaders);
    sections.push('=== CUENTAS ===');
    sections.push(accountCSV);
    sections.push('');
  }

  // ════════════════════════════════════
  // 3. TRANSFERENCIAS
  // ════════════════════════════════════
  if (transfers && transfers.length > 0) {
    const transferHeaders = [
      'ID',
      'Fecha',
      'De Cuenta',
      'A Cuenta',
      'Monto',
      'Moneda',
      'Nota',
    ];

    const transferData = transfers.map(transfer => ({
      'ID': transfer.id,
      'Fecha': transfer.date ? new Date(transfer.date).toLocaleDateString('es-MX') : '',
      'De Cuenta': transfer.fromAccountId,
      'A Cuenta': transfer.toAccountId,
      'Monto': transfer.amount,
      'Moneda': transfer.currency,
      'Nota': transfer.note || '',
    }));

    const transferCSV = arrayToCSV(transferData, transferHeaders);
    sections.push('=== TRANSFERENCIAS ===');
    sections.push(transferCSV);
    sections.push('');
  }

  // ════════════════════════════════════
  // 4. GASTOS RECURRENTES
  // ════════════════════════════════════
  if (recurringExpenses && recurringExpenses.length > 0) {
    const recurringHeaders = [
      'ID',
      'Descripción',
      'Tipo',
      'Monto',
      'Moneda',
      'Categoría',
      'Frecuencia',
      'Próximo Vencimiento',
      'Activo',
      'Cuenta',
    ];

    const recurringData = recurringExpenses.map(rec => ({
      'ID': rec.id,
      'Descripción': rec.description,
      'Tipo': rec.entryType === 'recurring' ? 'Recurrente' : 'Suscripción',
      'Monto': rec.amount,
      'Moneda': rec.currency,
      'Categoría': rec.category,
      'Frecuencia': rec.frequency === 'weekly' ? 'Semanal'
                   : rec.frequency === 'monthly' ? 'Mensual'
                   : rec.frequency === 'yearly' ? 'Anual'
                   : rec.frequency,
      'Próximo Vencimiento': rec.nextDueDate ? new Date(rec.nextDueDate).toLocaleDateString('es-MX') : '',
      'Activo': rec.isActive ? 'Sí' : 'No',
      'Cuenta': rec.accountId || '',
    }));

    const recurringCSV = arrayToCSV(recurringData, recurringHeaders);
    sections.push('=== GASTOS RECURRENTES ===');
    sections.push(recurringCSV);
    sections.push('');
  }

  // ════════════════════════════════════
  // 5. CARGOS DE TARJETA DE CRÉDITO
  // ════════════════════════════════════
  if (charges && charges.length > 0) {
    const chargeHeaders = [
      'ID',
      'Fecha',
      'Descripción',
      'Monto',
      'Moneda',
      'Cuotas',
      'Monto por Cuota',
      'Tarjeta',
    ];

    const chargeData = charges.map(charge => ({
      'ID': charge.id,
      'Fecha': charge.date ? new Date(charge.date).toLocaleDateString('es-MX') : '',
      'Descripción': charge.description,
      'Monto': charge.amount,
      'Moneda': charge.currency,
      'Cuotas': charge.installments || '1',
      'Monto por Cuota': charge.installmentAmount || charge.amount,
      'Tarjeta': charge.accountId || '',
    }));

    const chargeCSV = arrayToCSV(chargeData, chargeHeaders);
    sections.push('=== CARGOS DE TARJETA ===');
    sections.push(chargeCSV);
    sections.push('');
  }

  const csvContent = sections.join('\n');
  return { csv: csvContent, filename };
}

/**
 * Trigger CSV download in browser
 */
export function downloadCSV(csv, filename) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export and download all data
 */
export function exportAndDownloadAllData(expenses, accounts, transfers, recurringExpenses, charges) {
  const { csv, filename } = exportAllDataToCSV(expenses, accounts, transfers, recurringExpenses, charges);
  downloadCSV(csv, filename);
}
