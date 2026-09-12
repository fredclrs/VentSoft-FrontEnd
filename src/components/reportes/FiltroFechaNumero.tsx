import Box from '@mui/material/Box'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import { conAnio, conTemporada, extraerAnio, type FiltrosHistorial } from '../../utils/filtrarHistorial'
import type { Temporada } from '../../types/temporada'

interface FiltroFechaNumeroProps {
  filtros: FiltrosHistorial
  onChange: (filtros: FiltrosHistorial) => void
  numeroLabel?: string
  numeroPlaceholder?: string
  /** Para reportes que no giran en torno a un documento puntual (ej: más vendidos, ventas del día). */
  mostrarNumero?: boolean
  /**
   * Temporadas configuradas (Administración → Temporadas/campañas). Si la lista viene
   * vacía (o no se pasa), el selector de temporada ni se muestra — el filtro es 100%
   * opcional y no debe aparecer en negocios que no usan esta función. El de Año sí se
   * muestra siempre: es un atajo genérico útil aunque no se usen temporadas.
   */
  temporadas?: Temporada[]
}

const ANIO_ACTUAL = new Date().getFullYear()
const ANIOS = Array.from({ length: 6 }, (_, i) => ANIO_ACTUAL - i)

/** Fila de filtros por rango de fecha, N° de documento (opcional), temporada (opcional) y año. */
export function FiltroFechaNumero({
  filtros,
  onChange,
  numeroLabel = 'N°',
  numeroPlaceholder = 'N° interno o comprobante',
  mostrarNumero = true,
  temporadas = [],
}: FiltroFechaNumeroProps) {
  const mostrarTemporada = temporadas.length > 0
  const columnas = 2 + (mostrarNumero ? 1 : 0) + (mostrarTemporada ? 1 : 0) + 1

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: `repeat(${columnas}, minmax(140px, 200px))` },
        gap: 2,
      }}
    >
      <TextField
        label="Desde"
        type="date"
        size="small"
        fullWidth
        value={filtros.fechaDesde}
        onChange={(e) => onChange({ ...filtros, fechaDesde: e.target.value })}
        slotProps={{ inputLabel: { shrink: true } }}
      />
      <TextField
        label="Hasta"
        type="date"
        size="small"
        fullWidth
        value={filtros.fechaHasta}
        onChange={(e) => onChange({ ...filtros, fechaHasta: e.target.value })}
        slotProps={{ inputLabel: { shrink: true } }}
      />
      {mostrarNumero && (
        <TextField
          label={numeroLabel}
          size="small"
          fullWidth
          placeholder={numeroPlaceholder}
          value={filtros.numero}
          onChange={(e) => onChange({ ...filtros, numero: e.target.value })}
        />
      )}
      {mostrarTemporada && (
        <TextField
          select
          label="Temporada"
          size="small"
          fullWidth
          value={filtros.temporadaId}
          // Al elegir una temporada, Desde/Hasta pasan a ser exactamente su rango de
          // meses (respetando el año ya puesto) — para eso hace falta la lista completa.
          onChange={(e) => onChange(conTemporada(filtros, e.target.value, temporadas))}
        >
          <MenuItem value="">Todas las temporadas</MenuItem>
          {temporadas.map((t) => (
            <MenuItem key={t.id} value={String(t.id)}>
              {t.nombre}
            </MenuItem>
          ))}
        </TextField>
      )}

      <TextField
        select
        label="Año"
        size="small"
        fullWidth
        value={String(extraerAnio(filtros.fechaDesde))}
        // Recalcula Desde/Hasta para el año elegido, respetando la temporada activa
        // (si hay) — atajo rápido en vez de tocar las dos fechas a mano.
        onChange={(e) => onChange(conAnio(filtros, Number(e.target.value), temporadas))}
      >
        {ANIOS.map((anio) => (
          <MenuItem key={anio} value={String(anio)}>
            {anio}
          </MenuItem>
        ))}
      </TextField>
    </Box>
  )
}
