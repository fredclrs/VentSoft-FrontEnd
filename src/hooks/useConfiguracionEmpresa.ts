import { useQuery } from '@tanstack/react-query'
import { getConfiguracionEmpresa } from '../api/configuracionEmpresa'
import { formatearMonto } from '../utils/moneda'

export const CONFIGURACION_EMPRESA_QUERY_KEY = ['configuracionEmpresa']

/**
 * Configuración del negocio (Administración → Datos del negocio): nombre, moneda, si vende/compra
 * a crédito y el cliente/proveedor por defecto para Ventas/Compras. Se usa en la barra superior,
 * en todos los montos/comprobantes/reportes impresos, y en Ventas/Compras para preseleccionar
 * al cliente/proveedor y bloquear el check "Contado" cuando el negocio es solo al contado.
 * Si todavía no cargó o falló, cae en valores neutros (no bloquea nada) para no romper la
 * pantalla mientras se resuelve.
 *
 * `money(n)` ya viene lista para usar en vez de armar un `money()` local por archivo.
 */
export function useConfiguracionEmpresa() {
  const query = useQuery({ queryKey: CONFIGURACION_EMPRESA_QUERY_KEY, queryFn: getConfiguracionEmpresa })
  const nombreNegocio = query.data?.nombre ?? 'VentSoft'
  const simboloMoneda = query.data?.moneda ?? 'Bs.'
  const permiteVentaACredito = query.data?.permiteVentaACredito ?? true
  const permiteCompraACredito = query.data?.permiteCompraACredito ?? true
  const redondearPreciosEnteros = query.data?.redondearPreciosEnteros ?? false
  const permiteCodigoCompartidoEntreArticulos = query.data?.permiteCodigoCompartidoEntreArticulos ?? false
  const clientePorDefecto = query.data?.clientePorDefecto ?? null
  const proveedorPorDefecto = query.data?.proveedorPorDefecto ?? null
  return {
    ...query,
    nombreNegocio,
    simboloMoneda,
    permiteVentaACredito,
    permiteCompraACredito,
    redondearPreciosEnteros,
    permiteCodigoCompartidoEntreArticulos,
    clientePorDefecto,
    proveedorPorDefecto,
    money: (n: number) => formatearMonto(n, simboloMoneda),
  }
}
