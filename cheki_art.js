// Procedural 16-bit Pixel Art Portrait of "Naatan" for the Cheki Polaroid Photo
class PixelArtCheki {
    static drawToCanvas(canvas, currentStage, equippedItem = 'mic') {
        const ctx = canvas.getContext('2d');
        const W = canvas.width;
        const H = canvas.height;

        // Use pixelated crisp rendering
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, W, H);

        // 1. Pixel Concert Stage Background (Lens flares & spotlights)
        const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
        bgGrad.addColorStop(0, '#120426');
        bgGrad.addColorStop(0.5, '#2d0947');
        bgGrad.addColorStop(1, '#561066');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, W, H);

        // Stage Backlight spots
        this.drawPixelSpot(ctx, W * 0.25, 20, '#00e5ff', 35);
        this.drawPixelSpot(ctx, W * 0.75, 18, '#ff4081', 40);
        this.drawPixelSpot(ctx, W * 0.88, 35, '#ffeb3b', 24);

        // Floating retro sparkles in air
        const sparkles = [
            { x: 22, y: 35, c: '#ffd54f' }, { x: 50, y: 15, c: '#ffffff' },
            { x: W - 30, y: 45, c: '#80d8ff' }, { x: W - 55, y: 22, c: '#ff80ab' },
            { x: 35, y: H - 35, c: '#ffff00' }, { x: W - 40, y: H - 40, c: '#ffffff' }
        ];
        sparkles.forEach(s => this.drawPixelStar(ctx, s.x, s.y, s.c));

        // 2. High Side Ponytail (Left of viewer / idol's right)
        // Warm chestnut brown hair
        ctx.fillStyle = '#4a221a';
        // Ponytail curve
        ctx.fillRect(40, 38, 22, 50);
        ctx.fillRect(32, 50, 24, 45);
        ctx.fillRect(28, 70, 22, 38);
        ctx.fillRect(24, 88, 16, 26);
        // Ponytail highlights
        ctx.fillStyle = '#7a3e30';
        ctx.fillRect(44, 42, 6, 36);
        ctx.fillRect(36, 56, 5, 40);

        // 3. Red & White Gingham (Checkered) Big Bow on Ponytail
        this.drawGinghamBow(ctx, 48, 36);

        // 4. Voluminous Puffy Ruffled Sleeves (Shoulders)
        // Left Puffy Shoulder (Gingham + White Lace Frills)
        this.drawPuffySleeve(ctx, 32, 102, -1);
        // Right Puffy Shoulder
        this.drawPuffySleeve(ctx, W - 45, 102, 1);

        // 5. Body & Red Gingham Corset Bodice Top
        this.drawBodice(ctx, W / 2, 110);

        // 6. Neck & Face (Soft Fair Anime Skin)
        ctx.fillStyle = '#fff0ea';
        // Neck
        ctx.fillRect(W / 2 - 10, 88, 20, 16);
        // Face oval
        ctx.beginPath();
        ctx.arc(W / 2, 68, 26, 0, Math.PI * 2);
        ctx.fill();
        // Jaw line
        ctx.beginPath();
        ctx.moveTo(W / 2 - 24, 68);
        ctx.lineTo(W / 2 - 12, 92);
        ctx.lineTo(W / 2 + 12, 92);
        ctx.lineTo(W / 2 + 24, 68);
        ctx.closePath();
        ctx.fill();

        // 7. Cheerful Blush (Rosy cheeks)
        ctx.fillStyle = 'rgba(255, 90, 120, 0.45)';
        ctx.fillRect(W / 2 - 22, 70, 10, 6);
        ctx.fillRect(W / 2 + 12, 70, 10, 6);

        // 8. Dainty gold earring on left ear
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(W / 2 + 25, 78, 2, 2);

        // 10. Warm Sparkling Eyes
        this.drawPixelEye(ctx, W / 2 - 14, 63);
        this.drawPixelEye(ctx, W / 2 + 8, 63);

        // 11. Radiant Idol Smile (Open mouth with sparkling white teeth!)
        ctx.fillStyle = '#c2185b';
        ctx.beginPath();
        ctx.arc(W / 2 - 2, 78, 7, 0.1, Math.PI - 0.1);
        ctx.closePath();
        ctx.fill();
        // Teeth
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(W / 2 - 6, 78, 8, 3);
        // Tongue
        ctx.fillStyle = '#ff80ab';
        ctx.fillRect(W / 2 - 4, 82, 5, 2);

        // 12. Warm Chestnut Bangs & Hair Framing
        this.drawBangs(ctx, W / 2, 68);

        // 13. Hand & Stage Microphone / Equipped Item
        this.drawStageProp(ctx, W / 2 - 16, 96, equippedItem);

        // 14. Left Arm Pointing Up to the Stars (Iconic Pose)
        this.drawPointingHand(ctx, W - 28, 48);

        // 15. Foreground Stage Glow & Sparkles
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        const spotGrad = ctx.createRadialGradient(W / 2, 80, 10, W / 2, 80, 110);
        spotGrad.addColorStop(0, 'rgba(255, 230, 180, 0.18)');
        spotGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = spotGrad;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
    }

    static drawPuffySleeve(ctx, cx, cy, side) {
        // White lace ruffle base
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(cx, cy, 18, 0, Math.PI * 2);
        ctx.fill();

        // Gingham outer ruffle
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                ctx.fillStyle = ((r + c) % 2 === 0) ? '#e53935' : '#ffcdd2';
                ctx.fillRect(cx - 14 + c * 9, cy - 14 + r * 9, 8, 8);
            }
        }
        ctx.strokeStyle = '#d32f2f';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(cx - 15, cy - 15, 27, 27);
    }

    static drawBodice(ctx, cx, cy) {
        // Red Gingham Body
        for (let r = 0; r < 4; r++) {
            for (let c = -2; c <= 2; c++) {
                ctx.fillStyle = ((r + Math.abs(c)) % 2 === 0) ? '#e53935' : '#ffffff';
                ctx.fillRect(cx + c * 8 - 4, cy + r * 8 - 6, 8, 8);
            }
        }

        // Center White Lace Panel & Red Corset X-Lacing
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx - 7, cy - 6, 14, 32);

        // Red X ribbons
        ctx.strokeStyle = '#d32f2f';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx - 6, cy - 4); ctx.lineTo(cx + 6, cy + 4);
        ctx.moveTo(cx + 6, cy - 4); ctx.lineTo(cx - 6, cy + 4);
        ctx.moveTo(cx - 6, cy + 8); ctx.lineTo(cx + 6, cy + 16);
        ctx.moveTo(cx + 6, cy + 8); ctx.lineTo(cx - 6, cy + 16);
        ctx.stroke();

        // White floral lace collar
        ctx.fillStyle = '#ffffff';
        for (let i = -16; i <= 16; i += 6) {
            ctx.beginPath();
            ctx.arc(cx + i, cy - 7, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    static drawGinghamBow(ctx, bx, by) {
        // Red & White Gingham Check Ribbon
        const size = 6;
        // Left loop
        for (let r = -1; r <= 1; r++) {
            for (let c = -2; c <= 0; c++) {
                ctx.fillStyle = ((r + c) % 2 === 0) ? '#e53935' : '#ffffff';
                ctx.fillRect(bx + c * size, by + r * size, size, size);
            }
        }
        // Right loop
        for (let r = -1; r <= 1; r++) {
            for (let c = 1; c <= 3; c++) {
                ctx.fillStyle = ((r + c) % 2 === 0) ? '#e53935' : '#ffffff';
                ctx.fillRect(bx + c * size, by + r * size, size, size);
            }
        }
        // Center knot
        ctx.fillStyle = '#b71c1c';
        ctx.fillRect(bx - 2, by - 4, 8, 12);
        // Ribbon tails
        ctx.fillStyle = '#e53935';
        ctx.fillRect(bx - 6, by + 10, 5, 14);
        ctx.fillRect(bx + 4, by + 10, 5, 16);
    }

    static drawBangs(ctx, cx, cy) {
        ctx.fillStyle = '#4a221a';
        // Top crown hair
        ctx.beginPath();
        ctx.arc(cx, cy - 4, 28, Math.PI, 0);
        ctx.fill();

        // Elegant see-through bangs stopping right above eyes
        ctx.fillRect(cx - 22, cy - 14, 5, 15);
        ctx.fillRect(cx - 15, cy - 14, 4, 13);
        ctx.fillRect(cx - 8, cy - 14, 4, 12);
        ctx.fillRect(cx - 1, cy - 14, 4, 12);
        ctx.fillRect(cx + 6, cy - 14, 4, 12);
        ctx.fillRect(cx + 13, cy - 14, 4, 14);
        ctx.fillRect(cx + 19, cy - 14, 5, 15);

        // Side hair strands framing face
        ctx.fillRect(cx - 27, cy - 6, 6, 36);
        ctx.fillRect(cx + 21, cy - 6, 6, 34);

        // Soft curved eyebrow arches above eyes
        ctx.fillStyle = '#4a221a';
        ctx.fillRect(cx - 14, cy - 8, 7, 2);
        ctx.fillRect(cx + 8, cy - 8, 7, 2);

        // Hair glossy shine highlight
        ctx.fillStyle = 'rgba(255, 235, 220, 0.45)';
        ctx.fillRect(cx - 16, cy - 20, 32, 4);
    }

    static drawPixelEye(ctx, x, y) {
        // 1. Sclera (White eye background)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x, y + 1, 8, 8);

        // 2. Deep warm dark chestnut iris
        ctx.fillStyle = '#26120e';
        ctx.fillRect(x + 1, y + 1, 6, 8);

        // 3. Lower warm honey-amber glow
        ctx.fillStyle = '#d35400';
        ctx.fillRect(x + 2, y + 4, 4, 4);
        ctx.fillStyle = '#f39c12';
        ctx.fillRect(x + 2, y + 6, 4, 2);

        // 4. Centered dark round pupil
        ctx.fillStyle = '#100503';
        ctx.fillRect(x + 2, y + 3, 3, 3);

        // 5. Crisp round top-left catchlight highlight
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 1, y + 1, 2, 2);

        // 6. Subtle bottom-right eye shine
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillRect(x + 4, y + 6, 1, 1);

        // 7. Upper dark eyeliner & outer lash flick
        ctx.fillStyle = '#1a0805';
        ctx.fillRect(x - 1, y - 1, 9, 2);
        ctx.fillRect(x + 7, y - 2, 2, 2);
    }

    static drawStageProp(ctx, x, y, item) {
        if (item === 'guitar') {
            // Rock Idol Electric Guitar
            ctx.fillStyle = '#d50000';
            ctx.fillRect(x - 14, y - 10, 24, 20);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(x - 8, y - 6, 12, 12);
            // Guitar neck
            ctx.fillStyle = '#8d6e63';
            ctx.fillRect(x - 26, y - 24, 16, 6);
        } else if (item === 'wand') {
            // Magical Star Wand
            ctx.fillStyle = '#ffd54f';
            ctx.shadowColor = '#ffff00';
            ctx.shadowBlur = 8;
            this.drawPixelStar(ctx, x - 4, y - 12, '#ffd700');
            ctx.fillStyle = '#ff80ab';
            ctx.fillRect(x - 2, y - 6, 4, 20);
            ctx.shadowBlur = 0;
        } else {
            // Default: Handheld Wireless Stage Microphone
            ctx.fillStyle = '#fff0ea'; // Hand holding mic
            ctx.fillRect(x - 4, y - 2, 10, 8);
            // Mic handle (black)
            ctx.fillStyle = '#212121';
            ctx.fillRect(x - 3, y - 16, 6, 18);
            // Mic silver mesh head
            ctx.fillStyle = '#b0bec5';
            ctx.fillRect(x - 4, y - 22, 8, 8);
            // Red ring on mic
            ctx.fillStyle = '#ff1744';
            ctx.fillRect(x - 3, y - 15, 6, 2);
        }
    }

    static drawPointingHand(ctx, x, y) {
        ctx.fillStyle = '#fff0ea';
        // Raised forearm
        ctx.fillRect(x - 4, y + 6, 8, 22);
        // Hand
        ctx.fillRect(x - 4, y, 8, 7);
        // Extended pointing index finger (☝)
        ctx.fillRect(x - 2, y - 8, 4, 9);
        // Sparkle at finger tip
        ctx.fillStyle = '#ffff00';
        ctx.shadowColor = '#fff59d';
        ctx.shadowBlur = 5;
        this.drawPixelDiamond(ctx, x, y - 12, 3);
        ctx.shadowBlur = 0;
    }

    static drawPixelStar(ctx, cx, cy, color) {
        ctx.fillStyle = color;
        ctx.fillRect(cx - 1, cy - 4, 3, 9);
        ctx.fillRect(cx - 4, cy - 1, 9, 3);
    }

    static drawPixelDiamond(ctx, cx, cy, r) {
        ctx.beginPath();
        ctx.moveTo(cx, cy - r);
        ctx.lineTo(cx + r, cy);
        ctx.lineTo(cx, cy + r);
        ctx.lineTo(cx - r, cy);
        ctx.closePath();
        ctx.fill();
    }

    static drawPixelHeart(ctx, x, y, s) {
        ctx.beginPath();
        ctx.arc(x - s / 2, y - s / 2, s / 2, Math.PI, 0);
        ctx.arc(x + s / 2, y - s / 2, s / 2, Math.PI, 0);
        ctx.lineTo(x, y + s);
        ctx.closePath();
        ctx.fill();
    }

    static drawPixelSpot(ctx, cx, cy, color, r) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, r);
        grad.addColorStop(0, color);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

window.PixelArtCheki = PixelArtCheki;
