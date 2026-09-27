import { useRef } from 'react'
import Button from '@mui/material/Button'
import CameraAltIcon from '@mui/icons-material/CameraAlt'
import type { ImagenParaIA } from '../api/ia'

interface CapturarFotoProps {
  label: string
  disabled?: boolean
  onFoto: (imagen: ImagenParaIA) => void
}

/**
 * Botón para sacar una foto puntual (factura, documento de identidad) y mandarla a la IA — a
 * diferencia de EscanerCamara (que mantiene la cámara abierta escaneando código tras código sin
 * parar), acá alcanza con UNA sola foto por vez, así que se usa el selector de archivo nativo del
 * celular/navegador en vez de una vista de cámara propia: en el celular, "capture=environment"
 * abre la cámara trasera directo; en la compu, abre el explorador de archivos.
 */
export function CapturarFoto({ label, disabled, onFoto }: CapturarFotoProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  function manejarArchivo(archivo: File) {
    const lector = new FileReader()
    lector.onload = () => {
      const resultado = lector.result as string
      // "data:image/jpeg;base64,AAAA..." — la IA solo necesita la parte de después de la coma.
      const base64 = resultado.slice(resultado.indexOf(',') + 1)
      onFoto({ imagenBase64: base64, mediaType: archivo.type || 'image/jpeg' })
    }
    lector.readAsDataURL(archivo)
  }

  return (
    <>
      <Button
        variant="outlined"
        size="small"
        startIcon={<CameraAltIcon fontSize="small" />}
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        {label}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          const archivo = e.target.files?.[0]
          if (archivo) manejarArchivo(archivo)
          // Limpia el valor para poder elegir la MISMA foto dos veces seguidas si hace falta
          // reintentar (si no, el navegador no dispara onChange de nuevo con el mismo archivo).
          e.target.value = ''
        }}
      />
    </>
  )
}
