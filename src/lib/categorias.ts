// Ícono por categoría para los chips del catálogo
export const ICONO_CAT: Record<string, string> = {
  finca: '🌱', alfombras: '🧶', 'aros-de-luz': '💫', audifonos: '🎧', bano: '🛁', bebe: '🍼', belleza: '💄', bolsos: '👜',
  'botellas-y-termos': '🧴', 'bultos-y-loncheras': '🎒', 'cables-y-cargadores': '🔌', 'camaras-smart': '📷', 'camaras-vigilancia': '📹',
  cocina: '🍳', consolas: '🎮', difusores: '🌫️', disfraces: '🎭', ejercicio: '🏋️', 'escolar-y-oficina': '✏️', 'espejos-led': '🪞',
  fiesta: '🎉', 'fuentes-mascota': '⛲', 'gorras-y-sombreros': '🧢', gorros: '🧣', hogar: '🏠', iluminacion: '💡', 'joyeria-acero': '💍',
  joyeros: '💎', juguetes: '🧸', lentes: '🕶️', llaveros: '🔑', 'masaje-y-salud': '💆', mascotas: '🐾', medias: '🧦', organizadores: '🗂️',
  otros: '🛍️', parlantes: '🔊', 'power-banks': '🔋', 'proyectores-y-lamparas': '🌙', 'relojes-inteligentes': '⌚', sombrillas: '☂️',
  'soportes-celular': '📱', 'teclados-y-mouse': '⌨️', termos: '🥤', 'varios-negocio': '🏷️', ventiladores: '🌀',
}
export const iconoCat = (id: string) => ICONO_CAT[id] ?? '🛍️'
