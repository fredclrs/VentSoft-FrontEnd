import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import PrintIcon from '@mui/icons-material/PrintOutlined'
import CameraAltIcon from '@mui/icons-material/CameraAlt'
import { articulosApi, getStockTodos } from '../../api/articulos'
import { familiasApi } from '../../api/familias'
import { getErrorMessage } from '../../api/errors'
import { imprimirListado } from '../../utils/imprimirListado'
import { useConfiguracionEmpresa } from '../../hooks/useConfiguracionEmpresa'
import { fraccionDe } from '../../utils/fraccion'
import { EscanerCamara } from '../../components/EscanerCamara'

export function StockActualPage() {
  const { nombreNegocio } = useConfiguracionEmpresa()
  const [texto, setTexto] = useState('')
  const [idFamilia, setIdFamilia] = useState<number | ''>('')
  // Para caminar por el local y consultar stock escaneando, sin arriesgarse a agregar nada a
  // ninguna venta/compra — acá no hay carrito, escanear solo filtra la tabla de abajo.
  const [escanerAbierto, setEscanerAbierto] = useState(false)

  const stockQuery = useQuery({ queryKey: ['stock', 'todos'], queryFn: getStockTodos })
  const articulosQuery = useQuery({ queryKey: ['articulos'], queryFn: () => articulosApi.search() })
  const familiasQuery = useQuery({ queryKey: ['familias'], queryFn: () => familiasApi.search() })

  const articuloPorId = useMemo(
    () => new Map((articulosQuery.data ?? []).map((a) => [a.id, a])),
    [articulosQuery.data],
  )
  const familiaPorId = useMemo(
    () => new Map((familiasQuery.data ?? []).map((f) => [f.id, f])),
    [familiasQuery.data],
  )

  const filas = useMemo(() => {
    const textoLower = texto.trim().toLowerCase()
    return (stockQuery.data ?? [])
      .map((s) => {
        const articulo = articuloPorId.get(s.idArticulo)
        const familia = articulo ? familiaPorId.get(articulo.idFamilia) : undefined
        return { ...s, idFamilia: articulo?.idFamilia, nombreFamilia: familia?.nombreFamilia, fraccion: articulo ? fraccionDe(articulo) : 1 }
      })
      .filter((f) => !idFamilia || f.idFamilia === idFamilia)
      .filter(
        (f) =>
          !textoLower ||
          f.codigo.toLowerCase().includes(textoLower) ||
          (f.descripcion ?? '').toLowerCase().includes(textoLower),
      )
      .sort((a, b) => a.codigo.localeCompare(b.codigo))
  }, [stockQuery.data, articuloPorId, familiaPorId, texto, idFamilia])

  const cargando = stockQuery.isLoading || articulosQuery.isLoading || familiasQuery.isLoading
  const hayError = stockQuery.isError || articulosQuery.isError || familiasQuery.isError

  function imprimir() {
    imprimirListado({
      nombreNegocio,
      titulo: 'Stock actual',
      subtitulo: `${filas.length} artículo(s)${idFamilia ? ` · Familia: ${familiaPorId.get(idFamilia)?.nombreFamilia ?? ''}` : ''}`,
      columnas: [
        { label: 'Código' },
        { label: 'Descripción' },
        { label: 'Familia' },
        { label: 'Stock actual', align: 'right' },
        { label: 'Mínimo', align: 'right' },
        { label: 'Ideal', align: 'right' },
      ],
      filas: filas.map((f) => [
        f.codigo,
        f.descripcion || '—',
        f.nombreFamilia ?? '—',
        f.stockActual,
        f.stockMinimo ?? '—',
        f.stockIdeal ?? '—',
      ]),
    })
  }

  return (
    <Stack spacing={3}>
      <div>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Stock actual
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Cuánto queda de cada artículo activo, tenga poco o mucho (para eso puntual, ver el
          reporte de "Stock bajo"). Podés escanear con la cámara para consultar sin riesgo de
          agregar nada a ninguna venta o compra.
        </Typography>
      </div>

      <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
        <TextField
          label="Buscar o escanear por código o descripción"
          size="small"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          sx={{ minWidth: 260 }}
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    title={escanerAbierto ? 'Cerrar cámara' : 'Escanear con la cámara'}
                    color={escanerAbierto ? 'primary' : 'default'}
                    onClick={() => setEscanerAbierto((v) => !v)}
                  >
                    <CameraAltIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />
        <TextField
          select
          label="Familia"
          size="small"
          value={idFamilia}
          onChange={(e) => setIdFamilia(e.target.value === '' ? '' : Number(e.target.value))}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">Todas</MenuItem>
          {(familiasQuery.data ?? []).map((f) => (
            <MenuItem key={f.id} value={f.id}>
              {f.nombreFamilia}
            </MenuItem>
          ))}
        </TextField>
        <Box sx={{ flexGrow: 1 }} />
        <Button startIcon={<PrintIcon />} variant="outlined" disabled={filas.length === 0} onClick={imprimir}>
          Imprimir
        </Button>
      </Stack>

      {escanerAbierto && (
        <EscanerCamara
          onCodigo={(codigo) => setTexto(codigo)}
          onCerrar={() => setEscanerAbierto(false)}
        />
      )}

      {hayError && (
        <Alert severity="error">
          {getErrorMessage(stockQuery.error ?? articulosQuery.error ?? familiasQuery.error)}
        </Alert>
      )}

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Código</TableCell>
              <TableCell>Descripción</TableCell>
              <TableCell>Familia</TableCell>
              <TableCell align="right">Stock actual</TableCell>
              <TableCell align="right">Mínimo</TableCell>
              <TableCell align="right">Ideal</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {cargando && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={28} />
                </TableCell>
              </TableRow>
            )}
            {!cargando && filas.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">No hay artículos que coincidan.</Typography>
                </TableCell>
              </TableRow>
            )}
            {filas.map((f) => {
              const stockBajo = f.stockMinimo != null && f.stockActual <= f.stockMinimo
              // Solo se muestra el desglose paquete/suelto en artículos que de verdad se venden
              // por paquete (fraccion > 1) — el resto de los negocios nunca ve esta cuenta.
              const desglose =
                f.fraccion > 1
                  ? `${Math.floor(f.stockActual / f.fraccion)} paquete(s) + ${f.stockActual % f.fraccion} suelta(s)`
                  : null
              return (
                <TableRow key={f.idArticulo} hover>
                  <TableCell>{f.codigo}</TableCell>
                  <TableCell>{f.descripcion || '—'}</TableCell>
                  <TableCell>{f.nombreFamilia ?? '—'}</TableCell>
                  <TableCell align="right">
                    <Chip
                      size="small"
                      color={stockBajo ? 'error' : 'default'}
                      variant={stockBajo ? 'outlined' : 'filled'}
                      label={f.stockActual}
                    />
                    {desglose && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        {desglose}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">{f.stockMinimo ?? '—'}</TableCell>
                  <TableCell align="right">{f.stockIdeal ?? '—'}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  )
}
