import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import TableCell from '@mui/material/TableCell'
import type { TableCellProps } from '@mui/material/TableCell'
import TableSortLabel from '@mui/material/TableSortLabel'

type Valor = string | number | null | undefined

/** Compara como lo haría una persona: sin distinguir mayúsculas ni tildes ("Ázucar" junto a
 * "azúcar") y con los números dentro del texto en orden numérico ("Fideos 2" antes que
 * "Fideos 10"). Los vacíos van siempre al final, sea cual sea el sentido. */
const comparadorTexto = new Intl.Collator('es', { sensitivity: 'base', numeric: true })

function comparar(a: Valor, b: Valor): number {
  const aVacio = a == null || a === ''
  const bVacio = b == null || b === ''
  if (aVacio || bVacio) return aVacio === bVacio ? 0 : aVacio ? 1 : -1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return comparadorTexto.compare(String(a), String(b))
}

/**
 * Orden de una tabla al tocar el título de una columna (▲/▼). columnas: por cada clave, cómo
 * sacar el valor por el que se ordena. Tocar la columna ya activa invierte el sentido. Ordena
 * la lista entera (antes de paginar), así "página 1" es de verdad lo primero.
 */
export function useOrden<T, K extends string>(
  items: T[],
  columnas: Record<K, (item: T) => Valor>,
  // NoInfer: las claves válidas salen de "columnas", no de la que se elige de entrada.
  inicial: { clave: NoInfer<K>; sentido: 'asc' | 'desc' },
) {
  const [orden, setOrden] = useState(inicial)

  const ordenados = useMemo(() => {
    const obtener = columnas[orden.clave]
    const signo = orden.sentido === 'asc' ? 1 : -1
    return [...items].sort((x, y) => {
      const a = obtener(x)
      const b = obtener(y)
      const vacio = (v: Valor) => v == null || v === ''
      // Los vacíos al final también en "desc" (no se invierten).
      if (vacio(a) || vacio(b)) return comparar(a, b)
      return signo * comparar(a, b)
    })
    // columnas es un objeto literal nuevo en cada render; lo que importa es la clave elegida.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, orden])

  /** Celda de encabezado clickeable. Los números arrancan de mayor a menor al tocarlos por
   * primera vez si se pide (ej. precio o stock: lo más interesante suele ser lo más alto). */
  function encabezado(clave: K, etiqueta: ReactNode, props?: TableCellProps & { primeroDesc?: boolean }) {
    const { primeroDesc, ...celda } = props ?? {}
    const activa = orden.clave === clave
    return (
      <TableCell {...celda} sortDirection={activa ? orden.sentido : false}>
        <TableSortLabel
          active={activa}
          direction={activa ? orden.sentido : primeroDesc ? 'desc' : 'asc'}
          onClick={() =>
            setOrden((prev) =>
              prev.clave === clave
                ? { clave, sentido: prev.sentido === 'asc' ? 'desc' : 'asc' }
                : { clave, sentido: primeroDesc ? 'desc' : 'asc' },
            )
          }
        >
          {etiqueta}
        </TableSortLabel>
      </TableCell>
    )
  }

  return { ordenados, encabezado, ordenClave: `${orden.clave}|${orden.sentido}` }
}
