#!/usr/bin/env python3
"""Prueba E2E en MODO DEMO sobre dist/ (v5: estados nuevo/confirmado/en camino; construir con VITE_MODO=demo npm run build).
(Original v3, requiere playwright para Python y un Chromium.)

Chromium: si existe CHROMIUM_PATH (o /tmp/libs/usr/lib/chromium/chromium-headless-shell) se usa ese;
si no, el que instaló `playwright install chromium`.
  LD_LIBRARY_PATH=/tmp/libs/usr/lib/aarch64-linux-gnu /tmp/pwv/bin/python scripts/e2e_demo.py

Flujo: inicio (carrusel, beneficios, destacadas, finca) -> sugerencias de búsqueda -> curaduría -> catálogo ->
favoritos -> queso en medios kilos -> carrito -> registro -> checkout con UBICACIÓN SIMULADA (geolocalización de
Playwright en San Isidro => envío gratis) y mapa -> mensaje WhatsApp con link de Google Maps -> historial y
"Repetir pedido" -> Asistente Tiendita (modo local) -> admin (estado, CSV, mapa + ruta, ruta del día, clientes,
reportes, asistente admin, productos ocultos/reactivar). Capturas en screenshots/v3-*.png.
"""
import json, os, re, subprocess, sys, time, socket
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
CR = ZoneInfo('America/Costa_Rica')  # el navegador de la prueba corre en hora de Costa Rica
from urllib.parse import unquote
from playwright.sync_api import sync_playwright, expect

APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHOTS = os.path.join(APP, 'screenshots')
os.makedirs(SHOTS, exist_ok=True)
PORT = 4173
CHROME = os.environ.get('CHROMIUM_PATH') or ('/tmp/libs/usr/lib/chromium/chromium-headless-shell'
                                             if os.path.exists('/tmp/libs/usr/lib/chromium/chromium-headless-shell') else None)
# Pin simulado: centro de San Isidro de El General (zona de envío gratis)
GEO = {'latitude': 9.3735, 'longitude': -83.7035, 'accuracy': 25}


def wait_port(p):
    for _ in range(50):
        try:
            socket.create_connection(('127.0.0.1', p), 0.2).close(); return
        except OSError:
            time.sleep(0.1)


srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '-d', os.path.join(APP, 'dist')],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
wait_port(PORT)
BASE = f'http://127.0.0.1:{PORT}/'
log = lambda m: print('✔', m, flush=True)
errors = []
shot = lambda page, name, full=False: page.screenshot(path=os.path.join(SHOTS, name), full_page=full)


def esperar_tiles(page, sel, ms=6000):
    """Espera a que carguen tiles de OpenStreetMap (si hay internet); no falla si no cargan."""
    try:
        page.wait_for_function(f"""() => {{ const t = [...document.querySelectorAll('{sel} img.leaflet-tile')];
            return t.length > 0 && t.filter(i => i.complete && i.naturalWidth > 0).length >= Math.min(4, t.length) }}""", timeout=ms)
        page.wait_for_timeout(500)
        return True
    except Exception:
        return False


def pedidos_demo():
    """Pedidos de ejemplo (datos de prueba) para ver el mapa, la ruta y los reportes del admin."""
    hoy = datetime.now(CR).date()
    pins = [(9.4790, -83.6530, 'Ana Solís', 'palmital', 'Palmital / La Piedra', 'nuevo'),
            (9.4230, -83.6590, 'Luis Mora', 'centro-rivas', 'Centro de Rivas', 'confirmado'),
            (9.4400, -83.6700, 'Carmen Vega', 'san-antonio', 'San Antonio / Pueblo Nuevo', 'en camino'),
            (9.3740, -83.7050, 'Pedro Castro', 'san-isidro', 'San Isidro de El General (centro)', 'confirmado'),
            (9.4985, -83.6300, 'Rosa Ureña', 'herradura', 'Herradura / San Gerardo', 'entregado')]
    items = [[('finca-huevos-30', 'Huevos Granja Palmital — cartón de 30', 2500, 2, 'finca', 'En tienda')],
             [('finca-queso-tierno', 'Queso tierno de la finca', 4000, 1.5, 'finca', 'En tienda'), ('medias-x', 'Medias navideñas', 1500, 3, 'syf', 'Bajo pedido')],
             [('juguetes-x', 'Muñeca con accesorios', 4500, 1, 'syf', 'Bajo pedido'), ('finca-natilla', 'Natilla casera', 2000, 1, 'finca', 'En tienda')],
             [('audifonos-x', 'Audífonos inalámbricos', 6500, 1, 'syf', 'Bajo pedido')],
             [('finca-leche', 'Leche fresca de la finca — 3 litros', 2000, 2, 'finca', 'En tienda'), ('finca-huevos-20', 'Huevos Granja Palmital — bolsita de 20', 1500, 1, 'finca', 'En tienda')]]
    out = []
    for k, ((lat, lng, nom, zid, znom, est), its) in enumerate(zip(pins, items)):
        sub = sum(p * q for _, _, p, q, _, _ in its)
        creado = (datetime.now(CR) - timedelta(days=k * 2, hours=k)).isoformat()
        out.append({'id': f'seed{k}', 'codigo': f'MT-DEMO-{k:02d}', 'userId': f'cli{k}', 'email': f'cli{k}@demo.cr',
                    'cliente': {'nombre': nom, 'telefono': f'8800-00{k:02d}'},
                    'items': [{'id': i, 'nombre': n, 'precio': p, 'qty': q, 'disponibilidad': d, 'vendorId': v, **({'venta': 'kg'} if 'queso' in i else {})} for i, n, p, q, v, d in its],
                    'subtotal': sub, 'envio': 1000, 'total': sub + 1000, 'adelanto': 0, 'hayBajoPedido': False, 'hayPrecioPorConfirmar': False,
                    'zonaId': zid, 'zonaNombre': znom, 'direccion': 'Dirección de prueba', 'ubicacion': {'lat': lat, 'lng': lng}, 'distanciaKm': 3,
                    'fecha': hoy.isoformat(), 'franja': '8:00 a. m. – 11:00 a. m.', 'pago': 'efectivo', 'notas': '', 'estado': est,
                    'historial': [{'estado': est, 'at': creado}], 'creado': creado})
    return out


try:
    with sync_playwright() as pw:
        launch = {'executable_path': CHROME} if CHROME else {}
        # Si el entorno sale a internet por un proxy, pasárselo a Chromium (para los tiles de OpenStreetMap)
        px = os.environ.get('HTTPS_PROXY') or os.environ.get('https_proxy')
        if px:
            from urllib.parse import urlsplit
            u = urlsplit(px)
            launch['proxy'] = {'server': f'{u.scheme}://{u.hostname}:{u.port}', 'bypass': '127.0.0.1,localhost',
                               **({'username': u.username, 'password': u.password or ''} if u.username else {})}
        b = pw.chromium.launch(**launch)
        ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True,
                            locale='es-CR', timezone_id='America/Costa_Rica', service_workers='block', geolocation=GEO, color_scheme='light')
        ctx.grant_permissions(['clipboard-read', 'clipboard-write', 'geolocation'], origin=BASE.rstrip('/'))
        # WhatsApp: no salir a internet; solo verificar la URL generada
        ctx.route(re.compile(r'https://(wa\.me|api\.whatsapp\.com)/.*'), lambda r: r.fulfill(status=200, content_type='text/html', body='<p>WhatsApp (simulado)</p>'))
        tiles_status = {}

        def tile(route):
            # Los tiles de OpenStreetMap se bajan con urllib (respeta el proxy del entorno) y se entregan a Chromium
            import urllib.request
            try:
                req = urllib.request.Request(route.request.url, headers={'User-Agent': 'MiTiendita-e2e/3.0 (prueba local)', 'Referer': 'https://jarojas2026.github.io/'})
                with urllib.request.urlopen(req, timeout=10) as r:
                    route.fulfill(status=200, content_type='image/png', body=r.read())
            except Exception:
                route.abort()
        ctx.route(re.compile(r'https://[a-c]\.tile\.openstreetmap\.org/.*'), tile)
        ctx.on('response', lambda r: tiles_status.__setitem__(r.status, tiles_status.get(r.status, 0) + 1) if 'tile.openstreetmap' in r.url else None)
        page = ctx.new_page()
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('dialog', lambda d: d.accept())

        # ---------- Inicio ----------
        page.goto(BASE)
        expect(page.get_by_test_id('demo-banner')).to_be_visible()
        expect(page.get_by_test_id('banner-navidad')).to_contain_text('Regalos de Navidad')
        expect(page.get_by_test_id('banner-finca')).to_contain_text('De nuestra finca')
        expect(page.get_by_test_id('banner-escolar')).to_contain_text('Útiles escolares')
        expect(page.get_by_test_id('beneficios')).to_contain_text('Envío gratis en San Isidro')
        for t in ['Medias', 'Luces solares y LED', 'Juguetes', 'Escolar y oficina', 'Audífonos', 'Cables y cargadores']:
            expect(page.get_by_test_id('destacadas')).to_contain_text(t)
        expect(page.get_by_role('heading', name='De nuestra finca en Palmital')).to_be_visible()
        expect(page.get_by_text('precio por confirmar')).to_have_count(0)
        page.wait_for_timeout(1500)
        shot(page, 'v3-inicio.png')
        shot(page, 'v3-inicio-completo.png', full=True)
        log('Inicio: carrusel (Navidad, Finca, Útiles), "Envío gratis en San Isidro", 6 destacadas, sección Hecho en PZ')

        page.get_by_role('button', name='Agregar Huevos Granja Palmital — cartón de 30').first.click()
        expect(page.get_by_test_id('cart-count')).to_have_text('1')

        # ---------- Búsqueda con sugerencias instantáneas ----------
        page.get_by_label('Buscar productos').fill('audifo')
        expect(page.get_by_test_id('search-suggest').get_by_role('option').first).to_be_visible()
        n_sug = page.get_by_test_id('search-suggest').get_by_role('option').count()
        page.get_by_label('Buscar productos').fill('termo')
        page.get_by_label('Buscar productos').press('Enter')
        expect(page.get_by_role('heading', level=1)).to_contain_text('termo')
        log(f'Sugerencias instantáneas ("audifo" → {n_sug}); búsqueda "termo": ' + page.get_by_test_id('result-count').inner_text())
        page.get_by_role('button', name='Borrar búsqueda').click()
        expect(page.get_by_test_id('search-suggest')).to_contain_text('Búsquedas recientes')
        expect(page.get_by_test_id('search-suggest')).to_contain_text('termo')
        page.keyboard.press('Escape')
        log('Búsquedas recientes guardadas')
        page.goto(BASE + '#/catalogo?q=audifonos%20inalambricos')
        expect(page.get_by_test_id('product-card').first).to_be_visible()
        log('Búsqueda sin tildes "audifonos inalambricos": ' + page.get_by_test_id('result-count').inner_text())

        # ---------- Curaduría ----------
        for w in ['labubu', 'kuromi', 'funko', 'stitch']:
            page.goto(BASE + f'#/catalogo?q={w}')
            expect(page.get_by_test_id('result-count')).to_have_text('0 productos')
        expect(page.get_by_test_id('empty-state')).to_be_visible()
        page.goto(BASE + '#/catalogo')
        total_visible = page.get_by_test_id('result-count').inner_text()
        log(f'Curaduría: licencias ocultas (0 resultados, estado vacío ilustrado); catálogo visible {total_visible}')

        page.goto(BASE + '#/catalogo?dest=luces')
        expect(page.get_by_test_id('product-card').first).to_be_visible()
        log('Destacada "Luces solares y LED": ' + page.get_by_test_id('result-count').inner_text())

        page.goto(BASE + '#/catalogo?cat=medias&orden=precio-asc')
        expect(page.get_by_test_id('product-card').first).to_be_visible()
        page.wait_for_timeout(1500)
        shot(page, 'v3-catalogo.png')
        log('Catálogo Medias ordenado por precio: ' + page.get_by_test_id('result-count').inner_text())

        # Favoritos (corazón en la tarjeta)
        page.get_by_test_id('product-card').nth(0).get_by_role('button', name='Agregar a favoritos').click()
        page.get_by_test_id('product-card').nth(1).get_by_role('button', name='Agregar a favoritos').click()

        # Ficha bazar: agregar 2
        page.get_by_test_id('product-card').nth(2).locator('a').nth(1).click()
        page.get_by_role('button', name='Más', exact=True).click()
        page.get_by_role('button', name='Agregar al carrito', exact=True).click()
        expect(page.get_by_test_id('subtotal')).to_be_visible()

        page.goto(BASE + '#/favoritos')
        expect(page.get_by_test_id('fav-count')).to_have_text('2')
        log('Favoritos / lista de deseos: 2 guardados')

        # Queso en medios kilos: 1 kg -> 1,5 kg
        page.goto(BASE + '#/p/finca-queso-tierno')
        expect(page.get_by_text('₡4.500')).to_be_visible()
        page.get_by_role('button', name='Más', exact=True).click()
        expect(page.get_by_test_id('qty')).to_have_text('1,5 kg')
        page.evaluate('window.scrollTo(0, 0)')
        page.wait_for_timeout(800)
        shot(page, 'v3-producto.png')
        page.get_by_role('button', name='Agregar al carrito', exact=True).click()
        expect(page.get_by_text('₡6.000').first).to_be_visible()
        cnt = page.get_by_test_id('cart-count').inner_text()
        assert cnt == '4', cnt
        log('Queso tierno 1,5 kg = ₡6.000; carrito ' + page.get_by_test_id('subtotal').inner_text() + f', {cnt} artículos')
        page.goto(BASE + '#/')
        expect(page.get_by_role('heading', name='Vistos recientemente')).to_be_visible()
        log('Inicio muestra "Vistos recientemente" y "Para vos"' if page.get_by_role('heading', name='Para vos').count() else 'Inicio muestra "Vistos recientemente"')
        page.goto(BASE + '#/carrito')
        page.reload()
        expect(page.get_by_test_id('cart-count')).to_have_text('4')
        log('Carrito persiste tras recargar')

        # ---------- Registro ----------
        page.get_by_role('button', name='Continuar al pago').click()
        page.get_by_role('button', name='Crear cuenta').first.click()
        page.locator('input[name=nombre]').fill('María Prueba Mora')
        page.locator('input[name=email]').fill('maria@prueba.cr')
        page.locator('input[name=password]').fill('secreta123')
        page.locator('form').get_by_role('button', name='Crear cuenta').click()
        expect(page.get_by_role('heading', name='Finalizar pedido')).to_be_visible()
        log('Registro OK, redirige a checkout')

        # ---------- Checkout con ubicación simulada ----------
        expect(page.get_by_role('link', name='Inicio', exact=True)).to_have_count(0)
        page.locator('input[name=telefono]').fill('8888-1234')
        page.get_by_role('button', name='Usar mi ubicación').click()
        sug = page.get_by_test_id('sugerencia-envio')
        expect(sug).to_contain_text('GRATIS')
        expect(sug).to_contain_text('San Isidro de El General')
        expect(page.get_by_label('San Isidro de El General (centro)')).to_be_checked()
        expect(page.locator('.leaflet-marker-icon').first).to_be_visible()
        log('Geolocalización simulada (San Isidro): ' + sug.inner_text().replace('\n', ' | '))
        page.locator('textarea[name=direccion]').fill('Frente al parque de San Isidro,\ncasa blanca con portón negro')
        page.get_by_test_id('mapa-checkout').scroll_into_view_if_needed()
        tiles = esperar_tiles(page, '[data-testid=mapa-checkout]')
        page.evaluate("window.scrollBy(0, -170)")
        page.wait_for_timeout(400)
        shot(page, 'v3-checkout-mapa.png')
        log('Mapa del checkout con pin y tienda' + (' (tiles OSM cargados)' if tiles else f' (tiles no cargaron: {tiles_status})'))
        page.get_by_test_id('fechas').locator('button').first.click()
        page.get_by_text('8:00 a. m. – 11:00 a. m.').click()
        expect(page.get_by_text('número SINPE por confirmar')).to_be_visible()
        page.get_by_text('Efectivo contra entrega').click()
        page.locator('textarea[name=notas]').fill('Llamar al llegar')
        expect(page.get_by_test_id('resumen-ubicacion')).to_contain_text('de la tienda')
        page.get_by_role('button', name='Confirmar y enviar por WhatsApp').scroll_into_view_if_needed()
        total = page.get_by_test_id('total').inner_text()
        with ctx.expect_page() as wa:
            page.get_by_role('button', name='Confirmar y enviar por WhatsApp').click()
        wa_url = wa.value.url
        wa.value.close()
        assert 'wa.me/50687692109' in wa_url or 'phone=50687692109' in wa_url, wa_url
        msg = unquote(wa_url)
        for frag in ['NUEVO PEDIDO MT-', 'Zona:* San Isidro de El General (centro)', 'Ubicación:* https://www.google.com/maps/search/?api=1&query=9.373500,-83.703500',
                     'de la tienda', 'Entrega:*', '8:00 a. m.', '1,5 kg Queso tierno', 'Envío: gratis', 'TOTAL:', 'Adelanto', 'Pago:* Efectivo']:
            assert frag in msg, (frag, msg)
        expect(page.get_by_text('¡Pedido guardado!')).to_be_visible()
        expect(page.get_by_test_id('links-navegacion')).to_contain_text('Abrir en Waze')
        codigo = page.get_by_role('heading', level=1).inner_text().replace('Pedido ', '')
        stored = page.evaluate("() => JSON.parse(localStorage.getItem('mt_demo_orders')).slice(-1)[0]")
        assert abs(stored['ubicacion']['lat'] - 9.3735) < 1e-4 and stored['envio'] == 0, stored
        perfil = page.evaluate("() => Object.values(JSON.parse(localStorage.getItem('mt_demo_perfiles'))).find(p => p.email === 'maria@prueba.cr')")
        assert perfil['direcciones'][0].get('lat'), perfil
        log(f'Checkout OK, total {total} (envío gratis); WhatsApp con link de Google Maps del pin; lat/lng guardados en pedido y dirección; {codigo}')

        # ---------- Historial + Repetir pedido ----------
        page.goto(BASE + '#/cuenta/pedidos')
        expect(page.get_by_role('heading', name='Historial de pedidos')).to_be_visible()
        expect(page.get_by_text(codigo).first).to_be_visible()
        page.get_by_role('button', name='Repetir pedido').first.click()
        expect(page.get_by_role('heading', name='Carrito')).to_be_visible()
        expect(page.get_by_test_id('cart-count')).to_have_text('4')
        log('Historial + "Repetir pedido": vuelve a llenar el carrito (4 artículos)')
        page.evaluate("() => localStorage.setItem('mt_cart', '[]')")
        page.goto(BASE + '#/')
        page.reload()

        # ---------- Asistente Tiendita (modo local) ----------
        page.get_by_test_id('chat-open').click()
        expect(page.get_by_test_id('chat-panel')).to_be_visible()
        page.get_by_test_id('chat-input').fill('regalo para niña de 5 años por menos de ₡5.000')
        page.get_by_test_id('chat-input').press('Enter')
        expect(page.get_by_test_id('chat-bot').last).to_contain_text('niña de 5 años')
        cards = page.get_by_test_id('chat-product')
        expect(cards.first).to_be_visible()
        precios = [int(re.sub(r'\D', '', t.split('₡')[1].split('/')[0])) for t in cards.all_inner_texts()]
        assert precios and all(p <= 5000 for p in precios), precios
        log(f'Chat: "regalo para niña de 5 años por menos de ₡5.000" → {len(precios)} ideas, todas ≤ ₡5.000')
        page.get_by_test_id('chat-input').fill('¿cuánto cuesta el cartón de huevos?')
        page.get_by_test_id('chat-input').press('Enter')
        expect(page.get_by_test_id('chat-bot').last).to_contain_text('₡2.500')
        page.get_by_role('button', name='Agregar Huevos Granja Palmital — cartón de 30 al carrito desde el chat').last.click()
        expect(page.get_by_test_id('cart-count')).to_have_text('1')
        log('Chat: precio del cartón de huevos (₡2.500) y "Agregar" desde el chat')
        page.get_by_test_id('chat-input').fill('hacen envíos a san isidro?')
        page.get_by_test_id('chat-input').press('Enter')
        expect(page.get_by_test_id('chat-bot').last).to_contain_text('Envío gratis en San Isidro')
        page.get_by_test_id('chat-input').fill('cómo va mi pedido')
        page.get_by_test_id('chat-input').press('Enter')
        expect(page.get_by_test_id('chat-bot').last).to_contain_text(codigo)
        log('Chat: envío (San Isidro gratis) y estado de "mi pedido" ' + codigo)
        page.get_by_test_id('chat-input').fill('audífonos baratos')
        page.get_by_test_id('chat-input').press('Enter')
        expect(page.get_by_test_id('chat-bot').last).to_contain_text('audifonos')
        page.wait_for_timeout(1200)
        shot(page, 'v3-chat.png')
        page.get_by_role('button', name='Cerrar asistente').click()
        page.goto(BASE + '#/cuenta')
        page.get_by_role('button', name='Cerrar sesión').click()

        # ---------- Admin ----------
        page.evaluate(f"() => {{ const o = JSON.parse(localStorage.getItem('mt_demo_orders')); localStorage.setItem('mt_demo_orders', JSON.stringify([...o, ...{json.dumps(pedidos_demo())}])) }}")
        page.goto(BASE + '#/entrar?next=/admin')
        page.locator('input[name=email]').fill('admin@tiendita.demo')
        page.locator('input[name=password]').fill('demo1234')
        page.locator('form').get_by_role('button', name='Entrar').click()
        expect(page.get_by_test_id('admin-orders')).to_contain_text(codigo)
        page.get_by_label('Cambiar estado').first.select_option('confirmado')
        expect(page.get_by_test_id('admin-orders')).to_contain_text('confirmado')
        log('Admin ve el pedido y lo pasa a "confirmado"')
        with page.expect_download() as dl:
            page.get_by_role('button', name='⬇️ Exportar CSV').click()
        csv = open(dl.value.path(), encoding='utf-8-sig').read()
        assert 'María Prueba Mora' in csv and '1,5 kg Queso' in csv and '9.3735' in csv
        log('CSV de pedidos exportado con lat/lng (%d líneas)' % len(csv.strip().splitlines()))

        # Mapa del día + ruta por cercanía
        page.get_by_role('tab', name='🗺️ Mapa').click()
        expect(page.get_by_test_id('mapa-resumen')).to_contain_text('5 con pin')
        expect(page.get_by_test_id('ruta-orden').locator('li')).to_have_count(4)  # 5 de hoy menos 1 entregado
        primero = page.get_by_test_id('ruta-orden').locator('li').first.inner_text()
        assert 'Ana Solís' in primero, primero  # la más cercana a la tienda (Palmital)
        expect(page.get_by_test_id('ruta-gmaps')).to_have_attribute('href', re.compile(r'google\.com/maps/dir/.*waypoints'))
        esperar_tiles(page, '[data-testid=mapa-admin]')
        page.wait_for_timeout(600)
        shot(page, 'v3-admin-mapa.png')
        log('Admin mapa: 5 pins por estado, ruta nearest-neighbor de 4 paradas (1.ª: Ana Solís, Palmital) + enlace Google Maps')

        page.get_by_role('tab', name='Ruta del día').click()
        fecha = stored['fecha']
        page.locator('input[type=date]').fill(fecha)
        expect(page.get_by_text('📍 San Isidro de El General (centro)')).to_be_visible()
        log('Ruta del día agrupada por zona (' + fecha + ')')

        # Clientes
        page.get_by_role('tab', name='Clientes').click()
        expect(page.get_by_test_id('clientes-lista')).to_contain_text('María Prueba Mora')
        page.get_by_test_id('clientes-lista').get_by_text('María Prueba Mora').click()
        expect(page.get_by_test_id('ficha-cliente')).to_contain_text(codigo)
        expect(page.get_by_test_id('ficha-cliente')).to_contain_text('Última ubicación')
        page.get_by_label('Notas del cliente').fill('Prefiere entrega en la mañana')
        page.get_by_role('button', name='Guardar nota').click()
        expect(page.get_by_role('button', name='Guardado ✓')).to_be_visible()
        notas = page.evaluate("() => localStorage.getItem('mt_demo_notas')")
        assert 'Prefiere entrega' in notas
        log('Ficha de cliente: pedidos, total gastado ' + page.get_by_test_id('total-gastado').inner_text() + ', última ubicación y nota guardada')

        # Reportes
        page.get_by_role('tab', name='Reportes').click()
        expect(page.get_by_test_id('rep-productos')).to_contain_text('Queso')
        expect(page.get_by_test_id('rep-zonas')).to_contain_text('San Isidro')
        page.wait_for_timeout(400)
        shot(page, 'v3-admin-reportes.png')
        log('Reportes: ventas ' + page.get_by_test_id('rep-total').inner_text() + ' (14 días), productos top y zonas top')

        # Asistente admin
        page.get_by_role('tab', name='🤖 Asistente').click()
        page.get_by_role('button', name='¿Qué hay que pedir a S&F hoy?').click()
        expect(page.get_by_test_id('admin-chat')).to_contain_text('Pedir a S&F')
        expect(page.get_by_test_id('admin-chat')).to_contain_text('Medias navideñas')
        log('Asistente admin: "¿Qué hay que pedir a S&F hoy?" resume lo bajo pedido sin encargar')

        # Productos ocultos -> reactivar uno
        page.get_by_role('tab', name='Productos').click()
        page.get_by_label('Visibilidad').select_option('ocultos')
        expect(page.get_by_test_id('admin-prod-count')).to_contain_text('ocultos')
        log('Admin productos: ' + page.get_by_test_id('admin-prod-count').inner_text())
        page.get_by_placeholder('Buscar producto…').fill('labubu')
        page.wait_for_timeout(300)
        card = page.locator('div.rounded-2xl', has=page.locator('input[value="Vaso labubu"]')).first
        card.get_by_label('Ocultar').uncheck()
        card.get_by_role('button', name='Guardar').click()
        expect(page.get_by_test_id('admin-prod-count')).to_contain_text('188 ocultos')
        page.goto(BASE + '#/catalogo?q=vaso labubu')
        expect(page.get_by_test_id('result-count')).to_have_text('1 productos')
        log('Reactivar desde admin: "Vaso labubu" vuelve a verse en el catálogo')
        page.evaluate("() => { const o = JSON.parse(localStorage.getItem('mt_demo_overrides')); for (const k in o) o[k].oculto = true; localStorage.setItem('mt_demo_overrides', JSON.stringify(o)) }")

        # Modo oscuro
        page.goto(BASE + '#/')
        page.get_by_role('button', name='Activar modo oscuro').click()
        assert page.evaluate("document.documentElement.classList.contains('dark')")
        page.wait_for_timeout(800)
        shot(page, 'v3-inicio-oscuro.png')
        page.get_by_role('button', name='Activar modo claro').click()
        log('Modo oscuro: alterna y se recuerda')

        # ---------- Escritorio 1440x900 ----------
        d = b.new_context(viewport={'width': 1440, 'height': 900}, locale='es-CR', timezone_id='America/Costa_Rica', service_workers='block', color_scheme='light')
        dp = d.new_page()
        dp.on('pageerror', lambda e: errors.append(str(e)))
        dp.goto(BASE)
        expect(dp.get_by_test_id('banner-navidad')).to_be_visible()
        dp.wait_for_timeout(1800)
        dp.screenshot(path=os.path.join(SHOTS, 'v3-escritorio-inicio.png'))
        log('Captura de escritorio 1440x900')
        b.close()
finally:
    srv.terminate()

if errors:
    print('ERRORES JS:', errors); sys.exit(1)
print('TODO OK')
