/**
 * Formatea un monto con el símbolo de moneda configurado (Administración → Datos del
 * negocio). El formato numérico (separadores) queda fijo; lo único configurable es el
 * símbolo, que es lo que pidió poder cambiar (Bs., $, U$S, etc.).
 */
export function formatearMonto(n: number, simboloMoneda: string): string {
  const monto = n.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return simboloMoneda ? `${simboloMoneda} ${monto}` : monto
}
