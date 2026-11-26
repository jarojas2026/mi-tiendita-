"""Completa descripciones vacías o muy cortas en public/data/products.json con texto neutro
basado solo en el nombre y la categoría (sin inventar medidas, materiales ni precios).
También ordena mayúsculas raras en nombres ("fOLDER LISO" -> "Folder liso") y oculta el logo del proveedor.
Idempotente: correrlo dos veces no duplica texto."""
import json, re, pathlib
P = pathlib.Path(__file__).resolve().parent.parent / 'public/data/products.json'
FRASE = {
  'alfombras': 'Una opción práctica para darle orden y estilo a tu casa.',
  'bebe': 'Pensado para el día a día con los más pequeños de la casa.',
  'belleza': 'Un detalle para tu rutina de cuidado personal y arreglo.',
  'bolsos': 'Un accesorio práctico para andar tus cosas con estilo.',
  'botellas-y-termos': 'Ideal para llevar tu bebida al trabajo, al cole o de paseo.',
  'termos': 'Ideal para llevar tu bebida al trabajo, al cole o de paseo.',
  'cocina': 'Un artículo útil para el día a día en la cocina.',
  'camaras-smart': 'Un artículo de tecnología curioso y práctico, que también funciona como regalo.',
  'escolar-y-oficina': 'Útil para el cole, la universidad o la oficina.',
  'joyeria-acero': 'Un accesorio para complementar tu estilo o para regalar.',
  'juguetes': 'Para jugar, divertirse y también para regalar.',
  'difusores': 'Ideal para ambientar tu casa, tu cuarto o la oficina.',
  'teclados-y-mouse': 'Para tu escritorio, el estudio o los ratos de juego.',
  'hogar': 'Un artículo práctico para tu casa.',
  'medias': 'Un básico cómodo para el día a día o para regalar.',
}
CIERRE = 'Si querés confirmar modelo, color o disponibilidad, escribinos por WhatsApp.'

SIGLAS = {'TV', 'LED', 'USB', 'RGB', 'PU', 'XL', 'XXL', 'DB', 'PC', 'HD', 'UV', 'AA', 'AAA'}
MARCAS = {'disney', 'stitch', 'mickey', 'micky', 'minnie', 'mouse', 'hello', 'kitty', 'kity', 'kuromi', 'spiderman', 'batman',
          'goku', 'mario', 'bros', 'sofía', 'sofia', 'capitán', 'américa', 'iron', 'man', 'frozen', 'barbie', 'sonic',
          'pikachu', 'pokemon', 'hulk', 'cars', 'marvel', 'dragon', 'ball', 'tetrix', 'inpods', 'mipods', 'souyi'}

def palabra(w, primera):
    if any(c.isdigit() for c in w) or not any(c.isalpha() for c in w): return w
    if w in SIGLAS: return w
    rara = w[1:] != w[1:].lower() or (w.isupper() and len(w) > 1)
    if not rara: return w
    base = w.lower()
    return base[:1].upper() + base[1:] if (primera or base in MARCAS) else base

def nombre_limpio(n):
    n = ' '.join(palabra(w, i == 0) for i, w in enumerate(n.split(' ')))
    return n[:1].upper() + n[1:]

d = json.loads(P.read_text())
cn = cd = 0
for p in d:
    if p['id'] == 'otros-000-logosyf':
        p['hidden'] = True; p['motivoOculto'] = 'Logo del proveedor, no es un producto'
        continue
    nuevo = nombre_limpio(p['nombre'])
    if nuevo != p['nombre']: p['nombre'] = nuevo; cn += 1
    frase = FRASE.get(p['categoriaId'], f"Un artículo de {p['categoria'].lower()} para tu casa o para regalar.")
    desc = (p.get('descripcion') or '').strip()
    if not desc:
        p['descripcion'] = f"{p['nombre']}, de nuestra sección {p['categoria']}. {frase} {CIERRE}"; cd += 1
    elif len(desc) < 60 and frase not in desc:
        p['descripcion'] = f"{desc} {frase}"; cd += 1
P.write_text(json.dumps(d, ensure_ascii=False, separators=(',', ':')) + '\n')
print('nombres', cn, 'descripciones', cd)
