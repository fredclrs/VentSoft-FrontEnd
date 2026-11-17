import { useEffect, useMemo, useState } from 'react'
import TablePagination from '@mui/material/TablePagination'

const OPCIONES_POR_PAGINA = [20, 50, 100]

/**
 * Paginación del lado del cliente para las listas que crecen con el uso (artículos, clientes,
 * stock): la lista completa ya está cargada (el buscador y el escaneo la necesitan entera), así
 * que solo se corta lo que se DIBUJA — dibujar cientos de filas de una es lo que hace lenta la
 * pantalla.
 *
 * clave: lo que define "otra búsqueda" (ej. el texto del buscador + la familia elegida). Al
 * cambiar, vuelve a la página 1. A propósito NO se reinicia cuando solo se recargan los datos
 * (ej. después de editar un artículo): así quien estaba en la página 5 se queda en la 5.
 */
export function usePaginacion<T>(items: T[], clave: string) {
  const [pagina, setPagina] = useState(0)
  const [porPagina, setPorPagina] = useState(OPCIONES_POR_PAGINA[0])

  useEffect(() => {
    setPagina(0)
  }, [clave])

  // Si la lista se achicó (se borró algo, o hay menos resultados) y la página ya no existe,
  // se queda en la última que sí existe en vez de mostrar una página vacía.
  const ultimaPagina = Math.max(0, Math.ceil(items.length / porPagina) - 1)
  const paginaValida = Math.min(pagina, ultimaPagina)

  const visibles = useMemo(
    () => items.slice(paginaValida * porPagina, paginaValida * porPagina + porPagina),
    [items, paginaValida, porPagina],
  )

  const paginador =
    items.length > OPCIONES_POR_PAGINA[0] ? (
      <TablePagination
        component="div"
        count={items.length}
        page={paginaValida}
        rowsPerPage={porPagina}
        rowsPerPageOptions={OPCIONES_POR_PAGINA}
        onPageChange={(_, nueva) => setPagina(nueva)}
        onRowsPerPageChange={(e) => {
          setPorPagina(Number(e.target.value))
          setPagina(0)
        }}
        labelRowsPerPage="Por página:"
        labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
        getItemAriaLabel={(tipo) =>
          tipo === 'next' ? 'Página siguiente' : tipo === 'previous' ? 'Página anterior' : tipo === 'first' ? 'Primera página' : 'Última página'
        }
        showFirstButton
        showLastButton
      />
    ) : null

  return { visibles, paginador }
}
