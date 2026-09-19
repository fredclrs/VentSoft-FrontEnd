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
  /** Si es true, el precio de venta calculado por margen de ganancia se redondea al
   * entero de arriba (nunca pierde margen) en vez de a 2 decimales. */
  redondearPreciosEnteros: boolean
  /** Si es true, varios Artículos pueden compartir el mismo Código de barras — para cuando el
   * proveedor imprime un solo código por línea de producto en vez de uno por variante (ej.
   * tallas/colores de una prenda, tintes de una pintura). Por defecto false — el Código sigue
   * siendo único, como conviene a la mayoría de los rubros. */
  permiteCodigoCompartidoEntreArticulos: boolean
  idClientePorDefecto?: number | null
  idProveedorPorDefecto?: number | null
  /** Datos completos del cliente/proveedor por defecto, listos para preseleccionar en
   * Ventas/Compras sin una consulta extra. Null si no hay uno configurado. */
  clientePorDefecto?: Cliente | null
  proveedorPorDefecto?: Proveedor | null
}
