#!/usr/bin/env python3
"""Importa el catálogo S&F desde las fotos 'PRODUCTO - ₡precio.jpg'.

Genera:
  public/data/products.json
  public/img/p/<id>.webp   (~600px)
  public/img/t/<id>.webp   (~300px, miniatura)

Uso:  python3 scripts/import_catalog.py [--src RUTA] [--no-images] [--start N --count M]
"""
import argparse, json, os, re, sys, unicodedata, hashlib
from concurrent.futures import ProcessPoolExecutor

HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.dirname(HERE)
DEFAULT_SRC = os.path.normpath(os.path.join(APP, '..', '..', 'files', 'catalogo_syf'))
PUB = os.path.join(APP, 'public')

PRICE_RE = re.compile(r'\s*-\s*₡\s*([\d.,]+)\s*(\(\d+\))?\s*$')
VARIANT_RE = re.compile(r'\s*\((\d+)\)\s*$')


def slug(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode()
    s = re.sub(r'[^a-zA-Z0-9]+', '-', s).strip('-').lower()
    return s or 'x'


def pretty(name):
    # Mayúsculas sostenidas -> tipo oración, conservando siglas cortas con números
    if name.upper() == name:
        name = name.capitalize()
    return re.sub(r'\s+', ' ', name).strip()


def parse(fname):
    base = fname[:-4]
    price = None
    variant = None
    m = PRICE_RE.search(base)
    if m:
        digits = re.sub(r'[^\d]', '', m.group(1))
        price = int(digits) if digits else None
        if m.group(2):
            variant = int(m.group(2)[1:-1])
        base = base[:m.start()]
    vm = VARIANT_RE.search(base)
    if vm:
        variant = int(vm.group(1))
        base = base[:vm.start()]
    return base.strip(), price, variant


def build(src):
    products = []
    seen = set()
    cats = sorted(d for d in os.listdir(src) if os.path.isdir(os.path.join(src, d)))
    for cat in cats:
        files = sorted(f for f in os.listdir(os.path.join(src, cat)) if f.lower().endswith('.jpg'))
        for f in files:
            raw, price, variant = parse(f)
            name = pretty(raw)
            if variant:
                name = f'{name} (modelo {variant})'
            pid = slug(f'{cat}-{raw}') + (f'-{variant}' if variant else '')
            if pid in seen:
                pid += '-' + hashlib.md5(f.encode()).hexdigest()[:5]
            seen.add(pid)
            products.append({
                'id': pid,
                'nombre': name,
                'categoria': cat,
                'categoriaId': slug(cat),
                'precio': price,
                'consultarPrecio': price is None,
                'imagen': f'img/p/{pid}.webp',
                'miniatura': f'img/t/{pid}.webp',
                'origen': 'S&F bajo pedido',
                'disponibilidad': 'Bajo pedido',
                'vendorId': 'syf',
                '_src': os.path.join(cat, f),
            })
    return products


def convert(args):
    srcpath, pid = args
    from PIL import Image
    out_p = os.path.join(PUB, 'img', 'p', pid + '.webp')
    out_t = os.path.join(PUB, 'img', 't', pid + '.webp')
    if os.path.exists(out_p) and os.path.exists(out_t):
        return 0
    im = Image.open(srcpath).convert('RGB')
    a = im.copy(); a.thumbnail((600, 600)); a.save(out_p, 'WEBP', quality=72, method=4)
    b = im.copy(); b.thumbnail((300, 300)); b.save(out_t, 'WEBP', quality=65, method=4)
    return 1


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--src', default=DEFAULT_SRC)
    ap.add_argument('--no-images', action='store_true')
    ap.add_argument('--start', type=int, default=0)
    ap.add_argument('--count', type=int, default=100000)
    a = ap.parse_args()
    prods = build(a.src)
    os.makedirs(os.path.join(PUB, 'data'), exist_ok=True)
    os.makedirs(os.path.join(PUB, 'img', 'p'), exist_ok=True)
    os.makedirs(os.path.join(PUB, 'img', 't'), exist_ok=True)
    clean = [{k: v for k, v in p.items() if not k.startswith('_')} for p in prods]
    with open(os.path.join(PUB, 'data', 'products.json'), 'w', encoding='utf-8') as fh:
        json.dump(clean, fh, ensure_ascii=False, separators=(',', ':'))
    print(f'productos: {len(prods)}  sin precio: {sum(1 for p in prods if p["precio"] is None)}')
    if a.no_images:
        return
    jobs = [(os.path.join(a.src, p['_src']), p['id']) for p in prods][a.start:a.start + a.count]
    with ProcessPoolExecutor() as ex:
        n = sum(ex.map(convert, jobs, chunksize=8))
    print(f'imágenes convertidas: {n} (de {len(jobs)})')


if __name__ == '__main__':
    main()
