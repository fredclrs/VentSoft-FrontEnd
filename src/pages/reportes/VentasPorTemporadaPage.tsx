import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link as RouterLink } from 'react-router-dom'
import Accordion from '@mui/material/Accordion'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionSummary from '@mui/material/AccordionSummary'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import ExpandMoreIcon from '@mui/icons-material/ExpandMoreOutlined'
import PrintIcon from '@mui/icons-material/PrintOutlined'
import { articulosApi } from '../../api/articulos'
import { temporadasApi } from '../../api/temporadas'
import { getErrorMessage } from '../../api/errors'
import { useTodasLasVentas } from '../../hooks/useTodasLasVentas'
import { useConfiguracionEmpresa } from '../../hooks/useConfiguracionEmpresa'
import { SIN_TEMPORADA, temporadaDeFecha } from '../../utils/temporada'
import { filtrosAnioActual } from '../../utils/filtrarHistorial'
import { imprimirExtracto } from '../../utils/imprimirListado'

interface FilaArticulo {
  codigo: string
  descripcion: string
  cantidad: number
  total: number
}

interface GrupoTemporada {
  temporada: string
  cantidad: number
  total: number
  articulos: FilaArticulo[]
}

export function VentasPorTemporadaPage() {
  const { nombreNegocio, money } = useConfiguracionEmpresa()
  const anioActual = useMemo(() => filtrosAnioActual(), [])
  const [fechaDesde, setFechaDesde] = useState(anioActual.fechaDesde)
  const [fechaHasta, setFechaHasta] = useState(anioActual.fechaHasta)

  const temporadasQuery = useQuery({ queryKey: ['temporadas'], queryFn: () => temporadasApi.search() })
  const temporadas = useMemo(() => temporadasQuery.data ?? [], [temporadasQuery.data])

  const { ventas: todasLasVentas, cargando: cargandoVentas, error: errorVentas } = useTodasLasVentas()

  // Solo para mostrar descripción/código en el detalle (los renglones traen idArticulo).
  const articulosQuery = useQuery({ queryKey: ['articulos'], queryFn: () => articulosApi.search() })
  const articuloPorId = useMemo(
    () => new Map((articulosQuery.data ?? []).map((a) => [a.id, a])),
    [articulosQuery.data],
  )

  const cargando = temporadasQuery.isLoading || articulosQuery.isLoading || cargandoVentas
  const hayError = temporadasQuery.isError || articulosQuery.isError || errorVentas

  const grupos = useMemo<GrupoTemporada[]>(() => {
    if (cargando || hayError) return []

    const desde = fechaDesde ? new Date(fechaDesde) : null
    const hasta = fechaHasta ? new Date(`${fechaHasta}T23:59:59.999`) : null

    const porTemporada = new Map<string, Map<number, FilaArticulo>>()

    for (const venta of todasLasVentas) {
      const fecha = new Date(venta.fecha)
      if (desde && fecha < desde) continue
      if (hasta && fecha > hasta) continue

      // La temporada se determina sola por la fecha de la venta, según los rangos
      // configurados en Administración > Temporadas — no depende de nada cargado
      // a mano en la venta ni en el artículo.
      const temporada = temporadaDeFecha(venta.fecha, temporadas)

      for (const d of venta.detalles) {
        const articulo = articuloPorId.get(d.idArticulo)

        if (!porTemporada.has(temporada)) porTemporada.set(temporada, new Map())
        const articulos = porTemporada.get(temporada)!

        const previo = articulos.get(d.idArticulo)
        if (previo) {
          previo.cantidad += d.cantidad
          previo.total += d.subTotal
        } else {
          articulos.set(d.idArticulo, {
            codigo: articulo?.codigo ?? `#${d.idArticulo}`,
            descripcion: articulo?.descripcion ?? '',
            cantidad: d.cantidad,
            total: d.subTotal,
          })
        }
      }
    }

    return Array.from(porTemporada.entries())
      .map(([temporada, articulos]) => {
        const listaArticulos = Array.from(articulos.values()).sort((a, b) => b.total - a.total)
        return {
          temporada,
          cantidad: listaArticulos.reduce((acc, a) => acc + a.cantidad, 0),
          total: listaArticulos.reduce((acc, a) => acc + a.total, 0),
          articulos: listaArticulos,
        }
      })
      .sort((a, b) => b.total - a.total)
  }, [cargando, hayError, todasLasVentas, articuloPorId, temporadas, fechaDesde, fechaHasta])

  const totalGeneral = useMemo(() => grupos.reduce((acc, g) => acc + g.total, 0), [grupos])
  const hayVentasSinTemporada = grupos.some((g) => g.temporada === SIN_TEMPORADA)

  function imprimirListadoTemporadas() {
    const rangoFechas =
      fechaDesde || fechaHasta ? ` · Del ${fechaDesde || '…'} al ${fechaHasta || '…'}` : ''

    imprimirExtracto({
      nombreNegocio,
      titulo: 'Ventas por temporada',
      subtitulo: `Agrupado automáticamente según la fecha de cada venta${rangoFechas}`,
      columnas: [
        { label: 'Artículo' },
        { label: 'Descripción' },
        { label: 'Cant.', align: 'right' },
        { label: 'Total', align: 'right' },
      ],
      grupos: grupos.map((g) => ({
        encabezado: g.temporada,
        subencabezado: `Cant. vendida: ${g.cantidad}`,
        filas: g.articulos.map((a) => [a.codigo, a.descripcion, a.cantidad, money(a.total)]),
        totales: [{ label: 'Total temporada', valor: `${money(g.total)}` }],
      })),
      totalesGenerales: [{ label: 'Total general', valor: `${money(totalGeneral)}` }],
    })
  }

  return (
    <Stack spacing={3}>
      <div>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Ventas por temporada
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Lo vendido, agrupado automáticamente según la fecha de cada venta y los rangos de mes que
          definas en Administración → Temporadas/campañas (ej: Verano, Invierno, Campaña siembra).
        </Typography>
      </div>

      {!temporadasQuery.isLoading && temporadas.length === 0 && (
        <Alert severity="info">
          Todavía no configuraste ninguna temporada, así que todo cae en "{SIN_TEMPORADA}". Este reporte es
          opcional — si tu negocio no maneja campañas o colecciones estacionales, podés ignorarlo. Si te
          sirve, configuralas en{' '}
          <Typography component={RouterLink} to="/temporadas" sx={{ fontWeight: 700 }}>
            Administración → Temporadas/campañas
          </Typography>
          .
        </Alert>
      )}

      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(160px, 220px))' }, gap: 2 }}>
          <TextField
            label="Desde"
            type="date"
            size="small"
            fullWidth
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label="Hasta"
            type="date"
            size="small"
            fullWidth
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </Box>
        <Button
          startIcon={<PrintIcon />}
          variant="outlined"
          disabled={grupos.length === 0}
          onClick={imprimirListadoTemporadas}
        >
          Imprimir listado
        </Button>
      </Stack>

      {cargando && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <CircularProgress size={28} />
        </Paper>
      )}

      {hayError && (
        <Alert severity="error">{getErrorMessage(temporadasQuery.error ?? articulosQuery.error)}</Alert>
      )}

      {!cargando && !hayError && grupos.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">No hay ventas registradas en el rango seleccionado.</Typography>
        </Paper>
      )}

      {!cargando && !hayError && hayVentasSinTemporada && temporadas.length > 0 && (
        <Alert severity="info">
          Hay ventas cuya fecha no cae dentro de ninguna temporada configurada — aparecen agrupadas en "
          {SIN_TEMPORADA}".
        </Alert>
      )}

      {grupos.map((grupo) => (
        <Accordion key={grupo.temporada} variant="outlined" disableGutters>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Stack
              direction="row"
              spacing={{ xs: 1.5, sm: 3 }}
              sx={{ flexWrap: 'wrap', alignItems: 'center', width: '100%', rowGap: 0.5, pr: 1 }}
            >
              <Typography sx={{ fontWeight: 700, minWidth: 140, flexGrow: 1 }}>{grupo.temporada}</Typography>
              <Typography variant="body2" sx={{ minWidth: 130 }}>
                Cant. vendida: {grupo.cantidad}
              </Typography>
              <Typography sx={{ fontWeight: 700, minWidth: 120 }}>Bs. {money(grupo.total)}</Typography>
            </Stack>
          </AccordionSummary>
          <AccordionDetails>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Artículo</TableCell>
                    <TableCell>Descripción</TableCell>
                    <TableCell align="right">Cant.</TableCell>
                    <TableCell align="right">Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {grupo.articulos.map((a) => (
                    <TableRow key={a.codigo}>
                      <TableCell>{a.codigo}</TableCell>
                      <TableCell>{a.descripcion || '—'}</TableCell>
                      <TableCell align="right">{a.cantidad}</TableCell>
                      <TableCell align="right">{money(a.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </AccordionDetails>
        </Accordion>
      ))}

      {!cargando && !hayError && grupos.length > 0 && (
        <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
          <Typography sx={{ fontWeight: 700 }}>Total general: Bs. {money(totalGeneral)}</Typography>
        </Stack>
      )}
    </Stack>
  )
}
