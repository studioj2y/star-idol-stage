import os
import sys
import io
import re
import zipfile
import struct
from typing import List, Dict, Tuple, Optional, Callable

def parse_ion_string(data: bytes) -> str:
    i = 0
    while i < len(data) and data[i] in (2, 0xb3):
        i += 1
    if i >= len(data): return ''
    while i < len(data):
        if (data[i] >> 4) == 8:
            descriptor = data[i]
            length = descriptor & 0x0F
            i += 1
            break
        i += 1
    else:
        return ''
        
    if length == 0x0E:
        length = 0
        while i < len(data):
            b = data[i]
            i += 1
            length = (length << 7) | (b & 0x7F)
            if b & 0x80:
                break
    str_bytes = data[i : i + length]
    return str_bytes.decode('utf-8', errors='ignore').strip()

def get_kfx_meta(fpath: str) -> Tuple[str, str]:
    """Extract book title and author from KFX metadata."""
    try:
        with open(fpath, 'rb') as f:
            f.seek(0, 2)
            sz = f.tell()
            f.seek(max(0, sz - 512 * 1024))
            tail = f.read()
            
        header_idx = tail.find(b'kindle_title_metadata')
        if header_idx == -1:
            with open(fpath, 'rb') as f:
                full = f.read()
            header_idx = full.find(b'kindle_title_metadata')
            if header_idx == -1:
                return '', ''
            meta_block = full[header_idx + len(b'kindle_title_metadata') : header_idx + 2048]
        else:
            meta_block = tail[header_idx + len(b'kindle_title_metadata') : header_idx + 2048]
        
        title = ''
        author = ''
        
        t_idx = meta_block.find(b'title')
        if t_idx != -1:
            title = parse_ion_string(meta_block[t_idx + 5 : t_idx + 200])
            
        a_idx = meta_block.find(b'author')
        if a_idx != -1:
            author = parse_ion_string(meta_block[a_idx + 6 : a_idx + 200])
            
        return title.strip(), author.strip()
    except Exception:
        return '', ''

def format_book_filename(title: str, author: str, default_basename: str) -> str:
    """Format filename as 'Title_Volume_Author' based on extracted metadata."""
    title = title.strip()
    author = author.strip()
    if not title and not author:
        return default_basename

    def sanitize(s):
        s = re.sub(r'[\\/:*?"<>|]+', '_', s)
        return s.strip(' ._')

    author = sanitize(author)

    # Check if title contains volume separator, e.g. "火之鳥(複刻版) - 卷06" or "航海王 - 第01卷"
    vol_match = re.search(r'^(.*?)\s*[-_—]\s*([卷第VolVOLvV\d]+.*)$', title, re.IGNORECASE)
    if not vol_match:
        vol_match = re.search(r'^(.*?)\s+([卷第VolVOLvV][\d\w\(\)（）]+)$', title, re.IGNORECASE)

    if vol_match:
        book_name = sanitize(vol_match.group(1))
        volume = sanitize(vol_match.group(2))
        parts = [book_name, volume]
        if author:
            parts.append(author)
        return "_".join(p for p in parts if p)
    else:
        book_name = sanitize(title)
        parts = [book_name]
        if author:
            parts.append(author)
        return "_".join(p for p in parts if p)

def get_unique_filepath(filepath: str) -> str:
    """
    Ensure the target file or directory path does not overwrite an existing file.
    If 'D:/Output/Book.azw3' exists, returns 'D:/Output/Book (1).azw3'.
    If 'D:/Output/Book (1).azw3' exists, returns 'D:/Output/Book (2).azw3', etc.
    """
    if not os.path.exists(filepath):
        return filepath

    dir_name, base_name = os.path.split(filepath)
    name, ext = os.path.splitext(base_name)
    counter = 1
    while True:
        new_name = f"{name} ({counter}){ext}"
        new_path = os.path.join(dir_name, new_name)
        if not os.path.exists(new_path):
            return new_path
        counter += 1

def get_epub_meta(epub_path: str) -> Tuple[str, str]:
    """Extract title and author from EPUB container."""
    import xml.etree.ElementTree as ET
    title = ""
    author = ""
    try:
        with zipfile.ZipFile(epub_path, 'r') as zf:
            if 'META-INF/container.xml' in zf.namelist():
                container_data = zf.read('META-INF/container.xml')
                root = ET.fromstring(container_data)
                opf_path = ''
                for rf in root.iter('{urn:oasis:names:tc:opendocument:xmlns:container}rootfile'):
                    opf_path = rf.attrib.get('full-path', '')
                    break
                if opf_path and opf_path in zf.namelist():
                    opf_data = zf.read(opf_path)
                    opf_root = ET.fromstring(opf_data)
                    ns = {'dc': 'http://purl.org/dc/elements/1.1/'}
                    t_el = opf_root.find('.//dc:title', ns)
                    if t_el is not None and t_el.text:
                        title = t_el.text.strip()
                    c_el = opf_root.find('.//dc:creator', ns)
                    if c_el is not None and c_el.text:
                        author = c_el.text.strip()
    except Exception:
        pass
    return title, author

def extract_images_from_epub(epub_path: str, progress_callback: Optional[Callable[[str], None]] = None) -> List[bytes]:
    """Extract images from EPUB in manifest/reading order."""
    import xml.etree.ElementTree as ET
    if progress_callback:
        progress_callback("正在读取 EPUB 图片资源...")

    images = []
    try:
        with zipfile.ZipFile(epub_path, 'r') as zf:
            names = zf.namelist()
            opf_path = ''
            if 'META-INF/container.xml' in names:
                root = ET.fromstring(zf.read('META-INF/container.xml'))
                for rf in root.iter('{urn:oasis:names:tc:opendocument:xmlns:container}rootfile'):
                    opf_path = rf.attrib.get('full-path', '')
                    break
            
            img_order = []
            if opf_path and opf_path in names:
                opf_dir = os.path.dirname(opf_path)
                opf_root = ET.fromstring(zf.read(opf_path))
                manifest = {}
                for item in (opf_root.iter('{http://www.idpf.org/2007/opf}item') or opf_root.iter('item')):
                    i_id = item.attrib.get('id')
                    i_href = item.attrib.get('href')
                    if i_id and i_href:
                        full_img_p = f"{opf_dir}/{i_href}" if opf_dir else i_href
                        manifest[i_id] = full_img_p.replace('\\', '/')

                manifest_imgs = [href for i_id, href in manifest.items() if href.lower().endswith(('.jpg', '.jpeg', '.png', '.webp', '.gif'))]
                if manifest_imgs:
                    img_order = manifest_imgs

            if not img_order:
                img_order = [n for n in names if n.lower().endswith(('.jpg', '.jpeg', '.png', '.webp', '.gif'))]
                img_order.sort()

            total = len(img_order)
            for idx, iname in enumerate(img_order, 1):
                if iname in names:
                    images.append(zf.read(iname))
                if progress_callback and (idx % 20 == 0 or idx == total):
                    progress_callback(f"提取图片: {idx}/{total}")
    except Exception as e:
        raise RuntimeError(f"解析 EPUB 失败: {e}")

    if not images:
        raise ValueError("该 EPUB 文件中未包含图片资源（若为纯文字电子书，请直接转为 AZW3 或保持 EPUB）。")
    return images

def get_mobi_meta_and_images(mobi_path: str, progress_callback: Optional[Callable[[str], None]] = None) -> Tuple[str, str, List[bytes]]:
    """Extract title, author and image pages from a MOBI file."""
    if progress_callback:
        progress_callback("正在读取 MOBI 文件...")

    with open(mobi_path, 'rb') as f:
        data = f.read()

    if len(data) < 78:
        raise ValueError("文件过小或并非有效的 MOBI 电子书。")

    num_records, = struct.unpack('>H', data[76:78])
    record_offsets = []
    for i in range(num_records):
        off, = struct.unpack('>I', data[78 + i*8 : 82 + i*8])
        record_offsets.append(off)
    record_offsets.append(len(data))

    title = ""
    author = ""

    rec0 = data[record_offsets[0] : record_offsets[1]]
    if len(rec0) > 20 and rec0[16:20] == b'MOBI':
        fn_off, fn_len = struct.unpack('>II', rec0[84:92])
        if fn_off + fn_len <= len(rec0):
            title = rec0[fn_off : fn_off + fn_len].decode('utf-8', errors='ignore')
        
        exth_idx = rec0.find(b'EXTH')
        if exth_idx != -1:
            try:
                cnt, = struct.unpack('>I', rec0[exth_idx+8 : exth_idx+12])
                pos = exth_idx + 12
                for _ in range(cnt):
                    tag, length = struct.unpack('>II', rec0[pos : pos+8])
                    val = rec0[pos+8 : pos+length]
                    if tag == 100: # Author
                        author = val.decode('utf-8', errors='ignore')
                    elif tag == 503 and not title: # Title
                        title = val.decode('utf-8', errors='ignore')
                    pos += length
            except Exception:
                pass

    if progress_callback:
        progress_callback("正在从 MOBI 中提取图片...")

    images = []
    for i in range(1, num_records):
        r_bytes = data[record_offsets[i] : record_offsets[i+1]]
        if r_bytes.startswith(b'\xff\xd8\xff') or r_bytes.startswith(b'\x89PNG'):
            images.append(r_bytes)

    return title.strip(), author.strip(), images

def find_cjpeg() -> Optional[str]:
    """Find cjpeg.exe (MozJPEG) binary path if available."""
    from shutil import which
    base_dirs = [
        os.path.dirname(sys.executable) if getattr(sys, 'frozen', False) else None,
        os.path.dirname(os.path.abspath(__file__)),
        os.getcwd(),
        getattr(sys, '_MEIPASS', None)
    ]
    for b in base_dirs:
        if b:
            p = os.path.join(b, 'cjpeg.exe')
            if os.path.exists(p):
                return p
    w = which('cjpeg')
    if w and os.path.exists(w):
        return w
    return None

def find_cjpegli() -> Optional[str]:
    """Find cjpegli.exe (Google Jpegli) binary path if available."""
    from shutil import which
    base_dirs = [
        os.path.dirname(sys.executable) if getattr(sys, 'frozen', False) else None,
        os.path.dirname(os.path.abspath(__file__)),
        os.getcwd(),
        getattr(sys, '_MEIPASS', None)
    ]
    for b in base_dirs:
        if b:
            p = os.path.join(b, 'cjpegli.exe')
            if os.path.exists(p):
                return p
    w = which('cjpegli')
    if w and os.path.exists(w):
        return w
    return None

def optimize_single_image(
    img_data: bytes, 
    engine: str = "jpegli",
    quality: int = 75,
    scale_mode: str = "100%",
    auto_grayscale: bool = True,
    bleach_paper: bool = True,
    auto_levels: bool = True,
    temp_dir: Optional[str] = None
) -> bytes:
    """
    Optimize an image buffer using Google Jpegli, MozJPEG (cjpeg.exe) or Pillow fallback.
    Pipeline order:
      1. Auto Grayscale Detection (monochrome manga pages to 8-bit Gray L)
      2. Unified Paper Bleach & Auto-Levels Contrast Expansion (at original full resolution)
      3. High-Quality Lanczos Downsampling (as the final image manipulation step)
      4. Advanced Compression (Jpegli / MozJPEG Trellis)
    """
    import subprocess
    from PIL import Image, ImageStat

    orig_len = len(img_data)
    if orig_len == 0:
        return img_data

    try:
        im = Image.open(io.BytesIO(img_data))
        
        # Preserve alpha channels if PNG
        if im.mode in ('RGBA', 'LA') or (im.mode == 'P' and 'transparency' in im.info):
            buf = io.BytesIO()
            im.save(buf, format='PNG', optimize=True)
            res = buf.getvalue()
            return res if len(res) < orig_len else img_data

        # 1. Auto Grayscale Detection (on original full-res)
        is_gray = (im.mode == 'L')
        if auto_grayscale and im.mode == 'RGB':
            thumb = im.resize((80, 80), Image.Resampling.BILINEAR)
            _, s, _ = thumb.convert('HSV').split()
            # If average saturation is below 60, it's a monochrome manga page with aged paper tint
            if ImageStat.Stat(s).mean[0] < 60.0:
                im = im.convert('L')
                is_gray = True
        elif im.mode == 'RGB':
            is_gray = False
        else:
            is_gray = (im.mode == 'L')

        # 2. Unified Auto-Levels & Paper Bleaching (on original full-res BEFORE scaling)
        # This enhances low-contrast faded ink lines and clips dirty paper background
        if is_gray and (auto_levels or bleach_paper):
            hist = im.histogram()
            total_px = sum(hist)
            
            # Detect black point (0.5% deepest shadows) to avoid washed-out faint ink
            p_low = 0
            if auto_levels:
                acc = 0
                for i, c in enumerate(hist):
                    acc += c
                    if acc >= total_px * 0.005:
                        p_low = i
                        break
            
            # Detect white point (bleach paper background noise)
            p_high = 255
            if bleach_paper:
                p_high = 228
            elif auto_levels:
                acc = 0
                for i in range(255, -1, -1):
                    acc += hist[i]
                    if acc >= total_px * 0.015:
                        p_high = i
                        break

            if p_high > p_low:
                # Single-pass LUT to avoid posterization / banding
                lut = []
                for i in range(256):
                    if i <= p_low:
                        lut.append(0)
                    elif i >= p_high:
                        lut.append(255)
                    else:
                        val = (i - p_low) / (p_high - p_low)
                        lut.append(int(val * 255 + 0.5))
                im = im.point(lut)

        # 3. Resolution Scaling (THE LAST IMAGE PROCESSING STEP before encoding)
        # Lanczos downsampling now acts on the enhanced image, providing smooth anti-aliased edges
        w, h = im.size
        scaled = False
        if scale_mode == "85%":
            new_w, new_h = max(1, int(w * 0.85)), max(1, int(h * 0.85))
            im = im.resize((new_w, new_h), Image.Resampling.LANCZOS)
            scaled = True
        elif scale_mode == "75%":
            new_w, new_h = max(1, int(w * 0.75)), max(1, int(h * 0.75))
            im = im.resize((new_w, new_h), Image.Resampling.LANCZOS)
            scaled = True
        elif scale_mode == "65%":
            new_w, new_h = max(1, int(w * 0.65)), max(1, int(h * 0.65))
            im = im.resize((new_w, new_h), Image.Resampling.LANCZOS)
            scaled = True
        elif "1440" in scale_mode:
            if h > 1440:
                ratio = 1440.0 / h
                im = im.resize((max(1, int(w * ratio)), 1440), Image.Resampling.LANCZOS)
                scaled = True
        elif "1200" in scale_mode:
            if h > 1200:
                ratio = 1200.0 / h
                im = im.resize((max(1, int(w * ratio)), 1200), Image.Resampling.LANCZOS)
                scaled = True

        # 4. Compression Engine Execution
        # 4a. Jpegli Engine (Google 2024 - Butteraugli + 10-bit internal precision + AVX2 SIMD)
        if engine == "jpegli":
            cjpegli_bin = find_cjpegli()
            if cjpegli_bin:
                import tempfile
                created_temp = False
                cur_td = temp_dir
                if not cur_td:
                    cur_td = tempfile.mkdtemp(prefix="jpegli_")
                    created_temp = True
                tmp_in = os.path.join(cur_td, f"in_{os.getpid()}_{id(img_data)}.ppm")
                tmp_out = os.path.join(cur_td, f"out_{os.getpid()}_{id(img_data)}.jpg")
                try:
                    im.save(tmp_in, format='PPM')
                    cmd = [cjpegli_bin, tmp_in, tmp_out, '-q', str(quality), '--quiet']
                    startupinfo = None
                    if sys.platform == 'win32':
                        startupinfo = subprocess.STARTUPINFO()
                        startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW

                    proc = subprocess.run(
                        cmd,
                        stdout=subprocess.PIPE,
                        stderr=subprocess.PIPE,
                        startupinfo=startupinfo
                    )
                    if proc.returncode == 0 and os.path.exists(tmp_out):
                        with open(tmp_out, 'rb') as f:
                            out_data = f.read()
                        if len(out_data) > 0:
                            if scaled or is_gray or auto_levels or bleach_paper or len(out_data) < orig_len:
                                return out_data
                            return img_data
                finally:
                    if os.path.exists(tmp_in):
                        try: os.remove(tmp_in)
                        except Exception: pass
                    if os.path.exists(tmp_out):
                        try: os.remove(tmp_out)
                        except Exception: pass
                    if created_temp:
                        import shutil
                        try: shutil.rmtree(cur_td, ignore_errors=True)
                        except Exception: pass

        # 4b. MozJPEG Engine (cjpeg.exe with Trellis optimization)
        cjpeg_bin = find_cjpeg()
        if cjpeg_bin:
            ppm_buf = io.BytesIO()
            im.save(ppm_buf, format='PPM')
            ppm_bytes = ppm_buf.getvalue()

            cmd = [cjpeg_bin, '-quality', str(quality), '-quant-table', '2', '-optimize']
            if is_gray or im.mode == 'L':
                cmd.append('-grayscale')

            startupinfo = None
            if sys.platform == 'win32':
                startupinfo = subprocess.STARTUPINFO()
                startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW

            proc = subprocess.run(
                cmd,
                input=ppm_bytes,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                startupinfo=startupinfo
            )
            if proc.returncode == 0 and len(proc.stdout) > 0:
                if scaled or is_gray or auto_levels or bleach_paper or len(proc.stdout) < orig_len:
                    return proc.stdout
                return img_data

        # 4c. Fallback to Pillow
        if not is_gray and im.mode not in ('RGB', 'L'):
            im = im.convert('RGB')
        buf = io.BytesIO()
        im.save(buf, format='JPEG', quality=quality, optimize=True, progressive=True)
        res = buf.getvalue()
        try:
            import mozjpeg_lossless_optimization
            res = mozjpeg_lossless_optimization.optimize(res)
        except Exception:
            pass
        if scaled or is_gray or auto_levels or bleach_paper or len(res) < orig_len:
            return res
    except Exception:
        pass

    return img_data

def optimize_image_list(
    pages: List[bytes], 
    engine: str = "jpegli",
    quality: int = 75,
    scale_mode: str = "100%",
    auto_grayscale: bool = True,
    bleach_paper: bool = True,
    auto_levels: bool = True,
    progress_callback: Optional[Callable[[str], None]] = None
) -> Tuple[List[bytes], int, int]:
    """
    Optimize image byte buffers in place.
    Returns (optimized_pages, orig_total_size, opt_total_size).
    """
    import tempfile
    import shutil

    total = len(pages)
    optimized_pages = []
    orig_total_size = sum(len(p) for p in pages)
    engine_label = "Jpegli" if engine == "jpegli" else "MozJPEG"

    shared_temp_dir = tempfile.mkdtemp(prefix="opt_pages_")
    try:
        for idx, page_data in enumerate(pages, start=1):
            opt = optimize_single_image(
                page_data, 
                engine=engine,
                quality=quality,
                scale_mode=scale_mode,
                auto_grayscale=auto_grayscale,
                bleach_paper=bleach_paper,
                auto_levels=auto_levels,
                temp_dir=shared_temp_dir
            )
            optimized_pages.append(opt)
            if progress_callback and (idx % 15 == 0 or idx == total):
                progress_callback(f"{engine_label} 优化图片: {idx}/{total}")
    finally:
        shutil.rmtree(shared_temp_dir, ignore_errors=True)

    opt_total_size = sum(len(p) for p in optimized_pages)
    return optimized_pages, orig_total_size, opt_total_size

def compile_existing_epub_to_azw3(
    epub_path: str, 
    azw3_path: str, 
    slim_azw3: bool = True,
    progress_callback: Optional[Callable[[str], None]] = None
):
    """Compile an existing EPUB directly to AZW3 using kindlegen or calibre."""
    import subprocess
    import tempfile
    import shutil

    bin_path, bin_type = find_kindlegen_or_calibre()
    if not bin_path:
        raise RuntimeError("未找到 AZW3 转换引擎（kindlegen.exe 或 Calibre）。")

    if progress_callback:
        progress_callback("正在编译 EPUB 为 AZW3...")

    if bin_type == 'calibre':
        cmd = [bin_path, epub_path, azw3_path]
        proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if proc.returncode != 0:
            raise RuntimeError(f"Calibre 转换失败: {proc.stderr[:200]}")
    else: # kindlegen
        temp_dir = tempfile.mkdtemp(prefix="epub_azw3_")
        try:
            tmp_epub = os.path.join(temp_dir, "input.epub")
            shutil.copyfile(epub_path, tmp_epub)
            tmp_mobi = "output.mobi"
            cmd = [bin_path, tmp_epub, '-dont_append_source', '-c1', '-o', tmp_mobi]
            proc = subprocess.run(cmd, cwd=temp_dir, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            gen_mobi = os.path.join(temp_dir, tmp_mobi)
            if not os.path.exists(gen_mobi):
                raise RuntimeError(f"KindleGen 编译未生成有效输出 (退出码: {proc.returncode})")
            
            if slim_azw3:
                if progress_callback:
                    progress_callback("正在执行 KindleStrip 瘦身 (剥离冗余老副本)...")
                with open(gen_mobi, 'rb') as f:
                    mobi_bytes = f.read()
                pure_kf8 = extract_pure_kf8(mobi_bytes)
                with open(azw3_path, 'wb') as f:
                    f.write(pure_kf8)
            else:
                shutil.copyfile(gen_mobi, azw3_path)
        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)

# --- KindleStrip / Pure KF8 Extraction Engine ---
_UNIQUE_ID_SEED = 68
_NUMBER_OF_PDB_RECORDS = 76
_FIRST_PDB_RECORD = 78
_MOBI_HEADER_BASE = 16
_MOBI_HEADER_LENGTH = 20
_MOBI_VERSION = 36
_TITLE_OFFSET = 84
_FIRST_RESC_RECORD = 108
_LAST_CONTENT_INDEX = 194
_KF8_FDST_INDEX = 192
_FCIS_INDEX = 200
_FLIS_INDEX = 208
_DATP_INDEX = 256
_HUFFTBLOFF = 120

def _getint(datain: bytes, ofs: int, sz: bytes = b'L') -> int:
    i, = struct.unpack_from(b'>' + sz, datain, ofs)
    return i

def _writeint(datain: bytes, ofs: int, n: int, sz: bytes = b'L') -> bytes:
    if sz == b'L':
        return datain[:ofs] + struct.pack(b'>L', n) + datain[ofs + 4:]
    else:
        return datain[:ofs] + struct.pack(b'>H', n) + datain[ofs + 2:]

def _getsecaddr(datain: bytes, secno: int) -> Tuple[int, int]:
    nsec = _getint(datain, _NUMBER_OF_PDB_RECORDS, b'H')
    if secno < 0 or secno >= nsec:
        raise ValueError(f'secno {secno} out of range (nsec={nsec})')
    secstart = _getint(datain, _FIRST_PDB_RECORD + secno * 8)
    if secno == nsec - 1:
        secend = len(datain)
    else:
        secend = _getint(datain, _FIRST_PDB_RECORD + (secno + 1) * 8)
    return secstart, secend

def _readsection(datain: bytes, secno: int) -> bytes:
    secstart, secend = _getsecaddr(datain, secno)
    return datain[secstart:secend]

def _deletesectionrange(datain: bytes, firstsec: int, lastsec: int) -> bytes:
    datalst = []
    firstsecstart, _ = _getsecaddr(datain, firstsec)
    _, lastsecend = _getsecaddr(datain, lastsec)
    zerosecstart, _ = _getsecaddr(datain, 0)
    dif = lastsecend - firstsecstart + 8 * (lastsec - firstsec + 1)
    nsec = _getint(datain, _NUMBER_OF_PDB_RECORDS, b'H')
    datalst.append(datain[:_UNIQUE_ID_SEED])
    datalst.append(struct.pack(b'>L', 2 * (nsec - (lastsec - firstsec + 1)) + 1))
    datalst.append(datain[_UNIQUE_ID_SEED + 4:_NUMBER_OF_PDB_RECORDS])
    datalst.append(struct.pack(b'>H', nsec - (lastsec - firstsec + 1)))
    newstart = zerosecstart - 8 * (lastsec - firstsec + 1)
    for i in range(0, firstsec):
        ofs, flgval = struct.unpack_from(b'>2L', datain, _FIRST_PDB_RECORD + i * 8)
        ofs = ofs - 8 * (lastsec - firstsec + 1)
        datalst.append(struct.pack(b'>L', ofs) + struct.pack(b'>L', flgval))
    for i in range(lastsec + 1, nsec):
        ofs, flgval = struct.unpack_from(b'>2L', datain, _FIRST_PDB_RECORD + i * 8)
        ofs = ofs - dif
        flgval = 2 * (i - (lastsec - firstsec + 1))
        datalst.append(struct.pack(b'>L', ofs) + struct.pack(b'>L', flgval))
    lpad = newstart - (_FIRST_PDB_RECORD + 8 * (nsec - (lastsec - firstsec + 1)))
    if lpad > 0:
        datalst.append(b'\0' * lpad)
    datalst.append(datain[zerosecstart:firstsecstart])
    datalst.append(datain[lastsecend:])
    return b''.join(datalst)

def _insertsectionrange(sectionsource: bytes, firstsec: int, lastsec: int, sectiontarget: bytes, targetsec: int) -> bytes:
    datalst = []
    nsec = _getint(sectiontarget, _NUMBER_OF_PDB_RECORDS, b'H')
    zerosecstart, _ = _getsecaddr(sectiontarget, 0)
    insstart, _ = _getsecaddr(sectiontarget, targetsec)
    nins = lastsec - firstsec + 1
    srcstart, _ = _getsecaddr(sectionsource, firstsec)
    _, srcend = _getsecaddr(sectionsource, lastsec)
    newstart = zerosecstart + 8 * nins

    datalst.append(sectiontarget[:_UNIQUE_ID_SEED])
    datalst.append(struct.pack(b'>L', 2 * (nsec + nins) + 1))
    datalst.append(sectiontarget[_UNIQUE_ID_SEED + 4:_NUMBER_OF_PDB_RECORDS])
    datalst.append(struct.pack(b'>H', nsec + nins))
    for i in range(0, targetsec):
        ofs, flgval = struct.unpack_from(b'>2L', sectiontarget, _FIRST_PDB_RECORD + i * 8)
        ofsnew = ofs + 8 * nins
        datalst.append(struct.pack(b'>L', ofsnew) + struct.pack(b'>L', flgval))
    srcstart0, _ = _getsecaddr(sectionsource, firstsec)
    for i in range(nins):
        isrcstart, _ = _getsecaddr(sectionsource, firstsec + i)
        ofsnew = insstart + (isrcstart - srcstart0) + 8 * nins
        flgvalnew = 2 * (targetsec + i)
        datalst.append(struct.pack(b'>L', ofsnew) + struct.pack(b'>L', flgvalnew))
    dif = srcend - srcstart
    for i in range(targetsec, nsec):
        ofs, flgval = struct.unpack_from(b'>2L', sectiontarget, _FIRST_PDB_RECORD + i * 8)
        ofsnew = ofs + dif + 8 * nins
        flgvalnew = 2 * (i + nins)
        datalst.append(struct.pack(b'>L', ofsnew) + struct.pack(b'>L', flgvalnew))
    lpad = newstart - (_FIRST_PDB_RECORD + 8 * (nsec + nins))
    if lpad > 0:
        datalst.append(b'\0' * lpad)
    datalst.append(sectiontarget[zerosecstart:insstart])
    datalst.append(sectionsource[srcstart:srcend])
    datalst.append(sectiontarget[insstart:])
    return b''.join(datalst)

def _writesection(datain: bytes, secno: int, secdata: bytes) -> bytes:
    datalst = []
    nsec = _getint(datain, _NUMBER_OF_PDB_RECORDS, b'H')
    zerosecstart, _ = _getsecaddr(datain, 0)
    secstart, secend = _getsecaddr(datain, secno)
    dif = len(secdata) - (secend - secstart)
    datalst.append(datain[:_UNIQUE_ID_SEED])
    datalst.append(struct.pack(b'>L', 2 * nsec + 1))
    datalst.append(datain[_UNIQUE_ID_SEED + 4:_NUMBER_OF_PDB_RECORDS])
    datalst.append(struct.pack(b'>H', nsec))
    newstart = zerosecstart
    for i in range(0, secno):
        ofs, flgval = struct.unpack_from(b'>2L', datain, _FIRST_PDB_RECORD + i * 8)
        datalst.append(struct.pack(b'>L', ofs) + struct.pack(b'>L', flgval))
    datalst.append(struct.pack(b'>L', secstart) + struct.pack(b'>L', (2 * secno)))
    for i in range(secno + 1, nsec):
        ofs, flgval = struct.unpack_from(b'>2L', datain, _FIRST_PDB_RECORD + i * 8)
        ofs = ofs + dif
        datalst.append(struct.pack(b'>L', ofs) + struct.pack(b'>L', flgval))
    lpad = newstart - (_FIRST_PDB_RECORD + 8 * nsec)
    if lpad > 0:
        datalst.append(b'\0' * lpad)
    datalst.append(datain[zerosecstart:secstart])
    datalst.append(secdata)
    datalst.append(datain[secend:])
    return b''.join(datalst)

def _get_exth_params(rec0: bytes) -> Tuple[int, int, int]:
    ebase = _MOBI_HEADER_BASE + _getint(rec0, _MOBI_HEADER_LENGTH)
    elen = _getint(rec0, ebase + 4)
    enum = _getint(rec0, ebase + 8)
    return ebase, elen, enum

def _read_exth(rec0: bytes, exth_num: int) -> List[bytes]:
    exth_values = []
    ebase, elen, enum = _get_exth_params(rec0)
    ebase = ebase + 12
    while enum > 0:
        exth_id = _getint(rec0, ebase)
        if exth_id == exth_num:
            exth_values.append(rec0[ebase + 8:ebase + _getint(rec0, ebase + 4)])
        enum = enum - 1
        ebase = ebase + _getint(rec0, ebase + 4)
    return exth_values

def _write_exth(rec0: bytes, exth_num: int, exth_bytes: bytes) -> bytes:
    ebase, elen, enum = _get_exth_params(rec0)
    ebase_idx = ebase + 12
    enum_idx = enum
    while enum_idx > 0:
        exth_id = _getint(rec0, ebase_idx)
        if exth_id == exth_num:
            dif = len(exth_bytes) + 8 - _getint(rec0, ebase_idx + 4)
            newrec0 = rec0
            if dif != 0:
                newrec0 = _writeint(newrec0, _TITLE_OFFSET, _getint(newrec0, _TITLE_OFFSET) + dif)
            return newrec0[:ebase + 4] + struct.pack(b'>L', elen + len(exth_bytes) + 8 - _getint(rec0, ebase_idx + 4)) + \
                   struct.pack(b'>L', enum) + rec0[ebase + 12:ebase_idx + 4] + \
                   struct.pack(b'>L', len(exth_bytes) + 8) + exth_bytes + \
                   rec0[ebase_idx + _getint(rec0, ebase_idx + 4):]
        enum_idx = enum_idx - 1
        ebase_idx = ebase_idx + _getint(rec0, ebase_idx + 4)
    return rec0

def _del_exth(rec0: bytes, exth_num: int) -> bytes:
    ebase, elen, enum = _get_exth_params(rec0)
    ebase_idx = ebase + 12
    enum_idx = 0
    while enum_idx < enum:
        exth_id = _getint(rec0, ebase_idx)
        exth_size = _getint(rec0, ebase_idx + 4)
        if exth_id == exth_num:
            newrec0 = rec0
            newrec0 = _writeint(newrec0, _TITLE_OFFSET, _getint(newrec0, _TITLE_OFFSET) - exth_size)
            newrec0 = newrec0[:ebase_idx] + newrec0[ebase_idx + exth_size:]
            newrec0 = newrec0[0:ebase + 4] + struct.pack(b'>L', elen - exth_size) + struct.pack(b'>L', enum - 1) + newrec0[ebase + 12:]
            return newrec0
        enum_idx += 1
        ebase_idx = ebase_idx + exth_size
    return rec0

def extract_pure_kf8(datain: bytes) -> bytes:
    """
    Extract pure KF8 (AZW3) from a KindleGen combination file (MOBI 7 + KF8),
    stripping the duplicate legacy MOBI 7 layer and source archives.
    Reduces file size by ~50% with 100% lossless preservation of images and formatting.
    """
    try:
        datain_rec0 = _readsection(datain, 0)
        ver = _getint(datain_rec0, _MOBI_VERSION)
        if ver == 8:
            return datain  # already standalone kf8
        exth121 = _read_exth(datain_rec0, 121)
        if not exth121:
            return datain
        datain_kf8, = struct.unpack_from(b'>L', exth121[0], 0)
        if datain_kf8 == 0xffffffff:
            return datain
        datain_kfrec0 = _readsection(datain, datain_kf8)
        firstimage = _getint(datain_rec0, _FIRST_RESC_RECORD)
        lastimage = _getint(datain_rec0, _LAST_CONTENT_INDEX, b'H')
        if lastimage == 0xffff:
            ofs_list = [(_FCIS_INDEX, b'L'), (_FLIS_INDEX, b'L'), (_DATP_INDEX, b'L'), (_HUFFTBLOFF, b'L')]
            for ofs, sz in ofs_list:
                n = _getint(datain_rec0, ofs, sz)
                if 0 < n < lastimage:
                    lastimage = n - 1

        result_file8 = _deletesectionrange(datain, 0, datain_kf8 - 1)
        target = _getint(datain_kfrec0, _FIRST_RESC_RECORD)
        result_file8 = _insertsectionrange(datain, firstimage, lastimage, result_file8, target)
        datain_kfrec0 = _readsection(result_file8, 0)

        kf8starts = _read_exth(datain_kfrec0, 116)
        while len(kf8starts) > 1:
            kf8starts.pop()
            datain_kfrec0 = _del_exth(datain_kfrec0, 116)

        datain_kfrec0 = _write_exth(datain_kfrec0, 125, struct.pack(b'>L', lastimage - firstimage + 1))
        fval, = struct.unpack_from('>L', datain_kfrec0, 0x80)
        fval = (fval & 0x1FFF) | 0x0800
        datain_kfrec0 = datain_kfrec0[:0x80] + struct.pack(b'>L', fval) + datain_kfrec0[0x84:]

        ofs_list = [(_KF8_FDST_INDEX, b'L'), (_FCIS_INDEX, b'L'), (_FLIS_INDEX, b'L'), (_DATP_INDEX, b'L'), (_HUFFTBLOFF, b'L')]
        for ofs, sz in ofs_list:
            n = _getint(datain_kfrec0, ofs, sz)
            if n != 0xffffffff:
                datain_kfrec0 = _writeint(datain_kfrec0, ofs, n + lastimage - firstimage + 1, sz)
        result_file8 = _writesection(result_file8, 0, datain_kfrec0)
        return result_file8
    except Exception:
        # If any unexpected format anomaly occurs, gracefully fallback to original datain
        return datain

def get_jpeg_dimensions(data: bytes) -> Tuple[int, int]:
    """Extract width and height from JPEG bytes without decoding image."""
    i = 2
    length_data = len(data)
    while i < length_data:
        marker, = struct.unpack('>H', data[i:i+2])
        if marker in (0xFFC0, 0xFFC1, 0xFFC2):
            h, w = struct.unpack('>HH', data[i+5:i+9])
            return w, h
        i += 2
        if i + 2 > length_data:
            break
        length, = struct.unpack('>H', data[i:i+2])
        i += length
    return 1000, 1400

def extract_comic_pages_from_kfx(kfx_path: str, progress_callback: Optional[Callable[[str], None]] = None) -> List[bytes]:
    """
    Extract high-res comic pages from a KFX container, filtering out thumbnail duplicates.
    Returns ordered list of raw JPEG bytes.
    """
    if progress_callback:
        progress_callback("正在读取 KFX 容器...")

    with open(kfx_path, 'rb') as f:
        data = f.read()

    soi = 0
    jpegs: List[Dict] = []
    while True:
        start = data.find(b'\xff\xd8\xff', soi)
        if start == -1:
            break
        end = data.find(b'\xff\xd9', start)
        if end != -1:
            jpeg_bytes = data[start:end+2]
            w, h = get_jpeg_dimensions(jpeg_bytes)
            sz = len(jpeg_bytes)
            jpegs.append({
                'start': start,
                'end': end + 2,
                'size': sz,
                'w': w,
                'h': h,
                'bytes': jpeg_bytes
            })
            soi = end + 2
        else:
            break

    if not jpegs:
        raise ValueError("未能在此 KFX 文件中检测到任何 JPEG 图片数据。可能带有商业 DRM 或并非扫描漫画格式。")

    if progress_callback:
        progress_callback(f"共扫描到 {len(jpegs)} 张图片，正在智能剔除快速滚动缩略图...")

    # Filter out paired thumbnails
    clean_pages: List[bytes] = []
    i = 0
    while i < len(jpegs):
        curr = jpegs[i]
        if i + 1 < len(jpegs):
            nxt = jpegs[i+1]
            if curr['w'] and curr['h'] and nxt['w'] and nxt['h']:
                r1 = curr['w'] / curr['h']
                r2 = nxt['w'] / nxt['h']
                # Check if curr and nxt represent the same page (one thumbnail, one full)
                if abs(r1 - r2) < 0.05:
                    if curr['h'] <= 512 and nxt['h'] > curr['h']:
                        # curr is thumbnail, take nxt
                        clean_pages.append(nxt['bytes'])
                        i += 2
                        continue
                    elif nxt['h'] <= 512 and curr['h'] > nxt['h']:
                        # nxt is thumbnail, take curr
                        clean_pages.append(curr['bytes'])
                        i += 2
                        continue
        # Also ignore standalone small thumbnail if it's the very first image and next image is high-res cover
        if i == 0 and len(jpegs) > 1 and curr['h'] <= 512:
            nxt = jpegs[1]
            if nxt['h'] > 1000:
                # Cover thumbnail, skip
                i += 1
                continue

        clean_pages.append(curr['bytes'])
        i += 1

    return clean_pages

def save_as_folder(pages: List[bytes], output_dir: str, progress_callback: Optional[Callable[[str], None]] = None):
    os.makedirs(output_dir, exist_ok=True)
    total = len(pages)
    for idx, page in enumerate(pages, start=1):
        filename = f"{idx:04d}.jpg"
        filepath = os.path.join(output_dir, filename)
        with open(filepath, 'wb') as f:
            f.write(page)
        if progress_callback and (idx % 20 == 0 or idx == total):
            progress_callback(f"保存图片: {idx}/{total}")

def save_as_cbz(pages: List[bytes], cbz_path: str, progress_callback: Optional[Callable[[str], None]] = None):
    total = len(pages)
    with zipfile.ZipFile(cbz_path, 'w', compression=zipfile.ZIP_STORED) as zf:
        for idx, page in enumerate(pages, start=1):
            filename = f"{idx:04d}.jpg"
            zf.writestr(filename, page)
            if progress_callback and (idx % 20 == 0 or idx == total):
                progress_callback(f"打包 CBZ: {idx}/{total}")

def save_as_pdf(pages: List[bytes], pdf_path: str, progress_callback: Optional[Callable[[str], None]] = None):
    """Lossless and super fast JPEG-to-PDF writer without re-encoding."""
    offsets = []
    pdf_bytes = bytearray(b'%PDF-1.4\n%\xe2\xe3\xcf\xd3\n')

    def write_obj(num, body):
        offsets.append(len(pdf_bytes))
        pdf_bytes.extend(f"{num} 0 obj\n".encode('latin1'))
        pdf_bytes.extend(body)
        pdf_bytes.extend(b"\nendobj\n")

    total = len(pages)
    curr_obj = 3
    page_records = []

    for idx, jdata in enumerate(pages, start=1):
        w, h = get_jpeg_dimensions(jdata)
        img_id = curr_obj
        curr_obj += 1
        page_id = curr_obj
        curr_obj += 1
        content_id = curr_obj
        curr_obj += 1
        page_records.append((w, h, img_id, page_id, content_id, jdata))
        if progress_callback and (idx % 50 == 0 or idx == total):
            progress_callback(f"解析 PDF 页面: {idx}/{total}")

    kid_refs = ' '.join(f'{rec[3]} 0 R' for rec in page_records)
    pages_body = f'<< /Type /Pages /Kids [{kid_refs}] /Count {len(page_records)} >>'.encode('latin1')
    write_obj(1, pages_body)

    catalog_body = b'<< /Type /Catalog /Pages 1 0 R >>'
    write_obj(2, catalog_body)

    for idx, (w, h, img_id, page_id, content_id, jdata) in enumerate(page_records, start=1):
        img_header = f'<< /Type /XObject /Subtype /Image /Width {w} /Height {h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length {len(jdata)} >>\nstream\n'.encode('latin1')
        img_body = img_header + jdata + b'\nendstream'
        write_obj(img_id, img_body)

        stream_content = f'q {w} 0 0 {h} 0 0 cm /Im0 Do Q\n'.encode('latin1')
        content_body = f'<< /Length {len(stream_content)} >>\nstream\n'.encode('latin1') + stream_content + b'endstream'
        write_obj(content_id, content_body)

        page_body = f'<< /Type /Page /Parent 1 0 R /MediaBox [0 0 {w} {h}] /Contents {content_id} 0 R /Resources << /XObject << /Im0 {img_id} 0 R >> >> >>'.encode('latin1')
        write_obj(page_id, page_body)

        if progress_callback and (idx % 50 == 0 or idx == total):
            progress_callback(f"生成 PDF 页面: {idx}/{total}")

    startxref = len(pdf_bytes)
    pdf_bytes.extend(f'xref\n0 {curr_obj}\n0000000000 65535 f \n'.encode('latin1'))
    for off in offsets:
        pdf_bytes.extend(f'{off:010d} 00000 n \n'.encode('latin1'))
    pdf_bytes.extend(f'trailer\n<< /Size {curr_obj} /Root 2 0 R >>\nstartxref\n{startxref}\n%%EOF\n'.encode('latin1'))

    with open(pdf_path, 'wb') as f:
        f.write(pdf_bytes)

def save_as_epub(pages: List[bytes], epub_path: str, title: str = "Comic Book", progress_callback: Optional[Callable[[str], None]] = None):
    """Generate a standard Fixed-Layout Comic EPUB3."""
    total = len(pages)
    if progress_callback:
        progress_callback("正在构建 EPUB 结构...")

    container_xml = '''<?xml version="1.0" encoding="utf-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>'''

    manifest_items = []
    spine_items = []

    manifest_items.append('<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>')
    manifest_items.append('<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>')

    for idx in range(1, total + 1):
        cover_prop = ' properties="cover-image"' if idx == 1 else ''
        manifest_items.append(f'<item id="page_{idx:04d}" href="Text/page_{idx:04d}.xhtml" media-type="application/xhtml+xml"/>')
        manifest_items.append(f'<item id="img_{idx:04d}" href="Images/{idx:04d}.jpg" media-type="image/jpeg"{cover_prop}/>')
        spine_items.append(f'<itemref idref="page_{idx:04d}"/>')

    content_opf = f'''<?xml version="1.0" encoding="utf-8"?>
<package version="3.0" unique-identifier="pub-id" xmlns="http://www.idpf.org/2007/opf" prefix="rendition: http://www.idpf.org/vocab/rendition/#">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>{title}</dc:title>
    <dc:language>zh</dc:language>
    <dc:identifier id="pub-id">urn:uuid:comic-{abs(hash(title))}</dc:identifier>
    <meta property="rendition:layout">pre-paginated</meta>
    <meta property="rendition:orientation">auto</meta>
    <meta property="rendition:spread">auto</meta>
  </metadata>
  <manifest>
{chr(10).join("    " + item for item in manifest_items)}
  </manifest>
  <spine toc="ncx">
{chr(10).join("    " + item for item in spine_items)}
  </spine>
</package>'''

    toc_ncx = f'''<?xml version="1.0" encoding="utf-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="urn:uuid:comic-{abs(hash(title))}"/>
  </head>
  <docTitle><text>{title}</text></docTitle>
  <navMap>
    <navPoint id="np-1" playOrder="1">
      <navLabel><text>开始阅读</text></navLabel>
      <content src="Text/page_0001.xhtml"/>
    </navPoint>
  </navMap>
</ncx>'''

    nav_xhtml = f'''<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><title>目录</title></head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>目录</h1>
    <ol>
      <li><a href="Text/page_0001.xhtml">开始阅读</a></li>
    </ol>
  </nav>
</body>
</html>'''

    with zipfile.ZipFile(epub_path, 'w') as zf:
        zf.writestr('mimetype', b'application/epub+zip', compress_type=zipfile.ZIP_STORED)
        zf.writestr('META-INF/container.xml', container_xml.encode('utf-8'), compress_type=zipfile.ZIP_DEFLATED)
        zf.writestr('OEBPS/content.opf', content_opf.encode('utf-8'), compress_type=zipfile.ZIP_DEFLATED)
        zf.writestr('OEBPS/toc.ncx', toc_ncx.encode('utf-8'), compress_type=zipfile.ZIP_DEFLATED)
        zf.writestr('OEBPS/nav.xhtml', nav_xhtml.encode('utf-8'), compress_type=zipfile.ZIP_DEFLATED)

        for idx, page in enumerate(pages, start=1):
            w, h = get_jpeg_dimensions(page)
            page_xhtml = f'''<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta name="viewport" content="width={w}, height={h}"/>
  <title>Page {idx}</title>
  <style>
    body, html {{ margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background-color: #000; }}
    img {{ width: 100%; height: 100%; object-fit: contain; display: block; }}
  </style>
</head>
<body>
  <img src="../Images/{idx:04d}.jpg" alt="Page {idx}"/>
</body>
</html>'''
            zf.writestr(f'OEBPS/Text/page_{idx:04d}.xhtml', page_xhtml.encode('utf-8'), compress_type=zipfile.ZIP_DEFLATED)
            zf.writestr(f'OEBPS/Images/{idx:04d}.jpg', page, compress_type=zipfile.ZIP_STORED)
            if progress_callback and (idx % 30 == 0 or idx == total):
                progress_callback(f"写入 EPUB: {idx}/{total}")

def find_kindlegen_or_calibre() -> Tuple[Optional[str], str]:
    """Find ebook-convert or kindlegen binary."""
    from shutil import which
    ec = which('ebook-convert')
    if ec and os.path.exists(ec):
        return ec, 'calibre'
    
    common_calibre = [
        r'C:\Program Files\Calibre2\ebook-convert.exe',
        r'C:\Program Files (x86)\Calibre2\ebook-convert.exe',
        r'D:\Program Files\Calibre2\ebook-convert.exe',
    ]
    for p in common_calibre:
        if os.path.exists(p):
            return p, 'calibre'

    base_dirs = [
        os.path.dirname(sys.executable) if getattr(sys, 'frozen', False) else None,
        os.path.dirname(os.path.abspath(__file__)),
        os.getcwd(),
        getattr(sys, '_MEIPASS', None)
    ]
    for b in base_dirs:
        if b:
            kg = os.path.join(b, 'kindlegen.exe')
            if os.path.exists(kg):
                return kg, 'kindlegen'
                
    kg = which('kindlegen')
    if kg and os.path.exists(kg):
        return kg, 'kindlegen'

    return None, 'none'

def save_as_azw3(
    pages: List[bytes], 
    azw3_path: str, 
    title: str = "Comic Book", 
    slim_azw3: bool = True,
    progress_callback: Optional[Callable[[str], None]] = None
):
    """
    Compile comic pages to AZW3 (KF8) format.
    Uses Calibre (ebook-convert) if available, or bundled KindleGen.
    Supports pure KF8 KindleStrip slimming (reduces file size by 50%).
    """
    import subprocess
    import tempfile
    import shutil
    
    bin_path, bin_type = find_kindlegen_or_calibre()
    if not bin_path:
        raise RuntimeError("未找到 AZW3 转换引擎（kindlegen.exe 或 Calibre ebook-convert）。")

    if progress_callback:
        progress_callback("正在准备 EPUB 结构...")

    temp_dir = tempfile.mkdtemp(prefix="kfx_azw3_")
    temp_epub = os.path.join(temp_dir, "temp_book.epub")
    try:
        save_as_epub(pages, temp_epub, title=title, progress_callback=progress_callback)

        if progress_callback:
            progress_callback("正在编译为 AZW3 (Kindle 原生格式)...")

        if bin_type == 'calibre':
            cmd = [bin_path, temp_epub, azw3_path]
            proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            if proc.returncode != 0:
                raise RuntimeError(f"Calibre 转换失败: {proc.stderr[:200]}")
        else:
            tmp_mobi_name = "output_temp.mobi"
            cmd = [bin_path, temp_epub, '-dont_append_source', '-c1', '-o', tmp_mobi_name]
            proc = subprocess.run(cmd, cwd=temp_dir, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            gen_mobi = os.path.join(temp_dir, tmp_mobi_name)
            if not os.path.exists(gen_mobi):
                raise RuntimeError(f"KindleGen 编译未生成有效输出 (退出码: {proc.returncode})")
            
            if slim_azw3:
                if progress_callback:
                    progress_callback("正在执行 KindleStrip 瘦身 (剥离冗余老副本)...")
                with open(gen_mobi, 'rb') as f:
                    mobi_bytes = f.read()
                pure_kf8 = extract_pure_kf8(mobi_bytes)
                with open(azw3_path, 'wb') as f:
                    f.write(pure_kf8)
            else:
                shutil.copyfile(gen_mobi, azw3_path)

        if progress_callback:
            progress_callback("AZW3 生成完成！")
    finally:
        try:
            shutil.rmtree(temp_dir, ignore_errors=True)
        except Exception:
            pass

