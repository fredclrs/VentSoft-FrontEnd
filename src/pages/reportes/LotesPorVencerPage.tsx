import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
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
import { EntityAutocomplete } from '../../components/EntityAutocomplete'
import { buscarArticulos } from '../../api/articulos'
import { getLotesPorVencer } from '../../api/compras'
import { getErrorMessage } from '../../api/errors'
import type { Articulo } from '../../types/articulo'

function diasRestantes(fechaVencimiento: string): number {
  const ms = new Date(fechaVencimiento).getTime() - Date.now()
  return Math.ceil(ms / (1000 * 60 * 60 * 24))
}

export function LotesPorVencerPage() {
  const [diasAnticipacion, setDiasAnticipacion] = useState('30')
  const [articulo, setArticulo] = useState<Articulo | null>(null)
  const dias = Number(diasAnticipacion) || 30

  // Al filtrar por un artículo puntual, se ignora el límite de días: se quiere ver TODO su
  // historial de lotes, no solo los que están por vencer pronto (si no, un lote cargado sin
  // vencimiento o con uno lejano nunca aparecería y parecería que "no está en ningún lado").
  const query = useQuery({
    queryKey: ['reportes', 'lotesPorVencer', articulo ? null : dias, articulo?.id],
    queryFn: () => getLotesPorVencer(articulo ? null : dias, articulo?.id),
  })

  return (
    <Stack spacing={3}>
      <div>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Lotes por vencer
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Renglones de compra con lote y/o fecha de vencimiento cargados (solo aplica a negocios que los usan).
        </Typography>
      </div>

      <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <Box sx={{ maxWidth: 240 }}>
          <TextField
            label="Días de anticipación"
            type="number"
            size="small"
            fullWidth
            disabled={!!articulo}
            value={diasAnticipacion}
            onChange={(e) => setDiasAnticipacion(e.target.value)}
            helperText={articulo ? 'No aplica: se ve todo el historial del artículo' : undefined}
          />
        </Box>
        <Box sx={{ maxWidth: 320, flexGrow: 1 }}>
          <EntityAutocomplete
            label="Filtrar por artículo (opcional)"
            size="small"
            queryKey="articulos-autocomplete-lotes"
            searchFn={buscarArticulos}
            getLabel={(a: Articulo) => `${a.codigo} — ${a.descripcion ?? ''}`}
            getId={(a: Articulo) => a.id}
            value={articulo}
            onChange={setArticulo}
          />
        </Box>
      </Stack>

      {query.isError && <Alert severity="error">{getErrorMessage(query.error)}</Alert>}

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Código</TableCell>
              <TableCell>Descripción</TableCell>
              <TableCell>Lote</TableCell>
              <TableCell align="right">Cantidad</TableCell>
              <TableCell>Vencimiento</TableCell>
              <TableCell align="right">Días restantes</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {query.isLoading && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={28} />
                </TableCell>
              </TableRow>
            )}
            {!query.isLoading && (query.data ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    {articulo ? 'Este artículo no tiene lotes cargados.' : 'No hay lotes por vencer en ese rango.'}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {(query.data ?? []).map((lote) => {
              const restantes = lote.fechaVencimiento ? diasRestantes(lote.fechaVencimiento) : null
              return (
                <TableRow key={lote.idDetalleCompra} hover>
                  <TableCell>{lote.codigoArticulo}</TableCell>
                  <TableCell>{lote.descripcionArticulo || '—'}</TableCell>
                  <TableCell>{lote.lote || '—'}</TableCell>
                  <TableCell align="right">{lote.cantidad}</TableCell>
                  <TableCell>{lote.fechaVencimiento ? new Date(lote.fechaVencimiento).toLocaleDateString() : '—'}</TableCell>
                  <TableCell align="right">
                    {restantes !== null && (
                      <Chip
                        size="small"
                        variant="outlined"
                        color={restantes < 0 ? 'error' : restantes <= 7 ? 'warning' : 'default'}
                        label={restantes < 0 ? 'Vencido' : `${restantes} días`}
                      />
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  )
}
