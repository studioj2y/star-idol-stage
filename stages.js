// Tour Stages Configuration and Landmark Background Renderer
const TOUR_STAGES = [
    {
        id: 'tokyo',
        name: '東京 · 渋谷 STAGE',
        subname: 'TOKYO SHIBUYA LIVE',
        icon: '🗼',
        goalAltitude: 500,
        bgColorTop: '#120529',
        bgColorMid: '#2e0e4e',
        bgColorBottom: '#5c1775',
        landmarkName: 'Tokyo Tower & Skytree',
        clearReward: 300,
        skyType: 'tokyo',
        chekiSign: 'なぁたん ♡ Tokyo Debut!',
        chekiNote: '「渋谷から世界へ！みんなのコール、届いたよ♡」',
        chekiStamp: 'TOKYO DEBUT 🗼'
    },
    {
        id: 'osaka',
        name: '大阪 · 道頓堀 FES',
        subname: 'OSAKA DOTONBORI FESTIVAL',
        icon: '🏮',
        goalAltitude: 650,
        bgColorTop: '#1b0933',
        bgColorMid: '#4a1236',
        bgColorBottom: '#e65100',
        landmarkName: 'Tsutenkaku & Dotonbori',
        clearReward: 400,
        skyType: 'osaka',
        chekiSign: 'なぁたん ♡ めっちゃ好きやねん！',
        chekiNote: '「道頓堀の熱気サイコー！みんな、おおきに〜♡」',
        chekiStamp: 'OSAKA FES 🏮'
    },
    {
        id: 'paris',
        name: 'パリ · エッフェル塔 CONCERT',
        subname: 'PARIS EIFFEL TOWER LIVE',
        icon: '✨',
        goalAltitude: 800,
        bgColorTop: '#0d0826',
        bgColorMid: '#38165c',
        bgColorBottom: '#ad1457',
        landmarkName: 'Eiffel Tower Twilight',
        clearReward: 500,
        skyType: 'paris',
        chekiSign: 'なぁたん ♡ Merci Paris!',
        chekiNote: '「エッフェル塔の夕暮れ、みんなと見れて幸せ♡」',
        chekiStamp: 'PARIS LIVE ✨'
    },
    {
        id: 'newyork',
        name: 'ニューヨーク · Broadway STAGE',
        subname: 'NEW YORK TIMES SQUARE',
        icon: '🗽',
        goalAltitude: 950,
        bgColorTop: '#04091a',
        bgColorMid: '#0e2454',
        bgColorBottom: '#00695c',
        landmarkName: 'Manhattan Skyline & Marquee',
        clearReward: 600,
        skyType: 'newyork',
        chekiSign: 'なぁたん ♡ Broadway Dream!',
        chekiNote: '「タイムズスクエアに響く歌声！Dreams Come True★」',
        chekiStamp: 'BROADWAY 🗽'
    },
    {
        id: 'galaxy',
        name: '銀河大舞台 · GALAXY DOME STAGE',
        subname: 'THE GRAND COSMIC FINALE',
        icon: '🌌',
        goalAltitude: 1200,
        bgColorTop: '#02000a',
        bgColorMid: '#160430',
        bgColorBottom: '#311b92',
        landmarkName: 'Cosmic Nebula & Aurora',
        clearReward: 1000,
        skyType: 'galaxy',
        isFinal: true,
        chekiSign: 'なぁたん ♡ Galaxy Tour Finale!',
        chekiNote: '「全宇宙へ愛を込めて！世界一幸せなアイドルだよ★」',
        chekiStamp: 'COSMIC QUEEN 👑'
    }
];

class StageRenderer {
    static renderLandmarks(ctx, stage, cameraY, width, height) {
        ctx.save();
        const baseGroundY = height - (cameraY * 0.15) + 40;

        switch (stage.skyType) {
            case 'tokyo':
                this.drawTokyoSkyline(ctx, baseGroundY, width, height);
                break;
            case 'osaka':
                this.drawOsakaSkyline(ctx, baseGroundY, width, height);
                break;
            case 'paris':
                this.drawParisSkyline(ctx, baseGroundY, width, height);
                break;
            case 'newyork':
                this.drawNewYorkSkyline(ctx, baseGroundY, width, height);
                break;
            case 'galaxy':
                this.drawGalaxySkyline(ctx, baseGroundY, width, height);
                break;
        }
        ctx.restore();
    }

    // Tokyo: Tokyo Tower & Skytree silhouettes with neon windows
    static drawTokyoSkyline(ctx, groundY, w, h) {
        ctx.fillStyle = 'rgba(25, 8, 48, 0.75)';
        // Buildings back layer
        for (let i = 0; i < 9; i++) {
            const bx = i * 55 - 10;
            const bw = 48;
            const bh = 90 + ((i * 37) % 80);
            ctx.fillRect(bx, groundY - bh, bw, bh);
        }

        // Tokyo Tower Silhouette (Right side)
        const tx = w - 110;
        const ty = groundY - 210;
        ctx.fillStyle = '#ff1744';
        // Tokyo tower neon
        // Tower spire
        ctx.fillRect(tx + 28, ty, 4, 70);
        // Middle deck
        ctx.beginPath();
        ctx.moveTo(tx + 15, ty + 70);
        ctx.lineTo(tx + 45, ty + 70);
        ctx.lineTo(tx + 55, ty + 140);
        ctx.lineTo(tx + 5, ty + 140);
        ctx.closePath();
        ctx.fill();
        // Lower legs
        ctx.beginPath();
        ctx.moveTo(tx + 5, ty + 140);
        ctx.lineTo(tx - 10, groundY);
        ctx.lineTo(tx + 70, groundY);
        ctx.lineTo(tx + 55, ty + 140);
        ctx.closePath();
        ctx.fill();

        // Tokyo Skytree (Left side silhouette)
        const sx = 60;
        const sy = groundY - 250;
        ctx.fillStyle = '#80d8ff';
        // Skytree neon
        ctx.fillRect(sx + 14, sy, 3, 90);
        ctx.beginPath();
        ctx.moveTo(sx + 5, sy + 90);
        ctx.lineTo(sx + 26, sy + 90);
        ctx.lineTo(sx + 35, groundY);
        ctx.lineTo(sx - 4, groundY);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    // Osaka: Tsutenkaku Tower & Dotonbori neon billboards
    static drawOsakaSkyline(ctx, groundY, w, h) {
        ctx.fillStyle = 'rgba(40, 10, 45, 0.75)';
        for (let i = 0; i < 8; i++) {
            const bx = i * 62 - 10;
            const bw = 55;
            const bh = 100 + ((i * 43) % 75);
            ctx.fillRect(bx, groundY - bh, bw, bh);
        }

        // Tsutenkaku Tower
        const cx = w / 2 - 25;
        const cy = groundY - 200;
        ctx.fillStyle = '#ffd54f';
        // Tsutenkaku neon
        ctx.fillRect(cx + 23, cy, 4, 50);
        ctx.fillRect(cx + 10, cy + 50, 30, 24);
        ctx.fillRect(cx + 4, cy + 74, 42, 60);
        // Base legs
        ctx.beginPath();
        ctx.moveTo(cx + 4, cy + 134);
        ctx.lineTo(cx - 15, groundY);
        ctx.lineTo(cx + 65, groundY);
        ctx.lineTo(cx + 46, cy + 134);
        ctx.closePath();
        ctx.fill();

        // Dotonbori Neon Billboards
        ctx.fillStyle = '#ff4081';
        ctx.shadowColor = '#ff80ab';
        ctx.shadowBlur = 10;
        ctx.fillRect(30, groundY - 140, 50, 40);
        ctx.fillStyle = '#76ff03';
        ctx.shadowColor = '#b2ff59';
        ctx.fillRect(w - 90, groundY - 130, 55, 36);
        ctx.shadowBlur = 0;
    }

    // Paris: Eiffel Tower & Romantic Parisian rooftops
    static drawParisSkyline(ctx, groundY, w, h) {
        ctx.fillStyle = 'rgba(25, 12, 45, 0.75)';
        for (let i = 0; i < 9; i++) {
            const bx = i * 54 - 10;
            const bw = 48;
            const bh = 70 + ((i * 29) % 45);
            ctx.fillRect(bx, groundY - bh, bw, bh);
            // Mansard roof triangle
            ctx.beginPath();
            ctx.moveTo(bx, groundY - bh);
            ctx.lineTo(bx + bw / 2, groundY - bh - 16);
            ctx.lineTo(bx + bw, groundY - bh);
            ctx.fill();
        }

        // Eiffel Tower (Grand central silhouette)
        const ex = w / 2 - 40;
        const ey = groundY - 240;
        ctx.fillStyle = '#ff80ab';
        ctx.shadowColor = '#f48fb1';
        ctx.shadowBlur = 14;
        // Spire & beacon
        ctx.fillRect(ex + 38, ey, 4, 80);
        // Top platform
        ctx.fillRect(ex + 30, ey + 80, 20, 10);
        // Middle taper
        ctx.beginPath();
        ctx.moveTo(ex + 30, ey + 90);
        ctx.lineTo(ex + 50, ey + 90);
        ctx.lineTo(ex + 62, ey + 150);
        ctx.lineTo(ex + 18, ey + 150);
        ctx.closePath();
        ctx.fill();
        // Lower arch
        ctx.beginPath();
        ctx.moveTo(ex + 18, ey + 150);
        ctx.lineTo(ex - 8, groundY);
        ctx.lineTo(ex + 88, groundY);
        ctx.lineTo(ex + 62, ey + 150);
        ctx.closePath();
        ctx.fill();
        // Cutout arch
        ctx.fillStyle = 'rgba(18, 10, 36, 0.9)';
        ctx.beginPath();
        ctx.arc(ex + 40, groundY, 26, Math.PI, 0);
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    // New York: Empire State & Manhattan Broadway Marquee
    static drawNewYorkSkyline(ctx, groundY, w, h) {
        ctx.fillStyle = 'rgba(10, 20, 48, 0.8)';
        // Manhattan skyscrapers
        for (let i = 0; i < 10; i++) {
            const bx = i * 50 - 10;
            const bw = 44;
            const bh = 110 + ((i * 53) % 110);
            ctx.fillRect(bx, groundY - bh, bw, bh);
        }

        // Empire State Building
        const nx = w / 2 - 25;
        const ny = groundY - 260;
        ctx.fillStyle = '#ffd54f';
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 14;
        ctx.fillRect(nx + 23, ny, 4, 60);
        ctx.fillRect(nx + 16, ny + 60, 18, 30);
        ctx.fillRect(nx + 8, ny + 90, 34, 50);
        ctx.fillRect(nx, ny + 140, 50, groundY - (ny + 140));

        // Broadway Marquee Billboard
        ctx.fillStyle = '#ff3d00';
        ctx.shadowColor = '#ff6e40';
        ctx.shadowBlur = 12;
        ctx.fillRect(35, groundY - 160, 60, 45);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px monospace';
        ctx.fillText('BROADWAY', 40, groundY - 135);
        ctx.shadowBlur = 0;
    }

    // Galaxy: Cosmic nebula, orbital rings & aurora
    static drawGalaxySkyline(ctx, groundY, w, h) {
        ctx.save();
        const time = Date.now() * 0.001;
        // Aurora ribbons
        const grad = ctx.createLinearGradient(0, 0, w, 0);
        grad.addColorStop(0, 'rgba(0, 229, 255, 0.2)');
        grad.addColorStop(0.5, 'rgba(234, 128, 252, 0.25)');
        grad.addColorStop(1, 'rgba(118, 255, 3, 0.2)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(0, h * 0.4);
        for (let x = 0; x <= w; x += 30) {
            const y = h * 0.4 + Math.sin(time + x * 0.02) * 28 + Math.cos(time * 0.7 + x * 0.015) * 20;
            ctx.lineTo(x, y);
        }
        ctx.lineTo(w, h * 0.75);
        ctx.lineTo(0, h * 0.75);
        ctx.closePath();
        ctx.fill();

        // Giant Planet in background
        ctx.fillStyle = '#7c4dff';
        ctx.shadowColor = '#b388ff';
        ctx.shadowBlur = 25;
        ctx.beginPath();
        ctx.arc(w - 75, 140, 55, 0, Math.PI * 2);
        ctx.fill();

        // Planet rings
        ctx.strokeStyle = 'rgba(255, 235, 59, 0.6)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.ellipse(w - 75, 140, 95, 22, -0.4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
}

window.TOUR_STAGES = TOUR_STAGES;
window.StageRenderer = StageRenderer;
