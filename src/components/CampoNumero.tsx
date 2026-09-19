import { useEffect, useRef, useState } from 'react'
import TextField from '@mui/material/TextField'
import type { TextFieldProps } from '@mui/material/TextField'

interface CampoNumeroProps extends Omit<TextFieldProps, 'value' | 'onChange' | 'type'> {
  value: number
  onChange: (valor: number) => void
  /** Valor a usar si el campo queda vacío al salir (blur). Por defecto 0 — pasar 1 en campos
   * que nunca pueden ser 0 (ej. Cantidad). */
  valorVacio?: number
}

/**
 * TextField numérico que se puede borrar de verdad mientras se escribe (ej. Costo, Precio).
 * Un TextField común con value={numero} no deja borrar el "0" para escribir un valor nuevo —
 * apenas se borra, React lo vuelve a mostrar en "0" al toque, porque Number('') es 0. Acá se
 * mantiene el texto tal cual se está tipeando (incluso vacío) mientras el campo tiene foco, y
 * recién al salir (blur) si quedó vacío se vuelve a 0 — así no queda un valor "vacío" guardado
 * por error, pero tampoco se traba mientras se escribe.
 */
export function CampoNumero({ value, onChange, onFocus, onBlur, valorVacio = 0, ...props }: CampoNumeroProps) {
  const [texto, setTexto] = useState(() => String(value))
  const enfocado = useRef(false)

  // Si el valor cambia desde afuera (otro campo lo recalculó, se resetea el form, etc.) se
  // sincroniza el texto mostrado — salvo mientras el usuario lo está tipeando, para no pisarle
  // lo que está escribiendo (ej. un "8." a medio camino de "8.5").
  useEffect(() => {
    if (!enfocado.current) setTexto(String(value))
  }, [value])

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
          setTexto(String(Number(e.target.value)))
        }
        onBlur?.(e)
      }}
      {...props}
    />
  )
}
