import { useMemo } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { buscarClientes } from '../api/clientes'
import { getVentasByCliente } from '../api/ventas'
import type { Venta } from '../types/venta'

/**
 * No hay un endpoint de "todas las ventas": se arma juntando el historial de cada
 * cliente (mismo enfoque que ya usa Cuentas por cobrar), sin tocar el backend.
 * Compartido por los reportes que necesitan mirar el total de ventas de todos los
 * clientes (Ventas por temporada, Productos más vendidos, Ventas del día).
 */
export function useTodasLasVentas() {
  const clientesQuery = useQuery({ queryKey: ['clientes-todos'], queryFn: () => buscarClientes() })
  const clientes = clientesQuery.data ?? []

  const ventasQueries = useQueries({
    queries: clientes.map((cliente) => ({
      queryKey: ['ventas', 'byCliente', cliente.id],
      queryFn: () => getVentasByCliente(cliente.id),
      enabled: clientes.length > 0,
    })),
  })

  const ventas = useMemo<Venta[]>(() => ventasQueries.flatMap((q) => q.data ?? []), [ventasQueries])

  return {
    ventas,
    cargando: clientesQuery.isLoading || ventasQueries.some((q) => q.isLoading),
    error: clientesQuery.isError || ventasQueries.some((q) => q.isError),
    errorObj: clientesQuery.error,
    clientes,
  }
}
