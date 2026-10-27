// Procedural 16-bit Pixel Art Portrait of "Naatan" for the Cheki Polaroid Photo
// Renders unique city-themed backgrounds, poses, expressions, and accessories for each tour stop!
class PixelArtCheki {
    static drawToCanvas(canvas, currentStage, equippedItem = 'mic', isGameOver = false) {
        const ctx = canvas.getContext('2d');
        const W = canvas.width;
        const H = canvas.height;

        // Use pixelated crisp retro rendering
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, W, H);

        const stageId = isGameOver ? 'encore' : (currentStage ? (currentStage.id || 'tokyo') : 'tokyo');

        // 1. Unique Landmark / Skyline Background for each city
        this.drawCityBackground(ctx, W, H, stageId);

        // 2. City-themed ambient effects (Lanterns, Rose Petals, Confetti, Aurora, Stage Lights)
        this.drawCityAtmosphere(ctx, W, H, stageId);

        // 3. Angel Wings (for Galaxy Queen Finale or Wings accessory)
        if (stageId === 'galaxy' || equippedItem === 'wings') {
            this.drawPixelAngelWings(ctx, W / 2, 85);
        }

        // 4. Side Ponytail & Highlights
        this.drawPonytail(ctx, W / 2, stageId);

        // 5. Puffy Ruffled Gingham Sleeves
        this.drawPuffySleeve(ctx, 30, 104, -1);
        this.drawPuffySleeve(ctx, W - 44, 104, 1);

        // 6. Red Gingham Corset Bodice Top
        this.drawBodice(ctx, W / 2, 110, stageId);

        // 7. Face, Neck, Cheerful Rosy Blush
        this.drawFaceBase(ctx, W / 2, 68);

        // 8. Eyes & Expression (Customized per city!)
        this.drawCityEyes(ctx, W / 2, 63, stageId);

        // 9. Radiant Idol Smile
        this.drawCitySmile(ctx, W / 2, 78, stageId);

        // 10. Bangs & Hair Framing
        this.drawBangs(ctx, W / 2, 68);

        // 11. Headwear & City Accessories (Beret, Crown, Gingham Bow, Star Clips)
        this.drawCityHeadwear(ctx, W / 2, 68, stageId);

        // 12. City Specific Poses, Arms & Props
        this.drawCityPoseAndProps(ctx, W, H, stageId, equippedItem);

        // 13. Foreground Stage Flare / Glow
        this.drawForegroundGlow(ctx, W, H, stageId);
    }

    // 1. City-Specific Pixel Art Backgrounds
    static drawCityBackground(ctx, W, H, stageId) {
        let bgGrad;
        switch (stageId) {
            case 'osaka':
                // Dotonbori Warm Golden-Orange Festive Sunset
                bgGrad = ctx.createLinearGradient(0, 0, 0, H);
                bgGrad.addColorStop(0, '#1a0528');
                bgGrad.addColorStop(0.45, '#5c1032');
                bgGrad.addColorStop(0.85, '#d35400');
                bgGrad.addColorStop(1, '#e67e22');
                ctx.fillStyle = bgGrad;
                ctx.fillRect(0, 0, W, H);

                // Tsutenkaku Tower Silhouette (Left side)
                ctx.fillStyle = '#2c0c28';
                ctx.fillRect(16, 55, 14, 40);
                ctx.fillRect(20, 32, 6, 23);
                ctx.fillRect(22, 18, 2, 14);
                // Gold beacon
                ctx.fillStyle = '#ffd54f';
                ctx.fillRect(21, 15, 4, 4);

                // Dotonbori Glico Neon Billboard Glow
                ctx.fillStyle = 'rgba(118, 255, 3, 0.25)';
                ctx.fillRect(W - 48, 40, 36, 42);
                ctx.fillStyle = '#ff4081';
                ctx.fillRect(W - 42, 46, 24, 6);
                ctx.fillStyle = '#76ff03';
                ctx.fillRect(W - 36, 56, 12, 18);
                break;

            case 'paris':
                // Romantic Paris Twilight Sunset (Indigo to Dusty Rose Peach)
                bgGrad = ctx.createLinearGradient(0, 0, 0, H);
                bgGrad.addColorStop(0, '#0a0a26');
                bgGrad.addColorStop(0.4, '#301248');
                bgGrad.addColorStop(0.75, '#8e24aa');
                bgGrad.addColorStop(1, '#f48fb1');
                ctx.fillStyle = bgGrad;
                ctx.fillRect(0, 0, W, H);

                // Eiffel Tower Silhouette (Prominent in center background)
                ctx.fillStyle = 'rgba(45, 15, 55, 0.85)';
                // Spire
                ctx.fillRect(W / 2 - 2, 14, 4, 30);
                // Top platform
                ctx.fillRect(W / 2 - 6, 44, 12, 6);
                // Mid tower taper
                ctx.beginPath();
                ctx.moveTo(W / 2 - 6, 50);
                ctx.lineTo(W / 2 + 6, 50);
                ctx.lineTo(W / 2 + 16, 85);
                ctx.lineTo(W / 2 - 16, 85);
                ctx.closePath();
                ctx.fill();
                // Beacon light at apex
                ctx.fillStyle = '#fff59d';
                ctx.fillRect(W / 2 - 1, 11, 2, 3);
                // Mansard rooftops
                ctx.fillStyle = 'rgba(30, 8, 40, 0.7)';
                ctx.fillRect(6, 68, 30, 25);
                ctx.fillRect(W - 36, 65, 30, 28);
                break;

            case 'newyork':
                // Manhattan Broadway Night (Deep Navy to Broadway Teal)
                bgGrad = ctx.createLinearGradient(0, 0, 0, H);
                bgGrad.addColorStop(0, '#03081c');
                bgGrad.addColorStop(0.5, '#0e2354');
                bgGrad.addColorStop(1, '#005b64');
                ctx.fillStyle = bgGrad;
                ctx.fillRect(0, 0, W, H);

                // Empire State Spire Silhouette
                ctx.fillStyle = '#0a1636';
                ctx.fillRect(22, 45, 18, 48);
                ctx.fillRect(28, 25, 6, 20);
                ctx.fillRect(30, 12, 2, 13);
                // Spire LED lights
                ctx.fillStyle = '#00e5ff';
                ctx.fillRect(29, 10, 4, 3);

                // Broadway Marquee Billboard
                ctx.fillStyle = '#ffd600';
                ctx.fillRect(W - 55, 26, 46, 26);
                ctx.fillStyle = '#b71c1c';
                ctx.fillRect(W - 53, 28, 42, 22);
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 7px monospace';
                ctx.fillText('STAGE', W - 47, 42);
                break;

            case 'galaxy':
                // Grand Cosmic Finale (Deep Obsidian to Cosmic Violet Nebula)
                bgGrad = ctx.createLinearGradient(0, 0, 0, H);
                bgGrad.addColorStop(0, '#01000a');
                bgGrad.addColorStop(0.5, '#160432');
                bgGrad.addColorStop(1, '#3b1275');
                ctx.fillStyle = bgGrad;
                ctx.fillRect(0, 0, W, H);

                // Saturn-like Giant Ringed Planet (Upper Right)
                ctx.fillStyle = '#7c4dff';
                ctx.beginPath();
                ctx.arc(W - 32, 32, 20, 0, Math.PI * 2);
                ctx.fill();
                // Planet Rings
                ctx.strokeStyle = 'rgba(255, 235, 59, 0.75)';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.ellipse(W - 32, 32, 34, 8, -0.4, 0, Math.PI * 2);
                ctx.stroke();

                // Swirling Aurora Ribbons
                ctx.fillStyle = 'rgba(0, 229, 255, 0.22)';
                ctx.beginPath();
                ctx.moveTo(0, 35);
                ctx.bezierCurveTo(40, 15, 90, 45, W, 20);
                ctx.lineTo(W, 42);
                ctx.bezierCurveTo(90, 60, 40, 30, 0, 50);
                ctx.closePath();
                ctx.fill();
                break;

            case 'encore':
                // Backstage Warm Sunset & Stage Work Lights
                bgGrad = ctx.createLinearGradient(0, 0, 0, H);
                bgGrad.addColorStop(0, '#1c092a');
                bgGrad.addColorStop(0.5, '#45123d');
                bgGrad.addColorStop(1, '#7a2245');
                ctx.fillStyle = bgGrad;
                ctx.fillRect(0, 0, W, H);
                break;

            case 'tokyo':
            default:
                // Tokyo Shibuya Live Stage (Twilight Neon Sky)
                bgGrad = ctx.createLinearGradient(0, 0, 0, H);
                bgGrad.addColorStop(0, '#120426');
                bgGrad.addColorStop(0.5, '#2d0947');
                bgGrad.addColorStop(1, '#561066');
                ctx.fillStyle = bgGrad;
                ctx.fillRect(0, 0, W, H);

                // Tokyo Skytree (Left cyan spire)
                ctx.fillStyle = '#00e5ff';
                ctx.fillRect(18, 30, 2, 45);
                ctx.fillRect(16, 48, 6, 4);

                // Tokyo Tower (Right red spire)
                ctx.fillStyle = '#ff1744';
                ctx.fillRect(W - 24, 25, 2, 50);
                ctx.fillRect(W - 27, 44, 8, 4);
                break;
        }
    }

    // 2. City-Specific Atmospheric Effects
    static drawCityAtmosphere(ctx, W, H, stageId) {
        if (stageId === 'osaka') {
            // Hanging Festive Red Paper Lanterns across top!
            const lanternPositions = [22, 52, W - 52, W - 22];
            lanternPositions.forEach(lx => {
                // String wire
                ctx.strokeStyle = '#3e2723';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(lx, 0); ctx.lineTo(lx, 10); ctx.stroke();
                // Red Lantern body
                ctx.fillStyle = '#d50000';
                ctx.fillRect(lx - 5, 10, 10, 13);
                // Golden glow / text center
                ctx.fillStyle = '#ffd54f';
                ctx.fillRect(lx - 2, 13, 4, 7);
                // Bottom black tassel
                ctx.fillStyle = '#212121';
                ctx.fillRect(lx - 1, 23, 2, 3);
            });
            // Golden firework sparkles
            this.drawPixelStar(ctx, 35, 42, '#ffd54f');
            this.drawPixelStar(ctx, W - 30, 25, '#ffeb3b');
        } else if (stageId === 'paris') {
            // Golden crescent moon
            ctx.fillStyle = '#ffd54f';
            ctx.beginPath();
            ctx.arc(W - 28, 22, 9, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#100d2b';
            ctx.beginPath();
            ctx.arc(W - 25, 20, 8, 0, Math.PI * 2);
            ctx.fill();

            // Falling gentle romantic rose petals
            const petals = [
                { x: 18, y: 35 }, { x: 42, y: 55 }, { x: W - 40, y: 48 }, { x: W - 18, y: 70 }
            ];
            petals.forEach(p => {
                ctx.fillStyle = '#ff4081';
                ctx.beginPath();
                ctx.ellipse(p.x, p.y, 3, 2, 0.4, 0, Math.PI * 2);
                ctx.fill();
            });
        } else if (stageId === 'newyork') {
            // Ticker-tape Broadway Confetti Streamers
            const confetti = [
                { x: 14, y: 22, c: '#ffd700', w: 8, h: 2, a: 0.3 },
                { x: 45, y: 15, c: '#00e5ff', w: 7, h: 2, a: -0.4 },
                { x: W - 25, y: 20, c: '#ff4081', w: 8, h: 2, a: 0.5 },
                { x: W - 45, y: 58, c: '#76ff03', w: 6, h: 2, a: -0.3 },
                { x: 28, y: 65, c: '#ffeb3b', w: 7, h: 2, a: 0.2 }
            ];
            confetti.forEach(c => {
                ctx.save();
                ctx.translate(c.x, c.y);
                ctx.rotate(c.a);
                ctx.fillStyle = c.c;
                ctx.fillRect(0, 0, c.w, c.h);
                ctx.restore();
            });
        } else if (stageId === 'galaxy') {
            // Cosmic stardust clusters & shooting star
            for (let i = 0; i < 18; i++) {
                const sx = (i * 37) % W;
                const sy = (i * 53) % 90;
                this.drawPixelStar(ctx, sx, sy, (i % 2 === 0) ? '#ffffff' : '#80d8ff');
            }
            // Shooting star streak
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(15, 15); ctx.lineTo(48, 32); ctx.stroke();
        } else {
            // Tokyo: Concert stage spots
            this.drawPixelSpot(ctx, W * 0.25, 20, '#00e5ff', 35);
            this.drawPixelSpot(ctx, W * 0.75, 18, '#ff4081', 40);
            this.drawPixelSpot(ctx, W * 0.88, 35, '#ffeb3b', 24);
            const sparkles = [
                { x: 22, y: 35, c: '#ffd54f' }, { x: 50, y: 15, c: '#ffffff' },
                { x: W - 30, y: 45, c: '#80d8ff' }, { x: W - 55, y: 22, c: '#ff80ab' }
            ];
            sparkles.forEach(s => this.drawPixelStar(ctx, s.x, s.y, s.c));
        }
    }

    // 3. Angel Wings for Galaxy Finale
    static drawPixelAngelWings(ctx, cx, cy) {
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#80deea';
        ctx.lineWidth = 1.5;

        // Left luminous wing
        ctx.beginPath();
        ctx.moveTo(cx - 16, cy);
        ctx.quadraticCurveTo(cx - 52, cy - 35, cx - 68, cy - 15);
        ctx.quadraticCurveTo(cx - 58, cy + 10, cx - 24, cy + 18);
        ctx.closePath();
        ctx.fill(); ctx.stroke();

        // Right luminous wing
        ctx.beginPath();
        ctx.moveTo(cx + 16, cy);
        ctx.quadraticCurveTo(cx + 52, cy - 35, cx + 68, cy - 15);
        ctx.quadraticCurveTo(cx + 58, cy + 10, cx + 24, cy + 18);
        ctx.closePath();
        ctx.fill(); ctx.stroke();

        // Inner wing glow
        ctx.fillStyle = '#e0f7fa';
        ctx.beginPath();
        ctx.arc(cx - 44, cy - 8, 8, 0, Math.PI * 2);
        ctx.arc(cx + 44, cy - 8, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // 4. Side Ponytail with Hair Highlights
    static drawPonytail(ctx, cx, stageId) {
        ctx.fillStyle = '#4a221a';
        ctx.fillRect(cx - 50, 38, 22, 50);
        ctx.fillRect(cx - 58, 50, 24, 45);
        ctx.fillRect(cx - 62, 70, 22, 38);
        ctx.fillRect(cx - 66, 88, 16, 26);

        // Warm hair highlights
        ctx.fillStyle = '#7a3e30';
        ctx.fillRect(cx - 46, 42, 6, 36);
        ctx.fillRect(cx - 54, 56, 5, 40);
    }

    // 5. Ruffled Gingham Puffy Sleeves
    static drawPuffySleeve(ctx, cx, cy, side) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(cx, cy, 18, 0, Math.PI * 2);
        ctx.fill();

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

    // 6. Bodice Top with Red Corset X-Lacing
    static drawBodice(ctx, cx, cy, stageId) {
        for (let r = 0; r < 4; r++) {
            for (let c = -2; c <= 2; c++) {
                ctx.fillStyle = ((r + Math.abs(c)) % 2 === 0) ? '#e53935' : '#ffffff';
                ctx.fillRect(cx + c * 8 - 4, cy + r * 8 - 6, 8, 8);
            }
        }

        // Center White Lace Panel & Red X-Lacing
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx - 7, cy - 6, 14, 32);

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

        // Special Galaxy Queen LED trim
        if (stageId === 'galaxy') {
            ctx.fillStyle = '#ffd700';
            ctx.fillRect(cx - 16, cy + 24, 32, 3);
        }
    }

    // 7. Face Base & Cheek Rosy Blush
    static drawFaceBase(ctx, cx, cy) {
        ctx.fillStyle = '#fff0ea';
        // Neck
        ctx.fillRect(cx - 10, cy + 20, 20, 16);
        // Face oval
        ctx.beginPath();
        ctx.arc(cx, cy, 26, 0, Math.PI * 2);
        ctx.fill();
        // Chin & jawline
        ctx.beginPath();
        ctx.moveTo(cx - 24, cy);
        ctx.lineTo(cx - 12, cy + 24);
        ctx.lineTo(cx + 12, cy + 24);
        ctx.lineTo(cx + 24, cy);
        ctx.closePath();
        ctx.fill();

        // Sweet natural rosy cheeks
        ctx.fillStyle = 'rgba(255, 95, 125, 0.42)';
        ctx.fillRect(cx - 22, cy + 2, 10, 6);
        ctx.fillRect(cx + 12, cy + 2, 10, 6);

        // Dainty gold earring on ear
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(cx + 25, cy + 10, 2, 2);
    }

    // 8. Eyes & Expression per City
    static drawCityEyes(ctx, cx, cy, stageId) {
        if (stageId === 'tokyo') {
            // Tokyo Debut: Sparkling Left Eye, Cute Winking Right Eye!
            this.drawPixelEye(ctx, cx - 14, cy);
            this.drawPixelWinkEye(ctx, cx + 8, cy);
        } else if (stageId === 'osaka') {
            // Osaka Fes: Joyful Energetic Double-Eyes!
            this.drawPixelEye(ctx, cx - 14, cy);
            this.drawPixelEye(ctx, cx + 8, cy);
        } else if (stageId === 'paris') {
            // Paris Live: Romantic Left Eye, Gentle Chic Wink Right Eye
            this.drawPixelEye(ctx, cx - 14, cy);
            this.drawPixelWinkEye(ctx, cx + 8, cy);
        } else if (stageId === 'newyork') {
            // Broadway Superstar: Confident Superstar Gaze
            this.drawPixelEye(ctx, cx - 14, cy);
            this.drawPixelWinkEye(ctx, cx + 8, cy);
        } else if (stageId === 'galaxy') {
            // Galaxy Cosmic Queen: Both Eyes Wide, Radiant with Celestial Sparkles!
            this.drawPixelEye(ctx, cx - 14, cy);
            this.drawPixelEye(ctx, cx + 8, cy);
        } else {
            // Encore: Sweet happy wink
            this.drawPixelWinkEye(ctx, cx - 14, cy);
            this.drawPixelEye(ctx, cx + 8, cy);
        }
    }

    // Standard Natural Anime Pixel Eye
    static drawPixelEye(ctx, x, y) {
        // Sclera
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x, y + 1, 8, 8);
        // Dark chestnut iris
        ctx.fillStyle = '#26120e';
        ctx.fillRect(x + 1, y + 1, 6, 8);
        // Warm amber gradient
        ctx.fillStyle = '#d35400';
        ctx.fillRect(x + 2, y + 4, 4, 4);
        ctx.fillStyle = '#f39c12';
        ctx.fillRect(x + 2, y + 6, 4, 2);
        // Dark pupil
        ctx.fillStyle = '#100503';
        ctx.fillRect(x + 2, y + 3, 3, 3);
        // Top-left catchlight
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 1, y + 1, 2, 2);
        // Soft bottom shine
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillRect(x + 4, y + 6, 1, 1);
        // Upper eyelash arch
        ctx.fillStyle = '#1a0805';
        ctx.fillRect(x - 1, y - 1, 9, 2);
        ctx.fillRect(x + 7, y - 2, 2, 2);
    }

    // Playful Winking Pixel Eye (^_~)
    static drawPixelWinkEye(ctx, x, y) {
        ctx.fillStyle = '#1a0805';
        // Curved lash line
        ctx.fillRect(x - 1, y + 2, 3, 2);
        ctx.fillRect(x + 2, y + 1, 4, 2);
        ctx.fillRect(x + 6, y + 2, 3, 2);
        ctx.fillRect(x + 8, y, 2, 2); // outer lash flick
    }

    // 9. City-Specific Smiles
    static drawCitySmile(ctx, cx, cy, stageId) {
        ctx.fillStyle = '#c2185b';
        ctx.beginPath();
        ctx.arc(cx - 2, cy, 7, 0.1, Math.PI - 0.1);
        ctx.closePath();
        ctx.fill();

        // White teeth
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx - 6, cy, 8, 3);
        // Pink tongue
        ctx.fillStyle = '#ff80ab';
        ctx.fillRect(cx - 4, cy + 4, 5, 2);
    }

    // 10. Bangs & Framing Hair
    static drawBangs(ctx, cx, cy) {
        ctx.fillStyle = '#4a221a';
        ctx.beginPath();
        ctx.arc(cx, cy - 4, 28, Math.PI, 0);
        ctx.fill();

        // See-through bangs neatly framed above eyes
        ctx.fillRect(cx - 22, cy - 14, 5, 15);
        ctx.fillRect(cx - 15, cy - 14, 4, 13);
        ctx.fillRect(cx - 8, cy - 14, 4, 12);
        ctx.fillRect(cx - 1, cy - 14, 4, 12);
        ctx.fillRect(cx + 6, cy - 14, 4, 12);
        ctx.fillRect(cx + 13, cy - 14, 4, 14);
        ctx.fillRect(cx + 19, cy - 14, 5, 15);

        // Side locks
        ctx.fillRect(cx - 27, cy - 6, 6, 36);
        ctx.fillRect(cx + 21, cy - 6, 6, 34);

        // Soft eyebrows
        ctx.fillStyle = '#4a221a';
        ctx.fillRect(cx - 14, cy - 8, 7, 2);
        ctx.fillRect(cx + 8, cy - 8, 7, 2);

        // Hair shine highlight
        ctx.fillStyle = 'rgba(255, 235, 220, 0.45)';
        ctx.fillRect(cx - 16, cy - 20, 32, 4);
    }

    // 11. City-Specific Headwear & Hair Accessories
    static drawCityHeadwear(ctx, cx, cy, stageId) {
        if (stageId === 'paris') {
            // French Chic Parisian Beret (Tilted cute dark beret with gold pin)
            ctx.fillStyle = '#b71c1c';
            ctx.beginPath();
            ctx.ellipse(cx - 4, cy - 22, 24, 10, -0.2, 0, Math.PI * 2);
            ctx.fill();
            // Beret center stem
            ctx.fillStyle = '#7f0000';
            ctx.fillRect(cx - 5, cy - 32, 3, 5);
            // Golden star brooch on beret
            ctx.fillStyle = '#ffd54f';
            ctx.fillRect(cx + 10, cy - 22, 4, 4);
        } else if (stageId === 'galaxy') {
            // Cosmic Queen Golden Crown
            ctx.fillStyle = '#ffd700';
            ctx.beginPath();
            ctx.moveTo(cx - 16, cy - 24);
            ctx.lineTo(cx - 20, cy - 36);
            ctx.lineTo(cx - 8, cy - 28);
            ctx.lineTo(cx, cy - 40); // tall center peak
            ctx.lineTo(cx + 8, cy - 28);
            ctx.lineTo(cx + 20, cy - 36);
            ctx.lineTo(cx + 16, cy - 24);
            ctx.closePath();
            ctx.fill();
            // Crown jewels
            ctx.fillStyle = '#ff4081'; ctx.fillRect(cx - 1, cy - 35, 3, 3);
            ctx.fillStyle = '#00e5ff'; ctx.fillRect(cx - 18, cy - 32, 3, 3);
            ctx.fillStyle = '#76ff03'; ctx.fillRect(cx + 16, cy - 32, 3, 3);
        } else if (stageId === 'osaka') {
            // Osaka Festival Red & Gold Ribbon + Fan Hairclip
            this.drawGinghamBow(ctx, cx - 42, 36);
            ctx.fillStyle = '#ffd700';
            ctx.fillRect(cx - 44, 34, 6, 6);
        } else if (stageId === 'newyork') {
            // Broadway Golden Star Hairpins
            this.drawGinghamBow(ctx, cx - 42, 36);
            this.drawPixelStar(ctx, cx + 18, cy - 18, '#ffd54f');
            this.drawPixelStar(ctx, cx - 18, cy - 18, '#00e5ff');
        } else {
            // Default Tokyo Debut: Big Red & White Gingham Bow!
            this.drawGinghamBow(ctx, cx - 42, 36);
        }
    }

    // 12. City Specific Poses, Arms & Props
    static drawCityPoseAndProps(ctx, W, H, stageId, equippedItem) {
        const cx = W / 2;

        if (stageId === 'osaka') {
            // Double Peace Sign Pose ✌(^_^)✌
            this.drawPeaceHand(ctx, cx - 28, 72, -1);
            this.drawPeaceHand(ctx, cx + 28, 72, 1);
            // Mic held in belt or near waist
            this.drawStageProp(ctx, cx - 14, 98, equippedItem);
        } else if (stageId === 'paris') {
            // One-hand sweet heart sign by cheek ♡, other holding mic
            this.drawHeartHand(ctx, cx + 26, 70);
            this.drawStageProp(ctx, cx - 16, 96, equippedItem);
        } else if (stageId === 'newyork') {
            // Broadway Rockstar Pose: Mic held high, triumph hand!
            this.drawStageProp(ctx, cx - 18, 92, equippedItem);
            this.drawPointingHand(ctx, W - 26, 44);
        } else if (stageId === 'galaxy') {
            // Holding celestial glowing star wand to the side!
            this.drawStageProp(ctx, cx + 18, 94, 'wand');
            this.drawPointingHand(ctx, W - 28, 48);
        } else {
            // Default Tokyo: Pointing to stars + mic
            this.drawStageProp(ctx, cx - 16, 96, equippedItem);
            this.drawPointingHand(ctx, W - 28, 48);
        }
    }

    // Gingham Bow (authentic red and white check)
    static drawGinghamBow(ctx, bx, by) {
        const size = 6;
        for (let r = -1; r <= 1; r++) {
            for (let c = -2; c <= 0; c++) {
                ctx.fillStyle = ((r + c) % 2 === 0) ? '#e53935' : '#ffffff';
                ctx.fillRect(bx + c * size, by + r * size, size, size);
            }
        }
        for (let r = -1; r <= 1; r++) {
            for (let c = 1; c <= 3; c++) {
                ctx.fillStyle = ((r + c) % 2 === 0) ? '#e53935' : '#ffffff';
                ctx.fillRect(bx + c * size, by + r * size, size, size);
            }
        }
        ctx.fillStyle = '#b71c1c';
        ctx.fillRect(bx - 2, by - 4, 8, 12);
        ctx.fillStyle = '#e53935';
        ctx.fillRect(bx - 6, by + 10, 5, 14);
        ctx.fillRect(bx + 4, by + 10, 5, 16);
    }

    // Peaceful V-Hand Gesture (✌)
    static drawPeaceHand(ctx, x, y, dir) {
        ctx.fillStyle = '#fff0ea';
        ctx.fillRect(x - 4, y, 8, 8);
        // Two fingers up in V
        ctx.fillRect(x - 4, y - 8, 3, 8);
        ctx.fillRect(x + 2, y - 8, 3, 8);
    }

    // Sweet One-Hand Cheek Heart Gesture (♡)
    static drawHeartHand(ctx, x, y) {
        ctx.fillStyle = '#fff0ea';
        ctx.fillRect(x - 5, y, 10, 8);
        // Curved thumb & index finger forming half-heart near cheek
        ctx.fillRect(x - 5, y - 6, 3, 6);
        ctx.fillRect(x - 2, y - 8, 6, 3);
        ctx.fillRect(x + 4, y - 6, 3, 5);
        // Little sparkling heart bubble
        ctx.fillStyle = '#ff4081';
        this.drawPixelHeart(ctx, x + 8, y - 10, 3);
    }

    // Stage Handheld Props
    static drawStageProp(ctx, x, y, item) {
        if (item === 'guitar') {
            ctx.fillStyle = '#d50000';
            ctx.fillRect(x - 14, y - 10, 24, 20);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(x - 8, y - 6, 12, 12);
            ctx.fillStyle = '#8d6e63';
            ctx.fillRect(x - 26, y - 24, 16, 6);
        } else if (item === 'wand') {
            ctx.fillStyle = '#ffd54f';
            ctx.shadowColor = '#ffff00';
            ctx.shadowBlur = 8;
            this.drawPixelStar(ctx, x - 4, y - 12, '#ffd700');
            ctx.fillStyle = '#ff80ab';
            ctx.fillRect(x - 2, y - 6, 4, 20);
            ctx.shadowBlur = 0;
        } else {
            // Default Handheld Stage Mic
            ctx.fillStyle = '#fff0ea';
            ctx.fillRect(x - 4, y - 2, 10, 8);
            ctx.fillStyle = '#212121';
            ctx.fillRect(x - 3, y - 16, 6, 18);
            ctx.fillStyle = '#b0bec5';
            ctx.fillRect(x - 4, y - 22, 8, 8);
            ctx.fillStyle = '#ff1744';
            ctx.fillRect(x - 3, y - 15, 6, 2);
        }
    }

    // Iconic Pointing Hand (☝)
    static drawPointingHand(ctx, x, y) {
        ctx.fillStyle = '#fff0ea';
        ctx.fillRect(x - 4, y + 6, 8, 22);
        ctx.fillRect(x - 4, y, 8, 7);
        ctx.fillRect(x - 2, y - 8, 4, 9);
        // Twinkling sparkle at fingertip
        ctx.fillStyle = '#ffff00';
        ctx.shadowColor = '#fff59d';
        ctx.shadowBlur = 5;
        this.drawPixelDiamond(ctx, x, y - 12, 3);
        ctx.shadowBlur = 0;
    }

    // Foreground Stage Lighting Glow
    static drawForegroundGlow(ctx, W, H, stageId) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        let spotColor = 'rgba(255, 230, 180, 0.18)';
        if (stageId === 'osaka') spotColor = 'rgba(255, 179, 0, 0.2)';
        else if (stageId === 'paris') spotColor = 'rgba(255, 128, 171, 0.2)';
        else if (stageId === 'newyork') spotColor = 'rgba(0, 229, 255, 0.18)';
        else if (stageId === 'galaxy') spotColor = 'rgba(234, 128, 252, 0.25)';

        const spotGrad = ctx.createRadialGradient(W / 2, 80, 10, W / 2, 80, 115);
        spotGrad.addColorStop(0, spotColor);
        spotGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = spotGrad;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
    }

    // Pixel Helpers
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
