import type { Cliente } from './cliente'
import type { Proveedor } from './proveedor'

export interface ConfiguracionEmpresa {
  id: number
  nombre: string
  /** Símbolo de moneda usado en todo el sistema (Bs., $, U$S, etc.). */
  moneda: string
  /** Si es false, el negocio solo vende al contado: no se puede vender a crédito. */
  permiteVentaACredito: boolean
  /** Si es false, el negocio solo compra al contado: no se puede comprar a crédito. */
  permiteCompraACredito: boolean
  idClientePorDefecto?: number | null
  idProveedorPorDefecto?: number | null
  /** Datos completos del cliente/proveedor por defecto, listos para preseleccionar en
   * Ventas/Compras sin una consulta extra. Null si no hay uno configurado. */
  clientePorDefecto?: Cliente | null
  proveedorPorDefecto?: Proveedor | null
}
