// Canvas roundRect Polyfill for universal browser compatibility
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r = 0) {
        if (typeof r === 'number') r = { tl: r, tr: r, br: r, bl: r };
        this.beginPath();
        this.moveTo(x + (r.tl || 0), y);
        this.lineTo(x + w - (r.tr || 0), y);
        this.quadraticCurveTo(x + w, y, x + w, y + (r.tr || 0));
        this.lineTo(x + w, y + h - (r.br || 0));
        this.quadraticCurveTo(x + w, y + h, x + w - (r.br || 0), y + h);
        this.lineTo(x + (r.bl || 0), y + h);
        this.quadraticCurveTo(x, y + h, x, y + h - (r.bl || 0));
        this.lineTo(x, y + (r.tl || 0));
        this.quadraticCurveTo(x, y, x + (r.tl || 0), y);
        this.closePath();
        return this;
    };
}

// Main Game Loop, Tour Stages, Platforms, HUD, and City Clear Mechanics
class StarIdolGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        // Dynamic internal resolution
        this.width = 480;
        this.height = 720;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.keys = {};
        this.lastTime = 0;
        this.state = 'START'; // 'START', 'PLAYING', 'PAUSED', 'CLEAR', 'GAMEOVER'

        // Tour Stage System
        this.currentStageIndex = parseInt(localStorage.getItem('star_idol_stage_index') || '0', 10);
        if (window.TOUR_STAGES && this.currentStageIndex >= window.TOUR_STAGES.length) {
            this.currentStageIndex = 0;
        }
        this.currentStage = (window.TOUR_STAGES && window.TOUR_STAGES[this.currentStageIndex]) ? window.TOUR_STAGES[this.currentStageIndex] : {
            id: 'tokyo', name: '東京 · 渋谷 STAGE', icon: '🗼', goalAltitude: 500, clearReward: 300,
            bgColorTop: '#120529', bgColorMid: '#2e0e4e', bgColorBottom: '#5c1775'
        };
        this.stageCleared = false;
        this.finalPlatformSpawned = false;

        // Game Stats
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('star_idol_high_score') || '0', 10);
        this.lives = 3;
        this.maxLives = 3;
        this.combo = 0;
        this.comboTimer = 0;
        this.altitude = 0; // In meters
        this.maxAltitude = 0;
        this.cheerMeter = 0; // 0 to 100%

        // Camera
        this.cameraY = 0;
        this.screenShake = 0;

        // Player
        this.player = new IdolPlayer(this.width / 2, this.height - 120);

        // Game Entities
        this.platforms = [];
        this.collectibles = [];
        this.particles = [];
        this.floatingTexts = [];
        this.spotlights = [];
        this.penlights = []; // Crowd lightsticks
        this.crowdCalls = []; // Audience cheering call bubbles
        this.ambientCallTimer = 0;

        this.initSpotlights();
        this.initPenlights();
        this.initInputs();
        this.resizeCanvas();

        window.addEventListener('resize', () => this.resizeCanvas());

        // Start animation loop
        requestAnimationFrame((t) => this.loop(t));
    }

    resizeCanvas() {
        const aspect = this.width / this.height;
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        let scale = Math.min(windowWidth / this.width, windowHeight / this.height);
        scale = Math.max(0.6, Math.min(scale, 1.4));

        this.canvas.style.width = `${Math.floor(this.width * scale)}px`;
        this.canvas.style.height = `${Math.floor(this.height * scale)}px`;
    }

    initSpotlights() {
        this.spotlights = [
            { x: 80, angle: 0.3, speed: 0.8, color: 'rgba(255, 100, 200, 0.15)', range: 0.5 },
            { x: this.width - 80, angle: -0.3, speed: -0.7, color: 'rgba(100, 200, 255, 0.15)', range: 0.5 },
            { x: this.width / 2, angle: 0, speed: 1.2, color: 'rgba(255, 230, 100, 0.12)', range: 0.6 }
        ];
    }

    initPenlights() {
        this.penlights = [];
        const count = 32;
        const colors = ['#ff4081', '#00e5ff', '#ffeb3b', '#e040fb', '#76ff03'];
        for (let i = 0; i < count; i++) {
            this.penlights.push({
                x: (i / count) * this.width + (Math.random() * 8),
                baseY: this.height - 10,
                color: colors[i % colors.length],
                phase: Math.random() * Math.PI * 2,
                speed: 3 + Math.random() * 2,
                height: 16 + Math.random() * 10
            });
        }
    }

    initInputs() {
        window.addEventListener('keydown', (e) => {
            if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
                e.preventDefault();
            }

            this.keys[e.code] = true;

            // Start game or jump
            if (this.state === 'START' || this.state === 'GAMEOVER') {
                if (e.code === 'Space' || e.code === 'Enter') {
                    this.startGame();
                    return;
                }
            }

            if (this.state === 'PLAYING') {
                if (e.code === 'KeyP' || e.code === 'Escape') {
                    this.togglePause();
                    return;
                }
                if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'KeyK') {
                    this.player.jump();
                }
            }

            if (e.code === 'KeyM') {
                const muted = window.soundManager.toggleMute();
                this.addFloatingText(this.width / 2, this.cameraY + 200, muted ? 'SOUND: OFF' : 'SOUND: ON', '#ffffff');
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });

        // Touch / Click on buttons
        const btnLeft = document.getElementById('btnLeft');
        const btnRight = document.getElementById('btnRight');
        const btnJump = document.getElementById('btnJump');

        const bindTouch = (elem, code) => {
            if (!elem) return;
            elem.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.keys[code] = true;
                if (code === 'Space' && this.state === 'PLAYING') this.player.jump();
            });
            elem.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.keys[code] = false;
            });
            elem.addEventListener('mousedown', () => {
                this.keys[code] = true;
                if (code === 'Space' && this.state === 'PLAYING') this.player.jump();
            });
            elem.addEventListener('mouseup', () => this.keys[code] = false);
            elem.addEventListener('mouseleave', () => this.keys[code] = false);
        };

        bindTouch(btnLeft, 'ArrowLeft');
        bindTouch(btnRight, 'ArrowRight');
        bindTouch(btnJump, 'Space');

        // Start Buttons
        const startOverlay = document.getElementById('startOverlay');
        const startBtn = document.getElementById('startBtn');
        if (startBtn) {
            startBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.state === 'START') this.startGame();
            });
        }
        if (startOverlay) {
            startOverlay.addEventListener('click', (e) => {
                if (e.target.id === 'startShopBtn') return;
                if (this.state === 'START') this.startGame();
            });
        }

        const restartBtn = document.getElementById('restartBtn');
        if (restartBtn) {
            restartBtn.addEventListener('click', () => this.startGame());
        }

        // Tour Stage Clear Buttons
        const nextStageBtn = document.getElementById('nextStageBtn');
        if (nextStageBtn) {
            nextStageBtn.addEventListener('click', () => this.nextStage());
        }

        const retryStageBtn = document.getElementById('retryStageBtn');
        if (retryStageBtn) {
            retryStageBtn.addEventListener('click', () => {
                document.getElementById('stageClearOverlay').style.display = 'none';
                this.startGame();
            });
        }

        // Shop Buttons
        ['shopBtnFloat', 'startShopBtn', 'clearShopBtn', 'pauseShopBtn', 'gameOverShopBtn'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (window.idolShop) window.idolShop.open();
            });
        });

        const closeShopBtn = document.getElementById('closeShopBtn');
        if (closeShopBtn) {
            closeShopBtn.addEventListener('click', () => {
                if (window.idolShop) window.idolShop.close();
            });
        }

        const muteBtn = document.getElementById('muteBtn');
        if (muteBtn) {
            muteBtn.addEventListener('click', () => {
                const muted = window.soundManager.toggleMute();
                muteBtn.textContent = muted ? '🔇' : '🔊';
            });
        }
    }

    startGame() {
        this.state = 'PLAYING';
        this.currentStage = (window.TOUR_STAGES && window.TOUR_STAGES[this.currentStageIndex]) 
            ? window.TOUR_STAGES[this.currentStageIndex] 
            : { id: 'tokyo', name: '東京 · 渋谷 STAGE', goalAltitude: 500, clearReward: 300 };

        this.stageCleared = false;
        this.finalPlatformSpawned = false;

        // Reset key states to prevent stuck controls
        this.keys = {};

        this.score = 0;
        this.lives = this.maxLives;
        this.combo = 0;
        this.comboTimer = 0;
        this.altitude = 0;
        this.maxAltitude = 0;
        this.cheerMeter = 0;
        this.cameraY = 0;
        this.screenShake = 0;

        this.platforms = [];
        this.collectibles = [];
        this.particles = [];
        this.floatingTexts = [];
        this.crowdCalls = [];

        // Build starting safety concert stage
        this.platforms.push({
            x: 0,
            y: this.height - 40,
            width: this.width,
            height: 40,
            type: 'stage',
            color: '#7b1fa2'
        });

        // Initial set of climbing platforms (plenty of footholds)
        let currentY = this.height - 120;
        for (let i = 0; i < 14; i++) {
            currentY -= 65 + Math.random() * 25;
            this.generatePlatform(currentY);
        }

        this.player.reset(this.width / 2, this.height - 100);

        // Sync equipped items from shop
        if (window.idolShop) {
            this.player.equippedProp = window.idolShop.equipped.prop || 'mic';
            this.player.equippedHead = window.idolShop.equipped.head || 'ribbon';
            this.player.hasWings = (this.player.equippedHead === 'wings');
            window.idolShop.updateUI();
        }

        // Hide all modal overlays
        ['startOverlay', 'gameOverOverlay', 'stageClearOverlay', 'pauseOverlay', 'shopModal'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });

        if (document.activeElement && document.activeElement.blur) {
            document.activeElement.blur();
        }

        window.soundManager.startBGM();
        this.updateHUD();
    }

    togglePause() {
        if (this.state === 'PLAYING') {
            this.state = 'PAUSED';
            document.getElementById('pauseOverlay').style.display = 'flex';
        } else if (this.state === 'PAUSED') {
            this.state = 'PLAYING';
            document.getElementById('pauseOverlay').style.display = 'none';
        }
    }

    generatePlatform(y) {
        const rand = Math.random();
        let type = 'normal';
        if (rand < 0.45) type = 'normal';
        else if (rand < 0.70) type = 'moving';
        else if (rand < 0.85) type = 'spring';
        else type = 'fragile';

        const platWidth = type === 'spring' ? 64 : (type === 'fragile' ? 70 : 85 + Math.random() * 25);
        const x = Math.random() * (this.width - platWidth - 30) + 15;

        const plat = {
            x: x,
            y: y,
            width: platWidth,
            height: 15,
            type: type,
            vx: type === 'moving' ? (Math.random() > 0.5 ? 1.8 : -1.8) : 0,
            broken: false,
            breakTimer: 0,
            springActive: 0
        };

        this.platforms.push(plat);

        // Spawn Collectibles above platforms
        if (Math.random() < 0.75) {
            const itemTypeRand = Math.random();
            let itemType = 'star';
            if (itemTypeRand < 0.08) itemType = 'fever'; // Rainbow Heart
            else if (itemTypeRand < 0.16) itemType = 'wings'; // Angel Wings
            else if (itemTypeRand < 0.35) itemType = 'note'; // Musical Note

            this.collectibles.push({
                x: plat.x + plat.width / 2 + (Math.random() - 0.5) * 20,
                y: plat.y - 30 - Math.random() * 15,
                type: itemType,
                radius: itemType === 'fever' ? 14 : 10,
                baseY: plat.y - 30,
                floatOffset: Math.random() * Math.PI * 2,
                collected: false
            });
        }
    }

    loop(timestamp) {
        try {
            if (!this.lastTime) this.lastTime = timestamp;
            const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
            this.lastTime = timestamp;

            this.update(dt);
            this.render();
        } catch(err) {
            console.error('Game loop error:', err);
        }

        requestAnimationFrame((t) => this.loop(t));
    }

    update(dt) {
        if (this.state !== 'PLAYING') return;

        // Screen shake decay
        if (this.screenShake > 0) {
            this.screenShake -= dt * 15;
            if (this.screenShake < 0) this.screenShake = 0;
        }

        // Combo decay
        if (this.combo > 0) {
            this.comboTimer -= dt;
            if (this.comboTimer <= 0) {
                this.combo = 0;
            }
        }

        // Player update
        this.player.update(this.keys, dt);

        // Horizontal screen wrap
        if (this.player.x < -15) this.player.x = this.width + 10;
        else if (this.player.x > this.width + 15) this.player.x = -10;

        // Platform collisions (only when falling downwards)
        if (this.player.vy > 0) {
            for (const plat of this.platforms) {
                if (plat.broken) continue;

                // Check landing on top
                const footY = this.player.y + 25;
                const prevFootY = footY - this.player.vy;

                if (
                    footY >= plat.y &&
                    prevFootY <= plat.y + 14 &&
                    this.player.x + 14 >= plat.x &&
                    this.player.x - 14 <= plat.x + plat.width
                ) {
                    this.player.y = plat.y - 25;
                    this.player.vy = 0;
                    this.player.land();

                    // Grand Stage Clear trigger!
                    if (plat.type === 'grand_stage') {
                        this.stageClear();
                        break;
                    }

                    // Platform specific actions
                    if (plat.type === 'spring') {
                        this.player.vy = -18.5; // Super launch!
                        plat.springActive = 0.25;
                        this.screenShake = 4;
                        window.soundManager.playSpring();
                        this.createSparkleBurst(plat.x + plat.width / 2, plat.y, '#ffd54f', 16);
                        this.addFloatingText(this.player.x, this.player.y - 30, 'SUPER JUMP!', '#ffea00');
                    } else if (plat.type === 'fragile') {
                        plat.breakTimer = 0.45;
                        this.createSparkleBurst(this.player.x, plat.y + 5, '#ffffff', 8);
                    }
                    break;
                }
            }
        }

        // Update Platforms
        for (let i = this.platforms.length - 1; i >= 0; i--) {
            const p = this.platforms[i];

            if (p.type === 'moving') {
                p.x += p.vx;
                if (p.x <= 10 || p.x + p.width >= this.width - 10) {
                    p.vx = -p.vx;
                }
            }

            if (p.type === 'fragile' && p.breakTimer > 0) {
                p.breakTimer -= dt;
                if (p.breakTimer <= 0) {
                    p.broken = true;
                    this.createSparkleBurst(p.x + p.width / 2, p.y + 6, '#e1bee7', 15);
                }
            }

            if (p.springActive > 0) {
                p.springActive -= dt;
            }

            // Remove platforms too far below camera (except grand finale stage)
            if (p.y > this.cameraY + this.height + 80 && p.type !== 'grand_stage') {
                this.platforms.splice(i, 1);
            }
        }

        // Camera Smooth Follow (always tracks upward progress)
        const targetCameraY = this.player.y - this.height * 0.55;
        if (targetCameraY < this.cameraY) {
            this.cameraY += (targetCameraY - this.cameraY) * 0.12;
        }

        // Altitude calculation (meters climbed)
        this.altitude = Math.max(0, Math.floor((this.height - 120 - this.player.y) / 10));
        if (this.altitude > this.maxAltitude) {
            this.maxAltitude = this.altitude;
            this.score += 2;
        }

        // Goal Platform Spawn Check
        const goalMeters = this.currentStage.goalAltitude || 500;
        const targetGoalY = this.height - 120 - (goalMeters * 10);
        let highestPlatformY = this.platforms.reduce((min, p) => Math.min(min, p.y), this.cameraY + this.height);

        // Continuously spawn platforms ahead so player always has platforms to climb
        let spawnSafetyCap = 0;
        while (highestPlatformY > this.cameraY - 260 && !this.finalPlatformSpawned && spawnSafetyCap < 8) {
            spawnSafetyCap++;
            const nextY = highestPlatformY - (60 + Math.random() * 30);
            if (nextY <= targetGoalY) {
                // Spawn the Grand Finale Center Stage Platform!
                this.platforms.push({
                    x: (this.width - 320) / 2,
                    y: targetGoalY,
                    width: 320,
                    height: 32,
                    type: 'grand_stage',
                    color: '#ffd700',
                    cityName: this.currentStage.name
                });
                this.finalPlatformSpawned = true;
                this.addFloatingText(this.width / 2, targetGoalY - 45, '★ ' + this.currentStage.name + ' GOAL STAGE REACHED! ★', '#ffd700');
                break;
            } else {
                this.generatePlatform(nextY);
                highestPlatformY = nextY;
            }
        }

        // Update Collectibles
        const isFever = this.player.feverTimer > 0;
        for (let i = this.collectibles.length - 1; i >= 0; i--) {
            const item = this.collectibles[i];
            item.floatOffset += dt * 3.5;
            item.y = item.baseY + Math.sin(item.floatOffset) * 6;

            // In Fever mode, stars are magnetically attracted!
            if (isFever) {
                const dx = this.player.x - item.x;
                const dy = this.player.y - item.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 260) {
                    item.x += (dx / dist) * 7;
                    item.y += (dy / dist) * 7;
                    item.baseY += (dy / dist) * 7;
                }
            }

            // Collect collision
            const distToPlayer = Math.hypot(this.player.x - item.x, this.player.y - item.y);
            if (distToPlayer < item.radius + 20) {
                this.collectItem(item);
                this.collectibles.splice(i, 1);
                continue;
            }

            // Remove items far below
            if (item.y > this.cameraY + this.height + 80) {
                this.collectibles.splice(i, 1);
            }
        }

        // Fall check (fell below camera bottom)
        if (this.player.y > this.cameraY + this.height + 40) {
            this.handlePlayerFall();
        }

        // Particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.alpha -= dt * p.decay;
            if (p.alpha <= 0) {
                this.particles.splice(i, 1);
            }
        }

        // Floating texts
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            ft.y -= dt * 40;
            ft.alpha -= dt * 1.5;
            if (ft.alpha <= 0) {
                this.floatingTexts.splice(i, 1);
            }
        }

        // Ambient random crowd call bubbles from audience
        this.ambientCallTimer += dt;
        if (this.ambientCallTimer > 1.6) {
            this.ambientCallTimer = 0;
            this.spawnCrowdCall();
        }

        // Update crowd call speech bubbles with dynamic pop-in, float, sway & smooth fade
        for (let i = this.crowdCalls.length - 1; i >= 0; i--) {
            const c = this.crowdCalls[i];
            c.age += dt;
            if (c.age >= c.duration) {
                this.crowdCalls.splice(i, 1);
                continue;
            }

            const progress = c.age / c.duration;

            // 1. Smooth Fade-in (first ~0.5s), Steady Hover (~2.5s), and Smooth Fade-out (~1.0s)
            const fadeInTime = 0.12;
            const fadeOutTime = 0.72;
            if (progress < fadeInTime) {
                const t = progress / fadeInTime;
                c.alpha = t;
                // Pop-in bounce scale
                c.scale = Math.sin(t * Math.PI * 0.5) * 1.12;
            } else if (progress > fadeOutTime) {
                const t = (progress - fadeOutTime) / (1.0 - fadeOutTime);
                c.alpha = Math.max(0, 1.0 - t);
                c.scale = 1.0;
            } else {
                c.alpha = 1.0;
                // Gentle breathing pulse
                c.scale = 1.0 + Math.sin(c.age * 3.5) * 0.04;
            }

            // 2. Slow, graceful upward float
            c.y -= dt * 14;

            // 3. Gentle horizontal floating sway
            c.x = c.startX + Math.sin(c.seed + c.age * 2.2) * 8;
        }

        // Fever ambient sparkles
        if (isFever && Math.random() < 0.4) {
            this.particles.push({
                x: Math.random() * this.width,
                y: this.cameraY + Math.random() * this.height,
                vx: (Math.random() - 0.5) * 2,
                vy: -Math.random() * 3 - 1,
                size: Math.random() * 5 + 3,
                color: `hsl(${Math.floor(Math.random() * 360)}, 100%, 75%)`,
                alpha: 1,
                decay: 1.5
            });
        }

        // High score sync
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('star_idol_high_score', this.highScore);
        }

        this.updateHUD();
    }

    collectItem(item) {
        this.combo++;
        this.comboTimer = 3.2;

        const multiplier = Math.min(10, 1 + Math.floor(this.combo / 4));
        const feverMult = this.player.feverTimer > 0 ? 2 : 1;

        // Earn star coins for shop!
        if (window.idolShop) {
            window.idolShop.addCoins(item.type === 'fever' ? 8 : (item.type === 'note' ? 4 : 2));
        }

        if (item.type === 'star') {
            const pts = 100 * multiplier * feverMult;
            this.score += pts;
            this.cheerMeter = Math.min(100, this.cheerMeter + 8);
            this.createSparkleBurst(item.x, item.y, '#ffd54f', 12);
            window.soundManager.playStar(this.combo);
            this.addFloatingText(item.x, item.y - 10, `+${pts}`, '#ffeb3b');
        } else if (item.type === 'note') {
            const pts = 250 * multiplier * feverMult;
            this.score += pts;
            this.cheerMeter = Math.min(100, this.cheerMeter + 15);
            this.createSparkleBurst(item.x, item.y, '#00e5ff', 16);
            window.soundManager.playStar(this.combo + 3);
            this.addFloatingText(item.x, item.y - 10, `♪ +${pts}`, '#80d8ff');
        } else if (item.type === 'fever') {
            const pts = 500 * multiplier;
            this.score += pts;
            this.player.feverTimer = 9.0;
            this.cheerMeter = 100;
            this.screenShake = 6;
            this.createSparkleBurst(item.x, item.y, '#ff4081', 25);
            window.soundManager.playFever();
            window.soundManager.playNaatanCall();
            this.addFloatingText(item.x, item.y - 20, '★ なぁたんフィーバー！ NAATAN FEVER! ★', '#ff4081');
            this.spawnCrowdCall('なぁたん！', '💖', true);
            this.spawnCrowdCall('もっと！', '🔥', true);
        } else if (item.type === 'wings') {
            this.player.hasWings = true;
            this.player.wingsTimer = 8.0;
            this.score += 300 * multiplier;
            this.createSparkleBurst(item.x, item.y, '#e0f7fa', 20);
            window.soundManager.playDoubleJump();
            this.addFloatingText(item.x, item.y - 15, 'ANGEL WINGS!', '#e0f7fa');
        }

        // Japanese Idol Call Triggers (motto! & naatan!)
        if (this.combo > 1) {
            if (this.combo % 4 === 2) {
                window.soundManager.playMottoCall();
                this.spawnCrowdCall('もっと！ (motto!)', '🔥');
            } else if (this.combo % 4 === 0) {
                window.soundManager.playNaatanCall();
                this.spawnCrowdCall('なぁたん！ (naatan!)', '💖');
            }
        }

        // Cheer Meter 100% trigger
        if (this.cheerMeter >= 100 && this.player.feverTimer <= 0) {
            this.triggerCheerSurge();
        }

        // Combo hype notification
        if (this.combo > 1 && this.combo % 5 === 0) {
            const phrases = [
                'もっと！ MOTTO!',
                'なぁたん！ NAATAN!',
                '超絶可愛い！なぁたん！',
                '世界で一番！なぁたん！',
                'NAATAN LOVE! 大好き！'
            ];
            const phrase = phrases[Math.min(Math.floor(this.combo / 5) - 1, phrases.length - 1)];
            this.addFloatingText(this.player.x, this.player.y - 45, `${phrase} x${this.combo}`, '#ff4081');
            this.spawnCrowdCall(phrase, '👑', true);
        }
    }

    triggerCheerSurge() {
        this.cheerMeter = 0;
        window.soundManager.playNaatanCall();
        this.addFloatingText(this.width / 2, this.cameraY + 220, '★ なぁたんコール最高潮！ MOTTO! MOTTO! ★', '#ffeb3b');
        this.spawnCrowdCall('超絶可愛い！なぁたん！', '💖', true);
        this.spawnCrowdCall('もっと！もっと！', '🔥', true);
        // Spawn shower of falling stars
        for (let i = 0; i < 8; i++) {
            this.collectibles.push({
                x: 30 + Math.random() * (this.width - 60),
                y: this.cameraY - 30 - (i * 45),
                type: 'star',
                radius: 10,
                baseY: this.cameraY + 80 + (i * 40),
                floatOffset: Math.random() * 5,
                collected: false
            });
        }
    }

    // Stage Clear / City Concert Finale
    stageClear() {
        if (this.stageCleared) return;
        this.stageCleared = true;
        this.state = 'CLEAR';
        window.soundManager.stopBGM();
        window.soundManager.playVictoryFanfare();

        // Screen celebration shake & confetti
        this.screenShake = 8;
        for (let i = 0; i < 40; i++) {
            this.createSparkleBurst(this.player.x + (Math.random() - 0.5) * 140, this.player.y - 20, '#ffd700', 8);
        }

        // Reward star coins
        const reward = this.currentStage.clearReward || 300;
        if (window.idolShop) {
            window.idolShop.addCoins(reward);
        }

        // Show Stage Clear Overlay
        const cityTitle = document.getElementById('clearCityTitle');
        const clearReward = document.getElementById('clearCityReward');
        const clearScore = document.getElementById('clearScore');
        if (cityTitle) cityTitle.textContent = `★ ${this.currentStage.name} CLEAR! ★`;
        if (clearReward) clearReward.textContent = `+${reward} ⭐ TOUR BONUS GET!`;
        if (clearScore) clearScore.textContent = this.score;

        // Update Polaroid City Handwritten Notes & Stamp
        const signEl = document.getElementById('clearChekiSign');
        const noteEl = document.getElementById('clearChekiNote');
        const stampEl = document.getElementById('clearChekiStamp');
        if (signEl && this.currentStage.chekiSign) signEl.textContent = this.currentStage.chekiSign;
        if (noteEl && this.currentStage.chekiNote) noteEl.textContent = this.currentStage.chekiNote;
        if (stampEl && this.currentStage.chekiStamp) stampEl.textContent = this.currentStage.chekiStamp;

        // Draw 16-bit Pixel Art Cheki Portrait
        const chekiCanvas = document.getElementById('pixelChekiCanvas');
        if (chekiCanvas && window.PixelArtCheki) {
            window.PixelArtCheki.drawToCanvas(chekiCanvas, this.currentStage, this.player.equippedProp, false);
        }

        // Update Next Stage Button
        const nextBtn = document.getElementById('nextStageBtn');
        if (nextBtn) {
            if (this.currentStage.isFinal) {
                nextBtn.textContent = '🏆 GALAXY TOUR COMPLETE! (ワールドツアーをもう一度)';
            } else {
                const nextIndex = (this.currentStageIndex + 1) % window.TOUR_STAGES.length;
                const nextStage = window.TOUR_STAGES[nextIndex];
                nextBtn.textContent = `🚀 NEXT CITY: ${nextStage.name}`;
            }
        }

        document.getElementById('stageClearOverlay').style.display = 'flex';
    }

    nextStage() {
        this.currentStageIndex = (this.currentStageIndex + 1) % window.TOUR_STAGES.length;
        localStorage.setItem('star_idol_stage_index', this.currentStageIndex);
        this.currentStage = window.TOUR_STAGES[this.currentStageIndex];

        // Ensure overlays are hidden and buttons blurred
        ['stageClearOverlay', 'startOverlay', 'gameOverOverlay', 'pauseOverlay', 'shopModal'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });

        if (document.activeElement && document.activeElement.blur) {
            document.activeElement.blur();
        }

        this.startGame();
    }

    handlePlayerFall() {
        this.lives--;
        this.screenShake = 8;
        this.combo = 0;

        if (this.lives <= 0) {
            this.gameOver();
        } else {
            // Respawn player on a rescue platform
            const safePlatform = this.platforms.find(p => p.y >= this.cameraY + 100 && p.y <= this.cameraY + this.height - 120 && !p.broken);
            const respawnY = safePlatform ? safePlatform.y - 35 : this.cameraY + this.height * 0.55;
            const respawnX = safePlatform ? safePlatform.x + safePlatform.width / 2 : this.width / 2;

            if (!safePlatform) {
                this.platforms.push({
                    x: respawnX - 50,
                    y: respawnY + 35,
                    width: 100,
                    height: 15,
                    type: 'normal',
                    vx: 0,
                    broken: false,
                    breakTimer: 0,
                    springActive: 0
                });
            }

            this.player.reset(respawnX, respawnY);
            this.player.vy = -7;
            this.addFloatingText(this.width / 2, this.cameraY + 260, 'MISS! LIVES LEFT: ' + this.lives, '#ff5252');
        }
    }

    gameOver() {
        this.state = 'GAMEOVER';
        window.soundManager.stopBGM();
        window.soundManager.playGameOver();

        let rank = 'C';
        let shortRank = 'RANK C';
        if (this.score > 15000) { rank = 'SS (超絶アイドル!)'; shortRank = 'RANK SS'; }
        else if (this.score > 8000) { rank = 'S (Top Idol)'; shortRank = 'RANK S'; }
        else if (this.score > 4000) { rank = 'A (Popular Star)'; shortRank = 'RANK A'; }
        else if (this.score > 1500) { rank = 'B (Debut Idol)'; shortRank = 'RANK B'; }

        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('finalAltitude').textContent = `${this.maxAltitude} m`;
        document.getElementById('finalRank').textContent = rank;
        const stamp = document.getElementById('chekiStamp');
        if (stamp) stamp.textContent = shortRank;

        // Render 16-bit Pixel Art Cheki Portrait for Game Over (Encore Theme)
        const chekiCanvas = document.getElementById('pixelChekiGameOverCanvas');
        if (chekiCanvas && window.PixelArtCheki) {
            window.PixelArtCheki.drawToCanvas(chekiCanvas, this.currentStage, this.player.equippedProp, true);
        }

        document.getElementById('gameOverOverlay').style.display = 'flex';
    }

    createSparkleBurst(x, y, color, count = 10) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = Math.random() * 4 + 1.5;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd,
                size: Math.random() * 4 + 2,
                color: color,
                alpha: 1,
                decay: Math.random() * 1.5 + 1.2
            });
        }
    }

    addFloatingText(x, y, text, color) {
        this.floatingTexts.push({
            x: x,
            y: y,
            text: text,
            color: color,
            alpha: 1
        });
    }

    updateHUD() {
        const scoreElem = document.getElementById('hudScore');
        const altElem = document.getElementById('hudAltitude');
        const livesElem = document.getElementById('hudLives');
        const comboElem = document.getElementById('hudCombo');
        const cheerBar = document.getElementById('cheerFill');
        const stageElem = document.getElementById('hudStageName');

        if (scoreElem) scoreElem.textContent = this.score;
        if (altElem && this.currentStage) {
            const goal = this.currentStage.goalAltitude || 500;
            altElem.textContent = `${this.altitude}m / ${goal}m`;
        }
        if (stageElem && this.currentStage) {
            stageElem.textContent = `${this.currentStage.icon} ${this.currentStage.name}`;
        }
        if (livesElem) livesElem.textContent = '❤'.repeat(Math.max(0, this.lives));
        if (comboElem) {
            comboElem.textContent = this.combo > 1 ? `x${this.combo} COMBO!` : '';
        }
        if (cheerBar) {
            cheerBar.style.width = `${Math.min(100, this.cheerMeter)}%`;
        }

        const avatarMood = document.getElementById('avatarMood');
        if (avatarMood) {
            if (this.player.feverTimer > 0) {
                avatarMood.textContent = '🌟 FEVER!';
                avatarMood.style.color = '#ffea00';
            } else if (this.combo >= 4) {
                avatarMood.textContent = '😉 Wink!';
                avatarMood.style.color = '#ff80ab';
            } else if (this.lives === 1) {
                avatarMood.textContent = '🥺 Ganba!';
                avatarMood.style.color = '#ff5252';
            } else {
                avatarMood.textContent = '🎀 なぁたん';
                avatarMood.style.color = '#ff80ab';
            }
        }

        if (window.idolShop) {
            window.idolShop.updateUI();
        }
    }

    render() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.width, this.height);

        // Screen shake transform
        ctx.save();
        if (this.screenShake > 0) {
            const sx = (Math.random() - 0.5) * this.screenShake * 2;
            const sy = (Math.random() - 0.5) * this.screenShake * 2;
            ctx.translate(sx, sy);
        }

        // 1. Dynamic Parallax Background with City Landmarks
        this.renderBackground(ctx);

        // Apply Camera Transform
        ctx.save();
        ctx.translate(0, -this.cameraY);

        // 2. Platforms
        this.renderPlatforms(ctx);

        // 3. Collectibles
        this.renderCollectibles(ctx);

        // 4. Particles
        this.renderParticles(ctx);

        // 5. Player (Anime Idol)
        this.player.draw(ctx);

        // 6. Floating Texts
        this.renderFloatingTexts(ctx);

        ctx.restore(); // Restore camera transform

        // 7. Spotlights & Penlights (Foreground stage atmosphere)
        this.renderStageLighting(ctx);

        ctx.restore(); // Restore screen shake
    }

    renderBackground(ctx) {
        const stage = this.currentStage || {
            bgColorTop: '#120529', bgColorMid: '#2e0e4e', bgColorBottom: '#5c1775'
        };

        // Background Gradient
        let grad = ctx.createLinearGradient(0, 0, 0, this.height);
        grad.addColorStop(0, stage.bgColorTop);
        grad.addColorStop(0.5, stage.bgColorMid);
        grad.addColorStop(1, stage.bgColorBottom);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.width, this.height);

        // City Landmark Silhouettes (Tokyo Tower, Dotonbori, Eiffel Tower, Broadway, Galaxy)
        if (window.StageRenderer) {
            window.StageRenderer.renderLandmarks(ctx, stage, this.cameraY, this.width, this.height);
        }

        // Background stars
        ctx.save();
        const starTime = Date.now() * 0.001;
        for (let i = 0; i < 45; i++) {
            const sx = (i * 73) % this.width;
            const sy = ((i * 127) - (this.cameraY * 0.2)) % this.height;
            const realY = sy < 0 ? sy + this.height : sy;
            const twinkle = (Math.sin(starTime * 3 + i) + 1) * 0.5;

            ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + twinkle * 0.7})`;
            ctx.beginPath();
            ctx.arc(sx, realY, 1 + (i % 3) * 0.7, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    renderPlatforms(ctx) {
        for (const plat of this.platforms) {
            if (plat.broken) continue;

            ctx.save();

            if (plat.type === 'grand_stage') {
                // Grand Tour Final Stage Platform
                ctx.fillStyle = '#b71c1c'; // Red carpet
                ctx.roundRect(plat.x, plat.y, plat.width, plat.height, 8);
                ctx.fill();

                // Golden rim
                ctx.strokeStyle = '#ffd700';
                ctx.lineWidth = 3;
                ctx.shadowColor = '#ffff00';
                ctx.shadowBlur = 12;
                ctx.stroke();

                // Rainbow LED strip
                const rainbow = `hsl(${(Date.now() / 5) % 360}, 100%, 65%)`;
                ctx.fillStyle = rainbow;
                ctx.fillRect(plat.x + 8, plat.y + 3, plat.width - 16, 4);

                // Stage label
                ctx.fillStyle = '#ffffff';
                ctx.shadowColor = '#000000';
                ctx.shadowBlur = 4;
                ctx.font = 'bold 12px "Fredoka One", "M PLUS Rounded 1c", sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(`★ ${plat.cityName} GOAL STAGE ★`, plat.x + plat.width / 2, plat.y + 22);
                ctx.shadowBlur = 0;
            } else if (plat.type === 'stage') {
                // Concert main stage base
                ctx.fillStyle = '#4a148c';
                ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
                // Top LED rim
                ctx.fillStyle = '#e040fb';
                ctx.shadowColor = '#ea80fc';
                ctx.shadowBlur = 10;
                ctx.fillRect(plat.x, plat.y, plat.width, 5);
            } else if (plat.type === 'spring') {
                // Spring Pad platform
                ctx.fillStyle = '#311b92';
                ctx.roundRect(plat.x, plat.y, plat.width, plat.height, 6);
                ctx.fill();

                // Golden Spring Coil
                const springH = plat.springActive > 0 ? 4 : 10;
                ctx.fillStyle = '#ffd600';
                ctx.shadowColor = '#ffff00';
                ctx.shadowBlur = 8;
                ctx.fillRect(plat.x + plat.width / 2 - 12, plat.y - springH, 24, springH);

                // Spring pad top
                ctx.fillStyle = '#ff4081';
                ctx.fillRect(plat.x + plat.width / 2 - 14, plat.y - springH - 3, 28, 4);
            } else if (plat.type === 'fragile') {
                // Fragile cloud platform
                const shakeX = plat.breakTimer > 0 ? (Math.random() - 0.5) * 4 : 0;
                ctx.fillStyle = 'rgba(255, 204, 230, 0.85)';
                ctx.shadowColor = '#f48fb1';
                ctx.shadowBlur = 6;
                ctx.beginPath();
                ctx.roundRect(plat.x + shakeX, plat.y, plat.width, plat.height, 8);
                ctx.fill();
            } else if (plat.type === 'moving') {
                // Neon blue moving platform
                ctx.fillStyle = '#0d47a1';
                ctx.roundRect(plat.x, plat.y, plat.width, plat.height, 6);
                ctx.fill();

                ctx.fillStyle = '#00e5ff';
                ctx.shadowColor = '#18ffff';
                ctx.shadowBlur = 10;
                ctx.fillRect(plat.x + 4, plat.y + 2, plat.width - 8, 4);
            } else {
                // Normal Platform (Neon Magenta)
                ctx.fillStyle = '#6a1b9a';
                ctx.roundRect(plat.x, plat.y, plat.width, plat.height, 6);
                ctx.fill();

                ctx.fillStyle = '#ff4081';
                ctx.shadowColor = '#ff80ab';
                ctx.shadowBlur = 8;
                ctx.fillRect(plat.x + 4, plat.y + 2, plat.width - 8, 4);
            }

            ctx.restore();
        }
    }

    renderCollectibles(ctx) {
        const time = Date.now() * 0.003;
        for (const item of this.collectibles) {
            ctx.save();
            ctx.translate(item.x, item.y);

            if (item.type === 'star') {
                // Sparkling gold star
                ctx.rotate(time);
                ctx.fillStyle = '#ffd54f';
                ctx.shadowColor = '#ffea00';
                ctx.shadowBlur = 12;
                this.drawStar(ctx, 0, 0, item.radius, 5);
            } else if (item.type === 'note') {
                // Musical Eighth Note
                ctx.fillStyle = '#00e5ff';
                ctx.shadowColor = '#18ffff';
                ctx.shadowBlur = 14;
                ctx.beginPath();
                ctx.arc(-4, 4, 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillRect(-1, -8, 2.5, 12);
                ctx.fillRect(-1, -8, 8, 3);
            } else if (item.type === 'fever') {
                // Rainbow Heart
                const pulse = 1 + Math.sin(time * 3) * 0.2;
                ctx.scale(pulse, pulse);
                ctx.fillStyle = `hsl(${(Date.now() / 4) % 360}, 100%, 65%)`;
                ctx.shadowColor = '#ff4081';
                ctx.shadowBlur = 16;
                this.drawHeart(ctx, 0, 0, item.radius);
            } else if (item.type === 'wings') {
                // Angel Wing icon
                ctx.fillStyle = '#ffffff';
                ctx.shadowColor = '#80deea';
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.ellipse(0, 0, 10, 5, -0.3, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        }
    }

    renderParticles(ctx) {
        for (const p of this.particles) {
            ctx.save();
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    renderFloatingTexts(ctx) {
        for (const ft of this.floatingTexts) {
            ctx.save();
            ctx.globalAlpha = ft.alpha;
            ctx.fillStyle = ft.color;
            ctx.shadowColor = '#000000';
            ctx.shadowBlur = 4;
            ctx.font = 'bold 15px "Courier New", monospace';
            ctx.textAlign = 'center';
            ctx.fillText(ft.text, ft.x, ft.y);
            ctx.restore();
        }
    }

    renderStageLighting(ctx) {
        const time = Date.now() * 0.001;

        // Spotlights swinging from ceiling/floor
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        for (const spot of this.spotlights) {
            const angle = Math.sin(time * spot.speed) * spot.range + spot.angle;
            const length = 550;
            const endX = spot.x + Math.sin(angle) * length;
            const endY = Math.cos(angle) * length;

            const grad = ctx.createRadialGradient(spot.x, 0, 10, endX, endY, 140);
            grad.addColorStop(0, spot.color);
            grad.addColorStop(1, 'rgba(0,0,0,0)');

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(spot.x, 0);
            ctx.lineTo(endX - 70, endY);
            ctx.lineTo(endX + 70, endY);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();

        // Audience Penlights swaying at the bottom
        ctx.save();
        const isFever = this.player.feverTimer > 0;
        const penSpeedMult = isFever ? 1.8 : (this.combo > 5 ? 1.35 : 1.0);
        for (const p of this.penlights) {
            const sway = Math.sin(time * p.speed * penSpeedMult + p.phase) * (isFever ? 16 : 12);
            const pColor = isFever ? '#ff1744' : p.color;
            ctx.strokeStyle = pColor;
            ctx.shadowColor = pColor;
            ctx.shadowBlur = 10;
            ctx.lineWidth = 3.5;
            ctx.beginPath();
            ctx.moveTo(p.x, p.baseY);
            ctx.lineTo(p.x + sway, p.baseY - p.height);
            ctx.stroke();

            // Penlight tip glow
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(p.x + sway, p.baseY - p.height, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        // Audience Call Speech Bubbles with rich neon capsules & icons
        for (const c of this.crowdCalls) {
            ctx.save();
            ctx.globalAlpha = Math.max(0, Math.min(1, c.alpha));

            ctx.translate(c.x, c.y);
            ctx.scale(c.scale, c.scale);

            const font = c.isHype 
                ? 'bold 13.5px "Fredoka One", "M PLUS Rounded 1c", sans-serif'
                : 'bold 12px "Fredoka One", "M PLUS Rounded 1c", sans-serif';
            ctx.font = font;

            const fullText = (c.icon ? c.icon + ' ' : '') + c.text;
            const textWidth = ctx.measureText(fullText).width;
            const padX = 10;
            const bw = textWidth + padX * 2;
            const bh = 24;
            const bx = -bw / 2;
            const by = -bh / 2;

            // Neon Shadow Glow
            ctx.shadowColor = c.color;
            ctx.shadowBlur = c.isHype ? 16 : 9;

            // Pill Capsule Background
            const bgGrad = ctx.createLinearGradient(0, by, 0, by + bh);
            bgGrad.addColorStop(0, 'rgba(32, 10, 48, 0.94)');
            bgGrad.addColorStop(1, 'rgba(16, 4, 26, 0.96)');
            ctx.fillStyle = bgGrad;
            ctx.beginPath();
            ctx.roundRect(bx, by, bw, bh, 12);
            ctx.fill();

            // Neon Outline
            ctx.strokeStyle = c.color;
            ctx.lineWidth = c.isHype ? 2.4 : 1.6;
            ctx.stroke();

            // Small speech tail pointing down toward audience
            ctx.fillStyle = c.color;
            ctx.beginPath();
            ctx.moveTo(-3, by + bh);
            ctx.lineTo(3, by + bh);
            ctx.lineTo(0, by + bh + 4);
            ctx.closePath();
            ctx.fill();

            // Text
            ctx.shadowBlur = c.isHype ? 8 : 4;
            ctx.fillStyle = c.isHype ? '#fff59d' : '#ffffff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(fullText, 0, 0);

            ctx.restore();
        }
    }

    spawnCrowdCall(text = null, icon = null, isHype = false) {
        if (!text) {
            const defaultCalls = [
                { t: 'なぁたん！', i: '📣' },
                { t: 'もっと！', i: '🔥' },
                { t: 'motto!', i: '✨' },
                { t: 'naatan!', i: '💖' },
                { t: '超絶可愛い！', i: '🎀' },
                { t: '大好きー！', i: '💖' },
                { t: 'L・O・V・E なぁたん！', i: '⭐' },
                { t: '世界で一番！', i: '👑' },
                { t: '輝いてるよ！', i: '🌟' },
                { t: 'ふーふー！', i: '🎉' },
                { t: 'はい！はい！はい！', i: '📢' },
                { t: 'なぁたんしか勝たん！', i: '💫' }
            ];
            const pick = defaultCalls[Math.floor(Math.random() * defaultCalls.length)];
            text = pick.t;
            icon = pick.i;
        }

        const randPen = this.penlights[Math.floor(Math.random() * this.penlights.length)];
        const startX = randPen ? randPen.x : (Math.random() * (this.width - 120) + 60);
        const startY = this.height - 56 - (Math.random() * 22);

        this.crowdCalls.push({
            startX: Math.max(50, Math.min(this.width - 50, startX)),
            x: Math.max(50, Math.min(this.width - 50, startX)),
            y: startY,
            startY: startY,
            text: text,
            icon: icon || '📣',
            isHype: isHype,
            color: isHype ? '#ffd700' : (randPen ? randPen.color : '#ff4081'),
            age: 0,
            duration: isHype ? 4.6 : (3.8 + Math.random() * 0.8),
            seed: Math.random() * 100,
            scale: 0.1,
            alpha: 0
        });

        if (this.crowdCalls.length > 14) {
            this.crowdCalls.shift();
        }
    }

    drawStar(ctx, cx, cy, r, points = 5) {
        const innerR = r * 0.45;
        ctx.beginPath();
        for (let i = 0; i < points * 2; i++) {
            const rad = (i * Math.PI) / points - Math.PI / 2;
            const dist = (i % 2 === 0) ? r : innerR;
            const px = cx + Math.cos(rad) * dist;
            const py = cy + Math.sin(rad) * dist;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
    }

    drawHeart(ctx, x, y, size) {
        ctx.beginPath();
        const topCurveHeight = size * 0.3;
        ctx.moveTo(x, y + topCurveHeight);
        ctx.bezierCurveTo(x, y, x - size / 2, y, x - size / 2, y + topCurveHeight);
        ctx.bezierCurveTo(x - size / 2, y + (size + topCurveHeight) / 2, x, y + (size + topCurveHeight) / 2, x, y + size);
        ctx.bezierCurveTo(x, y + (size + topCurveHeight) / 2, x + size / 2, y + (size + topCurveHeight) / 2, x + size / 2, y + topCurveHeight);
        ctx.bezierCurveTo(x + size / 2, y, x, y, x, y + topCurveHeight);
        ctx.closePath();
        ctx.fill();
    }
}

// Instantiate game on window load or DOM ready
function initStarIdolGame() {
    if (!window.game) {
        window.game = new StarIdolGame();
    }
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
    initStarIdolGame();
} else {
    window.addEventListener('DOMContentLoaded', initStarIdolGame);
    window.addEventListener('load', initStarIdolGame);
}
