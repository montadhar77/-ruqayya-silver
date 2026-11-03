"""Stage 7 in the browser: photos uploaded from the dashboard are stored in three sizes
without hidden metadata (GPS), the shop serves the right size, and unused files can be cleaned."""
import io
import time
from pathlib import Path

from PIL import Image

import harness
import stack
from test_admin import login, logged_in

P_TURQ = "6c96ae41-cd0b-40d5-bb79-79e309025b72"


def until(page, js, timeout=15.0):
    end = time.time() + timeout
    while time.time() < end:
        if page.evaluate(f"() => !!({js})"):
            return
        time.sleep(0.1)
    raise AssertionError(f"timed out waiting for: {js}")


def photo_with_gps(path: Path, w=3000, h=2000):
    img = Image.new("RGB", (w, h), (180, 160, 120))
    for x in range(0, w, 50):
        for y in range(0, h, 400):
            img.putpixel((x, y), (20, 90, 60))
    exif = Image.Exif()
    exif[0x010F] = "PhoneMaker"                       # Make
    gps = {1: "N", 2: (32.0, 36.0, 59.0), 3: "E", 4: (44.0, 1.0, 30.0)}   # Karbala-ish
    exif[0x8825] = gps
    img.save(path, "JPEG", quality=92, exif=exif.tobytes())
    assert Image.open(path).getexif().get(0x8825)      # the test photo really carries GPS
    return path


def test_upload_makes_three_sizes_without_gps_and_shop_uses_them(tab, stk, tmp_path):
    src = photo_with_gps(tmp_path / "ring.jpg")
    t = tab()
    login(t, stk, path="#/products")
    logged_in(t)
    t.page.wait_for_selector(f"[data-pid='{P_TURQ}'] [data-act=edit]")
    t.page.click(f"[data-pid='{P_TURQ}'] [data-act=edit]")
    t.page.wait_for_selector("#imgIn", state="attached")
    t.page.set_input_files("#imgIn", str(src))
    try:
        until(t.page, "document.querySelectorAll('#pImgs .img-item img').length >= 1 && !document.querySelector('#pImgs .uploading')")
    except AssertionError:
        raise AssertionError("upload did not finish; toast: " + t.page.inner_text("#toast") + " errors: " + repr(t.errors))
    t.page.click("#pSave")
    t.page.wait_for_selector("text=تم حفظ التعديلات", timeout=10000)
    url = harness.admin_sql(stk["db"], "select images[array_length(images, 1)] from public.products where id = %s", (P_TURQ,))[0][0]
    assert url.endswith(".v.webp"), url
    name = url.split("/object/public/media/")[1]
    sizes = {}
    for suffix, limit in (("", 1800), ("-1080", 1080), ("-480", 480)):
        f = stack.STORE / "media" / name.replace(".v.webp", f".v{suffix}.webp")
        assert f.is_file(), f
        im = Image.open(io.BytesIO(f.read_bytes()))
        assert im.format == "WEBP" and max(im.size) == limit, (f.name, im.size)
        assert not im.getexif().get(0x8825) and not im.info.get("exif"), "GPS / EXIF must be removed"
        sizes[limit] = f.stat().st_size
    assert sizes[480] < sizes[1080] < sizes[1800] < src.stat().st_size
    assert harness.admin_sql(stk["db"], "select count(*) from storage.objects where bucket_id = 'media' and name like %s",
                             (name.replace(".v.webp", "") + "%",))[0][0] == 3

    # storefront: product page and cards use srcset with the right sizes
    s = tab(width=390, height=844)
    s.page.goto(f"{stk['site']}/index.html#/p/{P_TURQ}")
    s.page.wait_for_selector("#gMain img")
    imgs = s.page.evaluate("() => Array.from(document.querySelectorAll('#gMain img, .g-thumbs img')).map(i => ({src: i.getAttribute('src'), srcset: i.getAttribute('srcset') || ''}))")
    main = [i for i in imgs if name.replace(".v.webp", "") in (i["src"] + i["srcset"])]
    assert any("-480.webp 480w" in i["srcset"] and "1800w" in i["srcset"] for i in main), imgs
    s.page.click("#addBtn")
    s.page.click("#cartBtn")
    s.page.wait_for_selector(".c-item img")
    assert s.page.get_attribute(".c-item img", "src").endswith(".v-480.webp"), "cart uses the small size"
    s.page.keyboard.press("Escape")
    s.page.goto(f"{stk['site']}/index.html#/shop")
    s.page.wait_for_selector(".card img.main")
    loaded = s.page.evaluate(f"() => Array.from(document.querySelectorAll('.card img')).filter(i => (i.currentSrc || '').includes('{name.split('/')[-1].replace('.v.webp', '')}')).map(i => i.currentSrc)")
    assert loaded and all("-480.webp" in u or "-1080.webp" in u for u in loaded), loaded   # never the 1800 px original on a phone
    assert not s.errors and not t.errors, (s.errors, t.errors)


def test_unused_files_are_found_and_removed(tab, stk):
    db = stk["db"]
    # an old file nothing refers to (+ its sizes), and an old file that IS used (the logo)
    for n in ("hero/old.v.webp", "hero/old.v-1080.webp", "hero/old.v-480.webp"):
        f = stack.STORE / "media" / n
        f.parent.mkdir(parents=True, exist_ok=True)
        f.write_bytes(b"x" * 100)
        harness.admin_sql(db, "insert into storage.objects (bucket_id, name, metadata, created_at) values ('media', %s, '{\"size\": 100}', now() - interval '3 days') on conflict do nothing", (n,))
    t = tab()
    login(t, stk, path="#/account")
    logged_in(t)
    t.page.wait_for_selector("#mediaScan")
    t.page.click("#mediaScan")
    t.page.wait_for_selector("#mediaClean:not([hidden])")
    assert "٣" in t.page.inner_text("#mediaClean")
    t.page.click("#mediaClean")
    t.page.click("#cOk")
    t.page.wait_for_selector("text=تم التنظيف ✓", timeout=10000)
    assert not (stack.STORE / "media" / "hero" / "old.v.webp").exists()
    assert harness.admin_sql(db, "select count(*) from storage.objects where name like 'hero/old%%'")[0][0] == 0
    assert not t.errors, t.errors
