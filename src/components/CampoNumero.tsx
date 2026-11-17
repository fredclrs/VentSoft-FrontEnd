import { useEffect, useRef, useState } from 'react'
import TextField from '@mui/material/TextField'
import type { TextFieldProps } from '@mui/material/TextField'

interface CampoNumeroProps extends Omit<TextFieldProps, 'value' | 'onChange' | 'type'> {
  value: number
  onChange: (valor: number) => void
  /** Valor a usar si el campo queda vacío al salir (blur). Por defecto 0 — pasar 1 en campos
   * que nunca pueden ser 0 (ej. Cantidad). */
  valorVacio?: number
  /** Para cuando quien lo usa CORRIGE lo tipeado en su onChange (ej. Cantidad de Ventas topeada
   * al stock: escribís 50, hay 10, guarda 10): muestra la corrección al toque, en vez de seguir
   * mostrando "50" mientras por dentro vale 10. Solo para campos cuyo onChange siempre
   * actualiza value — si value se actualiza recién después (ej. al salir del campo), esto no
   * dejaría escribir. */
  reflejarCorreccion?: boolean
}

/**
 * TextField numérico que se puede borrar de verdad mientras se escribe (ej. Costo, Precio).
 * Un TextField común con value={numero} no deja borrar el "0" para escribir un valor nuevo —
 * apenas se borra, React lo vuelve a mostrar en "0" al toque, porque Number('') es 0. Acá se
 * mantiene el texto tal cual se está tipeando (incluso vacío) mientras el campo tiene foco, y
 * recién al salir (blur) si quedó vacío se vuelve a 0 — así no queda un valor "vacío" guardado
 * por error, pero tampoco se traba mientras se escribe.
 */
export function CampoNumero({
  value,
  onChange,
  onFocus,
  onBlur,
  valorVacio = 0,
  reflejarCorreccion = false,
  ...props
}: CampoNumeroProps) {
  const [texto, setTexto] = useState(() => String(value))
  const enfocado = useRef(false)

  // Si el valor cambia desde afuera (otro campo lo recalculó, se resetea el form, etc.) se
  // sincroniza el texto mostrado — salvo mientras el usuario lo está tipeando, para no pisarle
  // lo que está escribiendo (ej. un "8." a medio camino de "8.5").
  useEffect(() => {
    if (!enfocado.current) setTexto(String(value))
  }, [value])

  // Ver reflejarCorreccion. No toca lo que está a medio escribir y ya vale lo mismo (ej. "8."
  // mientras se escribe "8.5", o "0.50").
  useEffect(() => {
    if (!reflejarCorreccion || !enfocado.current || texto === '') return
    const tipeado = Number(texto)
    if (!Number.isNaN(tipeado) && tipeado !== value) setTexto(String(value))
  }, [reflejarCorreccion, texto, value])

  return (
    <TextField
      type="number"
      value={texto}
      onFocus={(e) => {
        enfocado.current = true
        onFocus?.(e)
      }}
      onChange={(e) => {
        setTexto(e.target.value)
        if (e.target.value !== '') onChange(Number(e.target.value))
      }}
      onBlur={(e) => {
        enfocado.current = false
        if (e.target.value === '') {
          setTexto(String(valorVacio))
          onChange(valorVacio)
        } else {
          setTexto(String(reflejarCorreccion ? value : Number(e.target.value)))
        }
        onBlur?.(e)
      }}
      {...props}
    />
  )
}
