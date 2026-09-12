// Con muchas columnas la tabla scrollea horizontal en pantallas chicas; fijamos
// "Acciones" a la derecha para que Editar/Eliminar sigan a mano sin perder el scroll.
export const stickyActionsSx = {
  position: 'sticky' as const,
  right: 0,
  bgcolor: 'background.paper',
  boxShadow: '-2px 0 4px rgba(0,0,0,0.06)',
}
