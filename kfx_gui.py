import os
import sys
import threading
import queue
import shutil
import customtkinter as ctk
from tkinter import filedialog, messagebox
from tkinterdnd2 import TkinterDnD, DND_FILES

from converter_core import (
    extract_comic_pages_from_kfx,
    save_as_folder,
    save_as_cbz,
    save_as_pdf,
    save_as_epub,
    save_as_azw3,
    find_kindlegen_or_calibre,
    get_kfx_meta,
    get_epub_meta,
    get_mobi_meta_and_images,
    extract_images_from_epub,
    compile_existing_epub_to_azw3,
    format_book_filename,
    find_cjpeg,
    find_cjpegli,
    optimize_image_list,
    get_unique_filepath
)

# Set appearance mode and color theme
ctk.set_appearance_mode("System")
ctk.set_default_color_theme("blue")

class ModernKfxConverterApp(ctk.CTk, TkinterDnD.DnDWrapper):
    """
    Modern, streamlined desktop UI for Manga and E-Book conversion.
    Designed with a two-column studio layout (File Queue & Inspector Panel).
    """
    def __init__(self):
        super().__init__()

        # Initialize native TkinterDnD hook
        self.TkdndVersion = TkinterDnD._require(self)

        self.title("KFX Studio · 漫画电子书转换器")
        self.geometry("1000x700")
        self.minsize(880, 620)

        # Set custom window icon
        base_dir = os.path.dirname(sys.executable) if getattr(sys, 'frozen', False) else os.path.dirname(os.path.abspath(__file__))
        ico_path = os.path.join(base_dir, "app_icon.ico")
        if not os.path.exists(ico_path):
            ico_path = os.path.join(getattr(sys, '_MEIPASS', ''), "app_icon.ico")
        if os.path.exists(ico_path):
            try:
                self.iconbitmap(ico_path)
            except Exception:
                pass

        # Two dedicated partitions
        self.current_tab = "kfx"  # "kfx" or "general"
        self.kfx_files = []       # files for KFX partition
        self.general_files = []   # files for EPUB / MOBI partition
        
        self.item_widgets = {}
        self.is_converting = False
        self.msg_queue = queue.Queue()

        self._create_layout()
        self._setup_drag_and_drop()
        self._process_queue()

    @property
    def current_file_list(self):
        return self.kfx_files if self.current_tab == "kfx" else self.general_files

    def _create_layout(self):
        # Configure main window grid
        self.grid_rowconfigure(1, weight=1)
        self.grid_rowconfigure(2, weight=0)
        self.grid_columnconfigure(0, weight=1)

        # ----------------------------------------------------
        # 1. TOP HEADER (Navigation, Partition Switch, Theme)
        # ----------------------------------------------------
        header_frame = ctk.CTkFrame(self, height=54, corner_radius=0, fg_color=("gray95", "#1c1c24"))
        header_frame.grid(row=0, column=0, sticky="ew")
        header_frame.pack_propagate(False)

        # Title & Badge
        title_box = ctk.CTkFrame(header_frame, fg_color="transparent")
        title_box.pack(side="left", padx=(16, 0), fill="y")

        lbl_app_title = ctk.CTkLabel(
            title_box,
            text="⚡ KFX Studio",
            font=ctk.CTkFont(size=17, weight="bold")
        )
        lbl_app_title.pack(side="left", padx=(0, 8))

        lbl_version = ctk.CTkLabel(
            title_box,
            text="v2.5 Pro",
            corner_radius=6,
            fg_color=("gray85", "#2a2a36"),
            text_color=("gray30", "gray80"),
            font=ctk.CTkFont(size=10, weight="bold"),
            width=50,
            height=20
        )
        lbl_version.pack(side="left")

        # Partition Selector (Centered segmented switch)
        self.tab_selector = ctk.CTkSegmentedButton(
            header_frame,
            values=["📚 KFX 漫画专属", "📖 EPUB / MOBI 通用"],
            font=ctk.CTkFont(size=12, weight="bold"),
            height=32,
            command=self._switch_tab
        )
        self.tab_selector.set("📚 KFX 漫画专属")
        self.tab_selector.pack(side="left", expand=True)

        # Theme Toggle Button
        self.theme_btn = ctk.CTkButton(
            header_frame,
            text="🌓 切换主题",
            width=85,
            height=30,
            corner_radius=6,
            fg_color=("gray85", "#2d2d38"),
            hover_color=("gray80", "#3d3d4c"),
            text_color=("gray20", "gray90"),
            font=ctk.CTkFont(size=11),
            command=self._toggle_theme
        )
        self.theme_btn.pack(side="right", padx=(0, 16))

        # ----------------------------------------------------
        # 2. MAIN BODY (Two-Column Studio Layout)
        # ----------------------------------------------------
        body_frame = ctk.CTkFrame(self, fg_color="transparent")
        body_frame.grid(row=1, column=0, sticky="nsew", padx=14, pady=(10, 6))

        # 58% Left (File Queue), 42% Right (Settings Inspector)
        body_frame.grid_columnconfigure(0, weight=6)
        body_frame.grid_columnconfigure(1, weight=4)
        body_frame.grid_rowconfigure(0, weight=1)

        # ====================================================
        # LEFT COLUMN: FILE QUEUE & DRAG ZONE
        # ====================================================
        left_col = ctk.CTkFrame(body_frame, corner_radius=10, fg_color=("gray95", "#202028"))
        left_col.grid(row=0, column=0, sticky="nsew", padx=(0, 7))
        left_col.grid_rowconfigure(1, weight=1)
        left_col.grid_columnconfigure(0, weight=1)

        # Queue Toolbar
        queue_toolbar = ctk.CTkFrame(left_col, height=44, corner_radius=0, fg_color="transparent")
        queue_toolbar.grid(row=0, column=0, sticky="ew", padx=12, pady=(8, 4))

        self.lbl_queue_title = ctk.CTkLabel(
            queue_toolbar,
            text="待转换任务列表 (0 项)",
            font=ctk.CTkFont(size=13, weight="bold")
        )
        self.lbl_queue_title.pack(side="left")

        # Action Buttons
        self.btn_clear = ctk.CTkButton(
            queue_toolbar,
            text="清空",
            width=50,
            height=28,
            corner_radius=6,
            fg_color="transparent",
            hover_color=("gray85", "#3a3a48"),
            text_color=("gray50", "gray70"),
            font=ctk.CTkFont(size=11),
            command=self.on_clear_list
        )
        self.btn_clear.pack(side="right", padx=(4, 0))

        self.btn_add_folder = ctk.CTkButton(
            queue_toolbar,
            text="+ 导入目录",
            width=76,
            height=28,
            corner_radius=6,
            fg_color=("gray85", "#2e2e3c"),
            hover_color=("gray80", "#3e3e50"),
            text_color=("gray20", "gray90"),
            font=ctk.CTkFont(size=11),
            command=self.on_add_folder
        )
        self.btn_add_folder.pack(side="right", padx=(4, 0))

        self.btn_add_files = ctk.CTkButton(
            queue_toolbar,
            text="+ 添加文件",
            width=76,
            height=28,
            corner_radius=6,
            fg_color=("dodgerblue", "#3a9dfa"),
            hover_color=("#1f77d0", "#2a87e0"),
            text_color="white",
            font=ctk.CTkFont(size=11, weight="bold"),
            command=self.on_add_files
        )
        self.btn_add_files.pack(side="right")

        # Scrollable File List Container
        self.scroll_list = ctk.CTkScrollableFrame(
            left_col,
            corner_radius=8,
            fg_color=("white", "#181820"),
            border_width=1,
            border_color=("gray88", "#2a2a34")
        )
        self.scroll_list.grid(row=1, column=0, sticky="nsew", padx=10, pady=(0, 10))

        # Initial Empty State
        self._render_empty_state()

        # ====================================================
        # RIGHT COLUMN: INSPECTOR SETTINGS PANEL
        # ====================================================
        right_col = ctk.CTkScrollableFrame(
            body_frame,
            corner_radius=10,
            fg_color=("gray95", "#202028")
        )
        right_col.grid(row=0, column=1, sticky="nsew", padx=(7, 0))

        # --- Card 1: Target Formats ---
        card_fmt = ctk.CTkFrame(right_col, corner_radius=8, fg_color=("white", "#262632"))
        card_fmt.pack(fill="x", padx=4, pady=(2, 6))

        fmt_head = ctk.CTkLabel(card_fmt, text="📦 目标输出格式 (多选)", font=ctk.CTkFont(size=13, weight="bold"))
        fmt_head.pack(anchor="w", padx=12, pady=(10, 6))

        self.var_fmt_azw3 = ctk.BooleanVar(value=True)
        self.var_fmt_cbz = ctk.BooleanVar(value=True)
        self.var_fmt_epub = ctk.BooleanVar(value=False)
        self.var_fmt_pdf = ctk.BooleanVar(value=False)
        self.var_fmt_folder = ctk.BooleanVar(value=False)

        fmt_grid = ctk.CTkFrame(card_fmt, fg_color="transparent")
        fmt_grid.pack(fill="x", padx=12, pady=(0, 10))

        cb_azw3 = ctk.CTkCheckBox(fmt_grid, text="AZW3 (Kindle 原生)", variable=self.var_fmt_azw3, font=ctk.CTkFont(size=12))
        cb_azw3.grid(row=0, column=0, sticky="w", padx=(0, 10), pady=4)

        cb_cbz = ctk.CTkCheckBox(fmt_grid, text="CBZ (漫画压缩包)", variable=self.var_fmt_cbz, font=ctk.CTkFont(size=12))
        cb_cbz.grid(row=0, column=1, sticky="w", pady=4)

        cb_epub = ctk.CTkCheckBox(fmt_grid, text="EPUB (电子书)", variable=self.var_fmt_epub, font=ctk.CTkFont(size=12))
        cb_epub.grid(row=1, column=0, sticky="w", padx=(0, 10), pady=4)

        cb_pdf = ctk.CTkCheckBox(fmt_grid, text="PDF (高清文档)", variable=self.var_fmt_pdf, font=ctk.CTkFont(size=12))
        cb_pdf.grid(row=1, column=1, sticky="w", pady=4)

        cb_folder = ctk.CTkCheckBox(fmt_grid, text="提取原图目录", variable=self.var_fmt_folder, font=ctk.CTkFont(size=12))
        cb_folder.grid(row=2, column=0, columnspan=2, sticky="w", pady=4)

        # AZW3 Pure KF8 Slimming Checkbox
        self.var_slim_azw3 = ctk.BooleanVar(value=True)
        self.cb_slim_azw3 = ctk.CTkCheckBox(
            card_fmt,
            text="AZW3 纯净瘦身 (剥离冗余老副本，体积减半)",
            variable=self.var_slim_azw3,
            font=ctk.CTkFont(size=11, weight="bold"),
            text_color=("dodgerblue", "#3a9dfa")
        )
        self.cb_slim_azw3.pack(anchor="w", padx=12, pady=(0, 10))

        # --- Card 2: Compression & Trellis Engine ---
        card_opt = ctk.CTkFrame(right_col, corner_radius=8, fg_color=("white", "#262632"))
        card_opt.pack(fill="x", padx=4, pady=4)

        opt_head = ctk.CTkLabel(card_opt, text="⚡ 体积深度优化 (Jpegli / MozJPEG)", font=ctk.CTkFont(size=13, weight="bold"))
        opt_head.pack(anchor="w", padx=12, pady=(10, 6))

        self.var_optimize_img = ctk.BooleanVar(value=True)
        self.cb_optimize_img = ctk.CTkCheckBox(
            card_opt,
            text="启用图像智能压缩与画质优化",
            variable=self.var_optimize_img,
            font=ctk.CTkFont(size=12, weight="bold"),
            text_color=("#2ecc71", "#2ecc71"),
            command=self.on_toggle_optimize
        )
        self.cb_optimize_img.pack(anchor="w", padx=12, pady=(0, 8))

        # Engine Selector Row
        engine_row = ctk.CTkFrame(card_opt, fg_color="transparent")
        engine_row.pack(fill="x", padx=12, pady=(0, 8))
        
        ctk.CTkLabel(engine_row, text="压缩引擎:", font=ctk.CTkFont(size=11), text_color=("gray40", "gray70")).pack(side="left", padx=(0, 6))

        self.engine_options = ["Jpegli (Google 推荐 · 更小更快)", "MozJPEG (经典 Trellis)"]
        self.var_opt_engine = ctk.StringVar(value="Jpegli (Google 推荐 · 更小更快)")
        self.opt_engine_menu = ctk.CTkOptionMenu(
            engine_row,
            values=self.engine_options,
            variable=self.var_opt_engine,
            height=28,
            font=ctk.CTkFont(size=11)
        )
        self.opt_engine_menu.pack(side="left", fill="x", expand=True)

        # Quality & Scale Row
        params_row = ctk.CTkFrame(card_opt, fg_color="transparent")
        params_row.pack(fill="x", padx=12, pady=(0, 10))

        # Quality Menu
        q_box = ctk.CTkFrame(params_row, fg_color="transparent")
        q_box.pack(side="left", fill="x", expand=True, padx=(0, 4))
        ctk.CTkLabel(q_box, text="画质挡位:", font=ctk.CTkFont(size=11), text_color=("gray40", "gray70")).pack(anchor="w")

        self.quality_options = ["均衡推荐 (Q75)", "深度瘦身 (Q65)", "极限压缩 (Q55)", "高保真度 (Q85)"]
        self.quality_map = {
            "均衡推荐 (Q75)": 75,
            "深度瘦身 (Q65)": 65,
            "极限压缩 (Q55)": 55,
            "高保真度 (Q85)": 85
        }
        self.opt_quality_menu = ctk.CTkOptionMenu(
            q_box,
            values=self.quality_options,
            height=28,
            font=ctk.CTkFont(size=11)
        )
        self.opt_quality_menu.set("均衡推荐 (Q75)")
        self.opt_quality_menu.pack(fill="x", pady=(2, 0))

        # Scale Menu
        s_box = ctk.CTkFrame(params_row, fg_color="transparent")
        s_box.pack(side="left", fill="x", expand=True, padx=(4, 0))
        ctk.CTkLabel(s_box, text="分辨率缩放:", font=ctk.CTkFont(size=11), text_color=("gray40", "gray70")).pack(anchor="w")

        self.scale_options = [
            "原始尺寸 (100%)",
            "75% 均衡缩放",
            "85% 轻度微缩",
            "65% 深度缩小",
            "限高 1440px",
            "限高 1200px"
        ]
        self.scale_map = {
            "原始尺寸 (100%)": "100%",
            "75% 均衡缩放": "75%",
            "85% 轻度微缩": "85%",
            "65% 深度缩小": "65%",
            "限高 1440px": "1440px",
            "限高 1200px": "1200px"
        }
        self.opt_scale_menu = ctk.CTkOptionMenu(
            s_box,
            values=self.scale_options,
            height=28,
            font=ctk.CTkFont(size=11)
        )
        self.opt_scale_menu.set("原始尺寸 (100%)")
        self.opt_scale_menu.pack(fill="x", pady=(2, 0))

        # --- Card 3: Manga Image Enhancement ---
        card_manga = ctk.CTkFrame(right_col, corner_radius=8, fg_color=("white", "#262632"))
        card_manga.pack(fill="x", padx=4, pady=4)

        manga_head = ctk.CTkLabel(card_manga, text="🎨 漫画黑白增强管线", font=ctk.CTkFont(size=13, weight="bold"))
        manga_head.pack(anchor="w", padx=12, pady=(10, 6))

        self.var_auto_gray = ctk.BooleanVar(value=True)
        self.cb_auto_gray = ctk.CTkCheckBox(
            card_manga,
            text="智能转灰度 (保留彩色封面，剔除冗余色彩)",
            variable=self.var_auto_gray,
            font=ctk.CTkFont(size=12)
        )
        self.cb_auto_gray.pack(anchor="w", padx=12, pady=3)

        self.var_auto_levels = ctk.BooleanVar(value=True)
        self.cb_auto_levels = ctk.CTkCheckBox(
            card_manga,
            text="自动色阶 (强化深黑对比度，消除扫描发虚)",
            variable=self.var_auto_levels,
            font=ctk.CTkFont(size=12)
        )
        self.cb_auto_levels.pack(anchor="w", padx=12, pady=3)

        self.var_bleach_paper = ctk.BooleanVar(value=True)
        self.cb_bleach_paper = ctk.CTkCheckBox(
            card_manga,
            text="纸张底噪漂白 (泛黄杂色拉至纯白，噪点归零)",
            variable=self.var_bleach_paper,
            font=ctk.CTkFont(size=12)
        )
        self.cb_bleach_paper.pack(anchor="w", padx=12, pady=(3, 10))

        # --- Card 4: Output Destination & Naming ---
        card_dest = ctk.CTkFrame(right_col, corner_radius=8, fg_color=("white", "#262632"))
        card_dest.pack(fill="x", padx=4, pady=(4, 2))

        dest_head = ctk.CTkLabel(card_dest, text="📂 存储位置与命名", font=ctk.CTkFont(size=13, weight="bold"))
        dest_head.pack(anchor="w", padx=12, pady=(10, 6))

        self.var_out_mode = ctk.StringVar(value="source")

        self.rb_source = ctk.CTkRadioButton(
            card_dest,
            text="源文件同级目录 (按格式建文件夹归档)",
            value="source",
            variable=self.var_out_mode,
            font=ctk.CTkFont(size=12),
            command=self.on_out_mode_changed
        )
        self.rb_source.pack(anchor="w", padx=12, pady=2)

        custom_row = ctk.CTkFrame(card_dest, fg_color="transparent")
        custom_row.pack(fill="x", padx=12, pady=(2, 6))

        self.rb_custom = ctk.CTkRadioButton(
            custom_row,
            text="自定义:",
            value="custom",
            variable=self.var_out_mode,
            font=ctk.CTkFont(size=12),
            command=self.on_out_mode_changed
        )
        self.rb_custom.pack(side="left", padx=(0, 6))

        self.custom_entry = ctk.CTkEntry(
            custom_row,
            placeholder_text="点击右侧浏览选择...",
            height=26,
            font=ctk.CTkFont(size=11),
            state="disabled"
        )
        self.custom_entry.pack(side="left", fill="x", expand=True, padx=(0, 4))

        self.btn_browse = ctk.CTkButton(
            custom_row,
            text="浏览",
            width=50,
            height=26,
            state="disabled",
            font=ctk.CTkFont(size=11),
            command=self.on_browse_custom
        )
        self.btn_browse.pack(side="left")

        # Naming Rule
        self.var_override_name = ctk.BooleanVar(value=True)
        self.cb_override_name = ctk.CTkCheckBox(
            card_dest,
            text="规范命名 (按 '书名_卷数_作者' 重命名)",
            variable=self.var_override_name,
            font=ctk.CTkFont(size=12, weight="bold"),
            text_color=("dodgerblue", "#3a9dfa")
        )
        self.cb_override_name.pack(anchor="w", padx=12, pady=(4, 10))

        # ----------------------------------------------------
        # 3. BOTTOM FOOTER (Status Bar, Progress, Start Action)
        # ----------------------------------------------------
        footer_frame = ctk.CTkFrame(self, height=62, corner_radius=0, fg_color=("gray92", "#181820"))
        footer_frame.grid(row=2, column=0, sticky="ew")
        footer_frame.pack_propagate(False)

        footer_inner = ctk.CTkFrame(footer_frame, fg_color="transparent")
        footer_inner.pack(fill="both", expand=True, padx=16, pady=8)

        # Left Status Text
        status_box = ctk.CTkFrame(footer_inner, fg_color="transparent")
        status_box.pack(side="left", fill="both", expand=True, padx=(0, 16))

        self.lbl_status = ctk.CTkLabel(
            status_box,
            text="就绪 · 请拖拽或添加文件开始",
            font=ctk.CTkFont(size=12),
            text_color=("gray30", "gray85"),
            anchor="w"
        )
        self.lbl_status.pack(fill="x", pady=(0, 3))

        self.progress_bar = ctk.CTkProgressBar(status_box, height=8, corner_radius=4)
        self.progress_bar.set(0)
        self.progress_bar.pack(fill="x")

        # Right Action Button
        self.btn_convert = ctk.CTkButton(
            footer_inner,
            text="⚡ 开始批量转换",
            width=140,
            height=38,
            corner_radius=8,
            font=ctk.CTkFont(size=13, weight="bold"),
            fg_color=("dodgerblue", "#3a9dfa"),
            hover_color=("#1f77d0", "#2a87e0"),
            command=self.start_conversion
        )
        self.btn_convert.pack(side="right")

    def _render_empty_state(self):
        for widget in self.scroll_list.winfo_children():
            widget.destroy()

        empty_container = ctk.CTkFrame(self.scroll_list, fg_color="transparent")
        empty_container.pack(expand=True, fill="both", pady=70)

        icon_glyph = ctk.CTkLabel(
            empty_container,
            text="📂",
            font=ctk.CTkFont(size=44)
        )
        icon_glyph.pack(pady=(0, 8))

        hint_title = ctk.CTkLabel(
            empty_container,
            text="拖拽漫画或电子书文件到此处",
            font=ctk.CTkFont(size=14, weight="bold"),
            text_color=("gray30", "gray85")
        )
        hint_title.pack()

        hint_sub = ctk.CTkLabel(
            empty_container,
            text="支持 .kfx、.epub、.mobi 格式 · 拖入自动分流至专属分区",
            font=ctk.CTkFont(size=11),
            text_color=("gray50", "gray65")
        )
        hint_sub.pack(pady=(4, 16))

        btn_row = ctk.CTkFrame(empty_container, fg_color="transparent")
        btn_row.pack()

        btn_pick_files = ctk.CTkButton(
            btn_row,
            text="选择文件",
            width=90,
            height=28,
            corner_radius=6,
            font=ctk.CTkFont(size=11),
            command=self.on_add_files
        )
        btn_pick_files.pack(side="left", padx=4)

        btn_pick_folder = ctk.CTkButton(
            btn_row,
            text="选择文件夹",
            width=90,
            height=28,
            corner_radius=6,
            fg_color=("gray85", "#2e2e3c"),
            hover_color=("gray80", "#3e3e50"),
            text_color=("gray20", "gray90"),
            font=ctk.CTkFont(size=11),
            command=self.on_add_folder
        )
        btn_pick_folder.pack(side="left", padx=4)

    def _setup_drag_and_drop(self):
        try:
            self.drop_target_register(DND_FILES)
            self.dnd_bind('<<Drop>>', self._on_drop)
        except Exception as e:
            print("DnD setup error:", e)

    def _on_drop(self, event):
        raw_data = event.data
        if not raw_data:
            return
        try:
            file_paths = self.tk.splitlist(raw_data)
        except Exception:
            file_paths = [raw_data.strip('{}')]
        self._add_paths(file_paths)

    def _add_paths(self, paths):
        added_kfx = 0
        added_general = 0

        for path in paths:
            path = path.strip('{}').strip('"')
            if not os.path.exists(path):
                continue

            if os.path.isdir(path):
                for root, _, files in os.walk(path):
                    for file in files:
                        full_p = os.path.join(root, file)
                        ext = os.path.splitext(file)[1].lower()
                        if ext == '.kfx':
                            if self._append_file_item('kfx', full_p):
                                added_kfx += 1
                        elif ext in ('.epub', '.mobi', '.azw', '.azw3'):
                            if self._append_file_item('general', full_p):
                                added_general += 1
            else:
                ext = os.path.splitext(path)[1].lower()
                if ext == '.kfx':
                    if self._append_file_item('kfx', path):
                        added_kfx += 1
                elif ext in ('.epub', '.mobi', '.azw', '.azw3'):
                    if self._append_file_item('general', path):
                        added_general += 1

        # Auto switch tab if files added to another partition
        if added_kfx > 0 and added_general == 0 and self.current_tab != 'kfx':
            self._switch_tab("📚 KFX 漫画专属")
        elif added_general > 0 and added_kfx == 0 and self.current_tab != 'general':
            self._switch_tab("📖 EPUB / MOBI 通用")
        else:
            self._refresh_list_ui()

        total_added = added_kfx + added_general
        if total_added > 0:
            self.lbl_status.configure(text=f"已成功添加 {total_added} 个待处理文件")

    def _append_file_item(self, target_tab: str, fpath: str) -> bool:
        flist = self.kfx_files if target_tab == 'kfx' else self.general_files
        for item in flist:
            if item['path'] == fpath:
                return False

        fname = os.path.basename(fpath)
        sz = os.path.getsize(fpath)
        if sz < 1024 * 1024:
            size_str = f"{sz / 1024:.1f} KB"
        else:
            size_str = f"{sz / (1024*1024):.1f} MB"

        meta_title = ""
        meta_author = ""
        ftype = "KFX"

        ext = os.path.splitext(fname)[1].lower()
        if ext == '.kfx':
            ftype = "KFX"
            meta_title, meta_author = get_kfx_meta(fpath)
        elif ext == '.epub':
            ftype = "EPUB"
            meta_title, meta_author = get_epub_meta(fpath)
        elif ext in ('.mobi', '.azw', '.azw3'):
            ftype = "MOBI"
            meta_title, meta_author, _ = get_mobi_meta_and_images(fpath)

        raw_base = os.path.splitext(fname)[0]
        formatted_name = format_book_filename(meta_title, meta_author, raw_base)

        flist.append({
            'path': fpath,
            'name': fname,
            'type': ftype,
            'raw_base': raw_base,
            'size': size_str,
            'title': meta_title,
            'author': meta_author,
            'formatted_name': formatted_name,
            'display_name': formatted_name if formatted_name else fname,
            'status': "等待中"
        })
        return True

    def _switch_tab(self, choice):
        if choice == "📚 KFX 漫画专属":
            self.current_tab = "kfx"
            self.tab_selector.set("📚 KFX 漫画专属")
        else:
            self.current_tab = "general"
            self.tab_selector.set("📖 EPUB / MOBI 通用")

        self._refresh_list_ui()
        tab_name = "KFX 专属漫画" if self.current_tab == "kfx" else "通用电子书 (EPUB/MOBI)"
        self.lbl_status.configure(text=f"已切换至 {tab_name} 分区")

    def _refresh_list_ui(self):
        flist = self.current_file_list
        self.item_widgets.clear()

        # Update queue count label
        self.lbl_queue_title.configure(text=f"待转换任务列表 ({len(flist)} 项)")

        # Clear existing items
        for widget in self.scroll_list.winfo_children():
            widget.destroy()

        if not flist:
            self._render_empty_state()
            return

        for idx, item in enumerate(flist):
            row_frame = ctk.CTkFrame(
                self.scroll_list,
                corner_radius=6,
                fg_color=("gray95", "#22222c"),
                height=42
            )
            row_frame.pack(fill="x", padx=2, pady=2)
            row_frame.pack_propagate(False)

            # Format Badge
            badge_color = "#3498db" if item['type'] == 'KFX' else ("#e67e22" if item['type'] == 'MOBI' else "#9b59b6")
            badge_lbl = ctk.CTkLabel(
                row_frame,
                text=item['type'],
                corner_radius=4,
                fg_color=badge_color,
                text_color="white",
                font=ctk.CTkFont(size=10, weight="bold"),
                width=42,
                height=20
            )
            badge_lbl.pack(side="left", padx=(8, 6))

            # Display formatted name
            name_text = item['display_name']
            if item['display_name'] != item['name']:
                name_text = f"{item['display_name']} [{item['name']}]"

            name_lbl = ctk.CTkLabel(
                row_frame,
                text=name_text,
                font=ctk.CTkFont(size=11, weight="bold"),
                anchor="w"
            )
            name_lbl.pack(side="left", fill="x", expand=True)

            size_lbl = ctk.CTkLabel(
                row_frame,
                text=item['size'],
                font=ctk.CTkFont(size=11),
                text_color=("gray50", "gray65"),
                width=60
            )
            size_lbl.pack(side="left", padx=6)

            status_pill = ctk.CTkLabel(
                row_frame,
                text=item['status'],
                corner_radius=6,
                fg_color=("gray85", "#333342"),
                text_color=("gray30", "gray85"),
                font=ctk.CTkFont(size=11),
                width=72,
                height=22
            )
            status_pill.pack(side="left", padx=6)

            btn_del = ctk.CTkButton(
                row_frame,
                text="✕",
                width=22,
                height=22,
                corner_radius=4,
                fg_color="transparent",
                hover_color=("gray80", "#454558"),
                text_color=("gray50", "gray70"),
                command=lambda i=idx: self.on_remove_file(i)
            )
            btn_del.pack(side="right", padx=(0, 6))

            self.item_widgets[idx] = status_pill

    def on_add_files(self):
        if self.current_tab == "kfx":
            ftypes = [("Kindle KFX 漫画", "*.kfx"), ("所有文件", "*.*")]
            title = "选择 KFX 漫画文件"
        else:
            ftypes = [("EPUB / MOBI 电子书", "*.epub;*.mobi;*.azw;*.azw3"), ("EPUB 电子书", "*.epub"), ("MOBI 电子书", "*.mobi"), ("所有文件", "*.*")]
            title = "选择 EPUB 或 MOBI 电子书"

        files = filedialog.askopenfilenames(title=title, filetypes=ftypes)
        if files:
            self._add_paths(files)

    def on_add_folder(self):
        title = "选择包含 KFX 文件的目录" if self.current_tab == "kfx" else "选择包含 EPUB/MOBI 文件的目录"
        folder = filedialog.askdirectory(title=title)
        if folder:
            self._add_paths([folder])

    def on_remove_file(self, index):
        if self.is_converting:
            return
        flist = self.current_file_list
        if 0 <= index < len(flist):
            del flist[index]
            self._refresh_list_ui()

    def on_clear_list(self):
        if self.is_converting:
            messagebox.showwarning("提示", "正在转换中，无法清空。")
            return
        self.current_file_list.clear()
        self._refresh_list_ui()
        self.lbl_status.configure(text="当前分区文件列表已清空")

    def on_out_mode_changed(self):
        mode = self.var_out_mode.get()
        if mode == "custom":
            self.custom_entry.configure(state="normal")
            self.btn_browse.configure(state="normal")
        else:
            self.custom_entry.configure(state="disabled")
            self.btn_browse.configure(state="disabled")

    def on_toggle_optimize(self):
        state = "normal" if self.var_optimize_img.get() else "disabled"
        self.opt_engine_menu.configure(state=state)
        self.opt_quality_menu.configure(state=state)
        self.opt_scale_menu.configure(state=state)
        self.cb_auto_gray.configure(state=state)
        self.cb_auto_levels.configure(state=state)
        self.cb_bleach_paper.configure(state=state)

    def on_browse_custom(self):
        d = filedialog.askdirectory(title="选择保存目录")
        if d:
            self.custom_entry.configure(state="normal")
            self.custom_entry.delete(0, "end")
            self.custom_entry.insert(0, d)

    def _get_selected_formats(self):
        formats = []
        if self.var_fmt_azw3.get(): formats.append("azw3")
        if self.var_fmt_cbz.get(): formats.append("cbz")
        if self.var_fmt_epub.get(): formats.append("epub")
        if self.var_fmt_pdf.get(): formats.append("pdf")
        if self.var_fmt_folder.get(): formats.append("folder")
        return formats

    def start_conversion(self):
        if self.is_converting:
            return
        flist = self.current_file_list
        if not flist:
            messagebox.showwarning("提示", "当前分区待转换列表为空！\n请拖拽或添加文件后再执行。")
            return

        selected_formats = self._get_selected_formats()
        if not selected_formats:
            messagebox.showwarning("提示", "请至少勾选一种目标输出格式！")
            return

        if "azw3" in selected_formats:
            bin_path, _ = find_kindlegen_or_calibre()
            if not bin_path:
                messagebox.showwarning(
                    "引擎提示",
                    "未检测到 kindlegen.exe 或 Calibre。\n请确保 kindlegen.exe 位于程序同级目录下！"
                )

        out_mode = self.var_out_mode.get()
        custom_dir = self.custom_entry.get().strip()

        if out_mode == "custom":
            if not custom_dir or not os.path.exists(custom_dir):
                messagebox.showerror("路径错误", "请先选择有效的自定义输出目录！")
                return

        self.is_converting = True
        self.btn_convert.configure(state="disabled", fg_color="gray50")
        self.progress_bar.set(0)

        threading.Thread(
            target=self._worker_thread,
            args=(flist, selected_formats, out_mode, custom_dir),
            daemon=True
        ).start()

    def _worker_thread(self, flist, selected_formats, out_mode, custom_dir):
        total_files = len(flist)
        success_count = 0

        subfolder_names = {
            'azw3': 'AZW3',
            'cbz': 'CBZ',
            'epub': 'EPUB',
            'pdf': 'PDF',
            'folder': 'Images'
        }

        override_name = self.var_override_name.get()
        do_optimize = self.var_optimize_img.get()
        slim_azw3 = self.var_slim_azw3.get()
        engine_choice = "jpegli" if "Jpegli" in self.var_opt_engine.get() else "mozjpeg"
        engine_label = "Jpegli" if engine_choice == "jpegli" else "MozJPEG"
        opt_quality = self.quality_map.get(self.opt_quality_menu.get(), 75)
        scale_mode = self.scale_map.get(self.opt_scale_menu.get(), "100%")
        auto_grayscale = self.var_auto_gray.get()
        bleach_paper = self.var_bleach_paper.get()
        auto_levels = self.var_auto_levels.get()

        for file_idx, f_info in enumerate(flist):
            in_path = f_info['path']
            f_name = f_info['name']
            ftype = f_info['type'].lower()
            raw_base = f_info.get('raw_base') or os.path.splitext(f_name)[0]

            if override_name and f_info.get('formatted_name'):
                target_name = f_info['formatted_name']
            else:
                target_name = raw_base

            book_title = f_info.get('title') or f_info.get('formatted_name') or target_name

            if out_mode == "source":
                base_out_dir = os.path.dirname(in_path)
            else:
                base_out_dir = custom_dir

            self.msg_queue.put(('item_status', file_idx, "转换中", "#3498db"))
            self.msg_queue.put(('status', f"正在转换 [{file_idx+1}/{total_files}]: {target_name}"))

            try:
                def progress_cb(step_text):
                    self.msg_queue.put(('status', f"[{file_idx+1}/{total_files}] {step_text}"))

                # 1. Dispatch extraction based on format
                pages = None
                
                # Check if input is EPUB and only AZW3 is needed (super fast direct compile, only when not optimizing)
                if not do_optimize and ftype == 'epub' and selected_formats == ['azw3']:
                    type_folder = os.path.join(base_out_dir, subfolder_names['azw3'])
                    os.makedirs(type_folder, exist_ok=True)
                    raw_out_path = os.path.join(type_folder, f"{target_name}.azw3")
                    out_path = get_unique_filepath(raw_out_path)
                    compile_existing_epub_to_azw3(in_path, out_path, slim_azw3=slim_azw3, progress_callback=progress_cb)
                else:
                    # Extract pages for multi-format export
                    if ftype == 'kfx':
                        pages = extract_comic_pages_from_kfx(in_path, progress_callback=progress_cb)
                    elif ftype == 'epub':
                        pages = extract_images_from_epub(in_path, progress_callback=progress_cb)
                    elif ftype in ('mobi', 'azw', 'azw3'):
                        _, _, pages = get_mobi_meta_and_images(in_path, progress_callback=progress_cb)
                        if not pages:
                            raise ValueError("MOBI 文件内未检测到图片或扫描页面。")

                    if not pages:
                        raise ValueError("未能从文件中提取到有效图片页面。")

                    # If optimize is checked, call compression engine (Jpegli / MozJPEG) on pages
                    if do_optimize:
                        desc_parts = [f"Q{opt_quality}"]
                        if scale_mode != "100%": desc_parts.append(f"缩放{scale_mode}")
                        if auto_grayscale: desc_parts.append("灰度化")
                        if auto_levels: desc_parts.append("自动色阶")
                        if bleach_paper: desc_parts.append("底噪漂白")
                        opts_str = " · ".join(desc_parts)

                        progress_cb(f"正在调用 {engine_label} 深度优化 ({opts_str})...")
                        pages, orig_sz, opt_sz = optimize_image_list(
                            pages,
                            engine=engine_choice,
                            quality=opt_quality,
                            scale_mode=scale_mode,
                            auto_grayscale=auto_grayscale,
                            bleach_paper=bleach_paper,
                            auto_levels=auto_levels,
                            progress_callback=progress_cb
                        )
                        saved_mb = (orig_sz - opt_sz) / (1024 * 1024)
                        saved_pct = (1.0 - (opt_sz / orig_sz)) * 100 if orig_sz > 0 else 0
                        progress_cb(f"{engine_label} 优化完成: 节省 {saved_mb:.1f}MB ({saved_pct:.1f}%)")

                    # Export selected formats (auto-renaming on filename collisions)
                    for fmt in selected_formats:
                        type_folder = os.path.join(base_out_dir, subfolder_names[fmt])
                        os.makedirs(type_folder, exist_ok=True)

                        if fmt == "azw3":
                            progress_cb("正在生成 AZW3 (Kindle 原生格式)...")
                            out_path = get_unique_filepath(os.path.join(type_folder, f"{target_name}.azw3"))
                            if ftype == 'epub' and not do_optimize:
                                compile_existing_epub_to_azw3(in_path, out_path, slim_azw3=slim_azw3, progress_callback=progress_cb)
                            else:
                                save_as_azw3(pages, out_path, title=book_title, slim_azw3=slim_azw3, progress_callback=progress_cb)
                        elif fmt == "cbz":
                            progress_cb("正在打包 CBZ 漫画压缩包...")
                            out_path = get_unique_filepath(os.path.join(type_folder, f"{target_name}.cbz"))
                            save_as_cbz(pages, out_path, progress_callback=progress_cb)
                        elif fmt == "epub":
                            progress_cb("正在生成 EPUB 电子书...")
                            out_path = get_unique_filepath(os.path.join(type_folder, f"{target_name}.epub"))
                            if ftype == 'epub' and not do_optimize:
                                shutil.copyfile(in_path, out_path)
                            else:
                                save_as_epub(pages, out_path, title=book_title, progress_callback=progress_cb)
                        elif fmt == "pdf":
                            progress_cb("正在生成 PDF 高清文档...")
                            out_path = get_unique_filepath(os.path.join(type_folder, f"{target_name}.pdf"))
                            save_as_pdf(pages, out_path, progress_callback=progress_cb)
                        elif fmt == "folder":
                            progress_cb("正在提取高清原图目录...")
                            out_folder = get_unique_filepath(os.path.join(type_folder, target_name))
                            save_as_folder(pages, out_folder, progress_callback=progress_cb)

                self.msg_queue.put(('item_status', file_idx, "已完成", "#2ecc71"))
                success_count += 1
            except Exception as e:
                self.msg_queue.put(('item_status', file_idx, f"失败", "#e74c3c"))
                self.msg_queue.put(('status', f"转换失败 {f_name}: {e}"))

            self.msg_queue.put(('progress', (file_idx + 1) / total_files))

        self.msg_queue.put(('finish', success_count, total_files))

    def _process_queue(self):
        try:
            while True:
                msg = self.msg_queue.get_nowait()
                mtype = msg[0]

                if mtype == 'status':
                    self.lbl_status.configure(text=msg[1])
                elif mtype == 'item_status':
                    idx, text, color = msg[1], msg[2], msg[3]
                    if idx in self.item_widgets:
                        self.item_widgets[idx].configure(text=text, fg_color=color, text_color="white")
                elif mtype == 'progress':
                    self.progress_bar.set(msg[1])
                elif mtype == 'finish':
                    success, total = msg[1], msg[2]
                    self.is_converting = False
                    self.btn_convert.configure(state="normal", fg_color=("dodgerblue", "#3a9dfa"))
                    self.lbl_status.configure(text=f"批量转换任务结束！成功: {success}/{total}")
                    if success > 0:
                        messagebox.showinfo("转换完成", f"批量处理完成！\n成功转换: {success} / {total} 项")
        except queue.Empty:
            pass
        finally:
            self.after(100, self._process_queue)

    def _toggle_theme(self):
        current = ctk.get_appearance_mode()
        if current.lower() == "dark":
            ctk.set_appearance_mode("Light")
        else:
            ctk.set_appearance_mode("Dark")

def main():
    app = ModernKfxConverterApp()
    app.mainloop()

if __name__ == "__main__":
    main()
