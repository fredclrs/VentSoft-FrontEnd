import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { BarcodeFormat, DecodeHintType, NotFoundException } from '@zxing/library'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import CloseIcon from '@mui/icons-material/Close'

interface EscanerCamaraProps {
  /** Se llama con el texto decodificado apenas se detecta un código válido. El escaneo sigue
   * activo después de esto (modo continuo) — quien lo usa decide si hace algo con cada código. */
  onCodigo: (codigo: string) => void
  /** Si es true, deja de intentar decodificar (la cámara se ve igual pero no dispara onCodigo) —
   * para cuando se abrió el selector de variantes y hay que elegir con un toque antes de seguir
   * escaneando el próximo código. */
  pausado?: boolean
  onCerrar: () => void
}

// Code128/EAN/UPC son los formatos de código de barras "de líneas" (los que imprime VentSoft y
// los que traen de fábrica la mayoría de los productos); Code 39 se suma porque es común en
// etiquetas de fábrica de indumentaria (códigos alfanuméricos tipo "CH130AZ"); QR también se
// soporta por si alguna vez hace falta. No se agregan más formatos a propósito: cuantos menos,
// más rápido decodifica.
const FORMATOS_SOPORTADOS = [
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.QR_CODE,
]

/**
 * Lector de código de barras/QR con la cámara del dispositivo, embebido en la propia página (NO
 * pantalla completa, a propósito — así el carrito/venta que está atrás sigue visible). Escaneo
 * continuo: no hay que volver a tocar nada entre un producto y el siguiente, solo apuntar. Cada
 * código detectado muestra una confirmación breve antes de seguir escaneando.
 */
export function EscanerCamara({ onCodigo, pausado, onCerrar }: EscanerCamaraProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const readerRef = useRef<BrowserMultiFormatReader | null>(null)
  const controlsRef = useRef<{ stop: () => void } | null>(null)
  const pausadoRef = useRef(pausado)
  const [ultimoDetectado, setUltimoDetectado] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    pausadoRef.current = pausado
  }, [pausado])

  useEffect(() => {
    const hints = new Map()
    hints.set(DecodeHintType.POSSIBLE_FORMATS, FORMATOS_SOPORTADOS)
    hints.set(DecodeHintType.TRY_HARDER, true)
    const reader = new BrowserMultiFormatReader(hints)
    readerRef.current = reader
    let cancelado = false
    let ultimoTexto = ''
    let ultimoMomento = 0

    reader
      .decodeFromVideoDevice(undefined, videoRef.current!, (resultado, err) => {
        if (cancelado || pausadoRef.current) return
        if (resultado) {
          const texto = resultado.getText()
          const ahora = Date.now()
          // Evita disparar el mismo código varias veces seguidas mientras la cámara lo sigue
          // viendo enfocado (el decodificador corre varias veces por segundo).
          if (texto === ultimoTexto && ahora - ultimoMomento < 2000) return
          ultimoTexto = texto
          ultimoMomento = ahora
          setUltimoDetectado(texto)
          setError(null)
          onCodigo(texto)
          setTimeout(() => setUltimoDetectado((actual) => (actual === texto ? null : actual)), 1200)
        } else if (err && !(err instanceof NotFoundException)) {
          // NotFoundException es el caso normal ("todavía no hay ningún código en cuadro"), no
          // es un error real — cualquier otra cosa (cámara no disponible, permiso denegado) sí.
          setError('No se pudo acceder a la cámara. Revisá los permisos del navegador.')
        }
      })
      .then((controls) => {
        if (cancelado) controls.stop()
        else controlsRef.current = controls
      })
      .catch(() => {
        if (!cancelado) setError('No se pudo acceder a la cámara. Revisá los permisos del navegador.')
      })

    return () => {
      cancelado = true
      controlsRef.current?.stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Paper variant="outlined" sx={{ p: 1, position: 'relative', maxWidth: 360 }}>
      <Box
        sx={{
          position: 'relative',
          borderRadius: 1,
          overflow: 'hidden',
          bgcolor: 'black',
          aspectRatio: '4 / 3',
        }}
      >
        <video
          ref={videoRef}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          muted
          playsInline
        />
        <IconButton
          size="small"
          onClick={onCerrar}
          sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'rgba(0,0,0,0.5)', color: 'white', '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' } }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
        {ultimoDetectado && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'rgba(46, 125, 50, 0.85)',
            }}
          >
            <Typography variant="h6" sx={{ color: 'white', fontWeight: 700, textAlign: 'center', px: 2 }}>
              ✓ Detectado: {ultimoDetectado}
            </Typography>
          </Box>
        )}
        {pausado && !ultimoDetectado && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'rgba(0,0,0,0.5)',
            }}
          >
            <Typography variant="body2" sx={{ color: 'white', fontWeight: 600 }}>
              Elegí la variante abajo para seguir escaneando
            </Typography>
          </Box>
        )}
      </Box>
      {error && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {error}
        </Alert>
      )}
      {!error && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, textAlign: 'center' }}>
          Apuntá al código — se agrega solo, sin tocar nada.
        </Typography>
      )}
    </Paper>
  )
}
