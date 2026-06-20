import React, { useState, useRef } from 'react';
import { Upload, AlertCircle, CheckCircle, X } from 'lucide-react';
import { parseCSVSections, validateImportData } from '../../utils/importCSV';
import '../styles/ImportDataView.css';

export default function ImportDataView({
  onImport,
  onCancel,
}) {
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      setErrors(['El archivo debe ser un CSV válido']);
      return;
    }

    setFile(selectedFile);
    setErrors([]);
    setParsedData(null);

    // Parse file
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        const data = parseCSVSections(content);
        const validation = validateImportData(data);

        if (!validation.isValid) {
          setErrors(validation.errors);
          setParsedData(null);
        } else {
          setParsedData(data);
          setErrors([]);
        }
      } catch (err) {
        setErrors([`Error al parsear el archivo: ${err.message}`]);
        setParsedData(null);
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleImport = async () => {
    if (!parsedData) return;

    setLoading(true);
    try {
      await onImport(parsedData);
    } catch (err) {
      setErrors([`Error al importar: ${err.message}`]);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setParsedData(null);
    setErrors([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="import-data-view">
      {!file ? (
        <>
          <div className="import-info-group">
            <p className="import-info-text">
              Sube un archivo CSV exportado de HappyWallet para restaurar tus datos.
            </p>
            <p className="import-info-hint">
              El archivo debe contener el formato correcto con las secciones de gastos, cuentas, etc.
            </p>
          </div>

          <div className="import-upload-area">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <button
              className="import-upload-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={24} strokeWidth={2} />
              <span>Selecciona un archivo CSV</span>
            </button>
          </div>

          <div className="import-note">
            <p>💡 Descarga tu archivo CSV desde la opción "Exportar" antes de importar.</p>
          </div>
        </>
      ) : (
        <>
          <div className="import-file-info">
            <div className="import-file-name">{file.name}</div>
            <button className="import-file-clear" onClick={handleReset}>
              <X size={18} />
            </button>
          </div>

          {errors.length > 0 && (
            <div className="import-errors">
              {errors.map((error, i) => (
                <div key={i} className="import-error-item">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              ))}
            </div>
          )}

          {parsedData && (
            <>
              <div className="import-summary">
                <div className="import-summary-title">Datos a importar:</div>
                {parsedData.expenses.length > 0 && (
                  <div className="import-summary-row">
                    <CheckCircle size={16} />
                    <span>{parsedData.expenses.length} registros de gastos/ingresos</span>
                  </div>
                )}
                {parsedData.accounts.length > 0 && (
                  <div className="import-summary-row">
                    <CheckCircle size={16} />
                    <span>{parsedData.accounts.length} cuentas</span>
                  </div>
                )}
                {parsedData.transfers.length > 0 && (
                  <div className="import-summary-row">
                    <CheckCircle size={16} />
                    <span>{parsedData.transfers.length} transferencias</span>
                  </div>
                )}
                {parsedData.recurring.length > 0 && (
                  <div className="import-summary-row">
                    <CheckCircle size={16} />
                    <span>{parsedData.recurring.length} gastos recurrentes</span>
                  </div>
                )}
                {parsedData.charges.length > 0 && (
                  <div className="import-summary-row">
                    <CheckCircle size={16} />
                    <span>{parsedData.charges.length} cargos de tarjeta</span>
                  </div>
                )}
              </div>

              <div className="import-warning">
                <p>⚠️ Los datos se agregarán a tu cuenta actual. Asegúrate de que el archivo sea válido.</p>
              </div>

              <div className="import-actions">
                <button
                  className="import-cancel-btn"
                  onClick={handleReset}
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  className="import-confirm-btn"
                  onClick={handleImport}
                  disabled={loading || errors.length > 0}
                >
                  {loading ? 'Importando...' : 'Importar Datos'}
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
