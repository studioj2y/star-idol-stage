// Anime Idol Character Class ("Hikari - Red Gingham Live Stage Edition")
// Inspired by live idol concert: Chestnut hair, high side ponytail with red gingham bow,
// voluminous ruffled puffy sleeves, corset lace top, and stage handheld microphone!

class IdolPlayer {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 56;

        // Velocity & Physics
        this.vx = 0;
        this.vy = 0;
        this.speed = 5.8;
        this.jumpForce = -13.5;
        this.gravity = 0.52;
        this.friction = 0.84;

        // Jump & States
        this.isGrounded = false;
        this.jumpCount = 0;
        this.maxJumps = 2;
        this.facing = 1; // 1 = right, -1 = left

        // Animation timers
        this.animTimer = 0;
        this.blinkTimer = 0;
        this.isBlinking = false;
        this.twirlAngle = 0;
        this.isTwirling = false;

        // Dynamic ponytail sway physics
        this.ponytailAngle = 0;
        this.ribbonAngle = 0;

        // Idol Fever / Buffs
        this.feverTimer = 0;
        this.hasWings = false;
        this.wingsTimer = 0;

        // Particle trail
        this.trail = [];

        // Gingham Pattern Canvas Cache
        this.ginghamPattern = null;
        this.patternCanvas = null;

        // Equipped Accessories (from shop)
        const savedEquip = JSON.parse(localStorage.getItem('star_idol_equipped') || '{"prop": "mic", "head": "ribbon"}');
        this.equippedProp = savedEquip.prop || 'mic';
        this.equippedHead = savedEquip.head || 'ribbon';
        if (this.equippedHead === 'wings') {
            this.hasWings = true;
        }
    }

    initPattern(ctx) {
        if (!this.ginghamPattern) {
            const pCanvas = document.createElement('canvas');
            pCanvas.width = 8;
            pCanvas.height = 8;
            const pctx = pCanvas.getContext('2d');
            
            // Authentic Red & White Gingham check pattern:
            // (0,0): Pure cherry red, (4,0): Translucent pink/check, (0,4): Pink, (4,4): Pure white
            pctx.fillStyle = '#ffffff';
            pctx.fillRect(0, 0, 8, 8);
            pctx.fillStyle = '#e53935';
            pctx.fillRect(0, 0, 4, 4);
            pctx.fillStyle = '#ff8a80';
            pctx.fillRect(4, 0, 4, 4);
            pctx.fillRect(0, 4, 4, 4);

            this.patternCanvas = pCanvas;
            this.ginghamPattern = ctx.createPattern(pCanvas, 'repeat');
        }
    }

    reset(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.jumpCount = 0;
        this.isGrounded = false;
        this.feverTimer = 0;
        this.hasWings = (this.equippedHead === 'wings');
        this.wingsTimer = 0;
        this.trail = [];
        this.isTwirling = false;
        this.twirlAngle = 0;
        this.ponytailAngle = 0;
        this.ribbonAngle = 0;
        this.blinkTimer = 0;
        this.isBlinking = false;
    }

    update(keys, dt) {
        this.animTimer += dt * 8;

        // Blinking cycle
        this.blinkTimer += dt;
        if (this.blinkTimer > 3.8) {
            this.isBlinking = true;
            if (this.blinkTimer > 3.95) {
                this.isBlinking = false;
                this.blinkTimer = 0;
            }
        }

        // Timers
        if (this.feverTimer > 0) {
            this.feverTimer -= dt;
        }
        if (this.wingsTimer > 0) {
            this.wingsTimer -= dt;
            if (this.wingsTimer <= 0) this.hasWings = false;
        }

        const isFever = this.feverTimer > 0;
        const currentSpeed = isFever ? this.speed * 1.35 : this.speed;

        // Horizontal Movement
        if (keys['ArrowLeft'] || keys['KeyA']) {
            this.vx -= 1.3;
            this.facing = -1;
        } else if (keys['ArrowRight'] || keys['KeyD']) {
            this.vx += 1.3;
            this.facing = 1;
        } else {
            this.vx *= this.friction;
        }

        // Clamp horizontal velocity
        if (Math.abs(this.vx) > currentSpeed) {
            this.vx = Math.sign(this.vx) * currentSpeed;
        }

        // Fast fall / Down
        if ((keys['ArrowDown'] || keys['KeyS']) && !this.isGrounded) {
            this.vy += 0.8;
        }

        // Apply Gravity
        this.vy += this.gravity;
        if (this.vy > 15) this.vy = 15;

        // Update positions
        this.x += this.vx;
        this.y += this.vy;

        // Twirl spin animation during double jump
        if (this.isTwirling) {
            this.twirlAngle += 18 * this.facing;
            if (Math.abs(this.twirlAngle) >= 360) {
                this.twirlAngle = 0;
                this.isTwirling = false;
            }
        }

        // Dynamic high ponytail physics simulation
        const targetPonytailAngle = -this.vx * 0.1 - this.vy * 0.04;
        this.ponytailAngle += (targetPonytailAngle - this.ponytailAngle) * 0.22;
        this.ribbonAngle += (-this.vx * 0.08 - this.ribbonAngle) * 0.2;

        // Sparkle / After-image trail
        if (isFever || Math.abs(this.vx) > 3 || Math.abs(this.vy) > 5 || this.isTwirling) {
            if (Math.random() < 0.65) {
                this.trail.push({
                    x: this.x + (Math.random() - 0.5) * 22,
                    y: this.y + (Math.random() - 0.5) * 25,
                    vx: (Math.random() - 0.5) * 1.5,
                    vy: (Math.random() - 0.5) * 1.5 - 0.5,
                    size: Math.random() * 4 + 2,
                    alpha: 1,
                    color: isFever 
                        ? `hsl(${Math.floor(Math.random() * 360)}, 100%, 75%)` 
                        : (Math.random() > 0.4 ? '#ff5252' : '#ffffff')
                });
            }
        }

        // Update trail particles
        for (let i = this.trail.length - 1; i >= 0; i--) {
            const p = this.trail[i];
            p.x += p.vx;
            p.y += p.vy;
            p.alpha -= dt * 2.2;
            if (p.alpha <= 0) {
                this.trail.splice(i, 1);
            }
        }
    }

    jump() {
        const maxAllowedJumps = this.hasWings ? 3 : this.maxJumps;
        if (this.jumpCount < maxAllowedJumps) {
            const isDouble = this.jumpCount > 0;
            this.vy = this.jumpForce;
            this.jumpCount++;
            this.isGrounded = false;

            if (isDouble) {
                this.isTwirling = true;
                this.twirlAngle = 0;
                window.soundManager.playDoubleJump();
            } else {
                window.soundManager.playJump();
            }
            return true;
        }
        return false;
    }

    land() {
        this.isGrounded = true;
        this.jumpCount = 0;
        this.isTwirling = false;
        this.twirlAngle = 0;
    }

    draw(ctx) {
        this.initPattern(ctx);

        // Draw sparkle trail behind player
        for (const p of this.trail) {
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

        ctx.save();
        ctx.translate(this.x, this.y);

        // Rotation if twirling
        if (this.isTwirling) {
            ctx.rotate((this.twirlAngle * Math.PI) / 180);
        }

        // Face direction
        ctx.scale(this.facing, 1);

        const isFever = this.feverTimer > 0;

        // Fever glowing aura
        if (isFever) {
            ctx.save();
            const pulse = 1 + Math.sin(this.animTimer * 2) * 0.15;
            ctx.scale(pulse, pulse);
            ctx.shadowColor = `hsl(${(Date.now() / 4) % 360}, 100%, 70%)`;
            ctx.shadowBlur = 20;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
            ctx.beginPath();
            ctx.arc(0, 0, 34, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Angel Wings if powerup active
        if (this.hasWings) {
            ctx.save();
            const wingFlap = Math.sin(this.animTimer * 2.5) * 0.35;
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#ffcdd2';
            ctx.lineWidth = 2;
            ctx.shadowColor = '#ff5252';
            ctx.shadowBlur = 10;
            // Left wing
            ctx.save();
            ctx.translate(-10, -5);
            ctx.rotate(-0.4 + wingFlap);
            ctx.beginPath();
            ctx.ellipse(-14, 0, 16, 8, -0.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
            // Right wing
            ctx.save();
            ctx.translate(6, -5);
            ctx.rotate(0.2 - wingFlap);
            ctx.beginPath();
            ctx.ellipse(14, 0, 16, 8, 0.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
            ctx.restore();
        }

        // Gentle breathing bounce
        const breath = Math.sin(this.animTimer) * 1.5;
        const runCycle = Math.abs(this.vx) > 0.5 ? Math.sin(this.animTimer * 2) * 3 : 0;

        // 1. High Side Ponytail (with Red Gingham Bow & Ribbons!)
        this.drawPonytail(ctx, -6, -20 + breath);

        // 2. Legs & Stage Boots
        this.drawLegs(ctx, runCycle);

        // 3. Torso, Red Gingham Crop Top, White Corset Lace, & Flared Skirt
        this.drawBody(ctx, breath);

        // 4. Puffy Ruffled Gingham Sleeves (Voluminous off-shoulder ruffles)
        this.drawPuffySleeves(ctx, breath, runCycle);

        // 5. Head, Warm Chestnut Hair, Radiant Smile, Cheek Sparkle, Heart Earring
        this.drawHead(ctx, breath);

        // 6. Left Hand Pointing to the Stars (Iconic Live Stage Pose!)
        this.drawPointingArm(ctx, breath);

        // 7. Handheld Wireless Stage Microphone (Black with silver mesh)
        this.drawHandheldMic(ctx, breath);

        ctx.restore();
    }

    drawPonytail(ctx, anchorX, anchorY) {
        ctx.save();
        ctx.translate(anchorX, anchorY);
        ctx.rotate(this.ponytailAngle - 0.2);

        // Ponytail Hair (Warm chestnut brown with soft highlight)
        ctx.fillStyle = '#54261f';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(-14, 10, -22, 28, -8, 38);
        ctx.bezierCurveTo(-2, 32, -4, 18, 0, 0);
        ctx.fill();

        // Hair highlight curve
        ctx.strokeStyle = '#854236';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(-4, 4);
        ctx.quadraticCurveTo(-15, 18, -8, 30);
        ctx.stroke();

        // Gingham Scrunchie / Big Bow
        ctx.save();
        ctx.rotate(this.ribbonAngle * 0.5);
        
        // Ribbon Knot
        ctx.fillStyle = this.ginghamPattern || '#e53935';
        ctx.strokeStyle = '#b71c1c';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Left bow loop
        ctx.beginPath();
        ctx.ellipse(-7, -4, 7, 4.5, -0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Right bow loop
        ctx.beginPath();
        ctx.ellipse(5, -5, 6, 4, 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Ribbon fluttering tails
        ctx.fillStyle = this.ginghamPattern || '#e53935';
        ctx.beginPath();
        ctx.moveTo(-2, 2);
        ctx.lineTo(-10, 15);
        ctx.lineTo(-4, 14);
        ctx.lineTo(-1, 3);
        ctx.fill();
        ctx.stroke();

        ctx.restore();
        ctx.restore();
    }

    drawHead(ctx, breath) {
        ctx.save();
        ctx.translate(0, -16 + breath);

        // Face / Skin (soft fair anime skin)
        ctx.fillStyle = '#fff2ec';
        ctx.beginPath();
        ctx.ellipse(0, 0, 13, 12, 0, 0, Math.PI * 2);
        ctx.fill();

        // Soft Natural Rosy Cheeks Blush
        ctx.fillStyle = 'rgba(255, 95, 125, 0.42)';
        ctx.beginPath();
        ctx.arc(-7, 3.2, 3.2, 0, Math.PI * 2);
        ctx.arc(7, 3.2, 3.2, 0, Math.PI * 2);
        ctx.fill();

        // Tiny gold stud on ear (clean, no face decals)
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(12.5, 2, 1.2, 0, Math.PI * 2);
        ctx.fill();

        // Radiant Live Idol Smile (wide joyful stage smile with teeth)
        if (this.isBlinking) {
            // Happy curved anime eyes (^_^)
            ctx.strokeStyle = '#2a110a';
            ctx.lineWidth = 2.0;
            ctx.beginPath();
            ctx.arc(-5, -1, 3.2, Math.PI * 1.1, Math.PI * 1.9);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(5, -1, 3.2, Math.PI * 1.1, Math.PI * 1.9);
            ctx.stroke();
        } else {
            // Clean standard anime eyes (natural iris, pupil, crisp catchlight)
            this.drawAnimeEye(ctx, -5, -1);
            this.drawAnimeEye(ctx, 5, -1);
        }

        // Open cheerful smile singing
        ctx.fillStyle = '#d81b60';
        ctx.beginPath();
        ctx.arc(0, 4.5, 3.8, 0, Math.PI);
        ctx.closePath();
        ctx.fill();

        // Visible sparkling white teeth!
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-2.5, 4.5, 5, 1.5);

        // Warm Chestnut Bangs & Hair Strands (See-through idol bangs from photo)
        ctx.fillStyle = '#54261f';
        ctx.beginPath();
        ctx.moveTo(-13, -5);
        ctx.quadraticCurveTo(-8, -15, 0, -15);
        ctx.quadraticCurveTo(8, -15, 13, -5);
        // Realistic stylish idol bangs
        ctx.lineTo(12, 1);
        ctx.lineTo(8, -4);
        ctx.lineTo(4, 0);
        ctx.lineTo(0, -6);
        ctx.lineTo(-4, -1);
        ctx.lineTo(-8, -5);
        ctx.lineTo(-12, 1);
        ctx.closePath();
        ctx.fill();

        // Side lock of hair framing face
        ctx.beginPath();
        ctx.moveTo(-11, -3);
        ctx.quadraticCurveTo(-14, 5, -11, 10);
        ctx.quadraticCurveTo(-10, 6, -9, 0);
        ctx.fill();

        // Hair glossy shine / highlight
        ctx.fillStyle = 'rgba(255, 235, 230, 0.45)';
        ctx.beginPath();
        ctx.ellipse(0, -10, 8, 2.2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Head Accessories: Cat Ears or Crown (if equipped)
        if (this.equippedHead === 'neko') {
            ctx.fillStyle = '#ff80ab';
            ctx.beginPath();
            ctx.moveTo(-11, -12); ctx.lineTo(-17, -22); ctx.lineTo(-6, -16); ctx.closePath(); ctx.fill();
            ctx.beginPath();
            ctx.moveTo(11, -12); ctx.lineTo(17, -22); ctx.lineTo(6, -16); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.moveTo(-10, -13); ctx.lineTo(-15, -20); ctx.lineTo(-7, -16); ctx.closePath(); ctx.fill();
            ctx.beginPath();
            ctx.moveTo(10, -13); ctx.lineTo(15, -20); ctx.lineTo(7, -16); ctx.closePath(); ctx.fill();
        } else if (this.equippedHead === 'crown') {
            ctx.fillStyle = '#ffd700';
            ctx.shadowColor = '#ffff00';
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.moveTo(-7, -16); ctx.lineTo(-9, -23); ctx.lineTo(-4, -18);
            ctx.lineTo(0, -26); ctx.lineTo(4, -18); ctx.lineTo(9, -23); ctx.lineTo(7, -16);
            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;
        }

        ctx.restore();
    }

    // Default, clean, standard Anime Idol Eyes
    drawAnimeEye(ctx, x, y) {
        ctx.save();

        // 1. Clean white sclera background
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(x, y, 4.2, 5.0, 0, 0, Math.PI * 2);
        ctx.fill();

        // 2. Outer dark chestnut iris
        ctx.fillStyle = '#26120e';
        ctx.beginPath();
        ctx.ellipse(x, y, 3.4, 4.6, 0, 0, Math.PI * 2);
        ctx.fill();

        // 3. Lower iris warm amber glow
        const irisGrad = ctx.createLinearGradient(x, y - 2, x, y + 4.5);
        irisGrad.addColorStop(0, '#26120e');
        irisGrad.addColorStop(0.5, '#5c2214');
        irisGrad.addColorStop(1, '#d85a28');
        ctx.fillStyle = irisGrad;
        ctx.beginPath();
        ctx.ellipse(x, y + 0.5, 3.0, 3.8, 0, 0, Math.PI * 2);
        ctx.fill();

        // 4. Centered dark round pupil
        ctx.fillStyle = '#120504';
        ctx.beginPath();
        ctx.ellipse(x, y + 0.3, 1.7, 2.2, 0, 0, Math.PI * 2);
        ctx.fill();

        // 5. Classic single top-left crisp round catchlight
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x - 1.2, y - 1.8, 1.4, 0, Math.PI * 2);
        ctx.fill();

        // 6. Subtle tiny secondary rim reflection at bottom right
        ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
        ctx.beginPath();
        ctx.arc(x + 1.2, y + 2.0, 0.7, 0, Math.PI * 2);
        ctx.fill();

        // 7. Upper eyelash arch with graceful wing flick
        ctx.strokeStyle = '#1a0905';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(x, y - 1.5, 4.4, Math.PI * 1.15, Math.PI * 1.88);
        ctx.stroke();

        ctx.fillStyle = '#1a0905';
        ctx.beginPath();
        ctx.moveTo(x + 3.8, y - 3.0);
        ctx.lineTo(x + 4.8, y - 3.8);
        ctx.lineTo(x + 3.4, y - 2.2);
        ctx.closePath();
        ctx.fill();

        // 8. Soft natural eyebrow
        ctx.strokeStyle = '#54261f';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(x, y - 6.5, 4.0, Math.PI * 1.2, Math.PI * 1.8);
        ctx.stroke();

        ctx.restore();
    }

    drawBody(ctx, breath) {
        ctx.save();
        ctx.translate(0, breath);

        // 1. Cropped Midriff (Skin tone)
        ctx.fillStyle = '#fff2ec';
        ctx.fillRect(-5, 4, 10, 4);

        // 2. Idol Bodice Top (Red & White Gingham Check!)
        ctx.fillStyle = this.ginghamPattern || '#e53935';
        ctx.beginPath();
        ctx.moveTo(-8, -4);
        ctx.lineTo(8, -4);
        ctx.lineTo(6, 4);
        ctx.lineTo(-6, 4);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#c62828';
        ctx.lineWidth = 1;
        ctx.stroke();

        // 3. Center Chest White Lace & Red Corset Ribbon Lacing (From photo!)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-3, -4, 6, 8);

        // Red Criss-Cross Corset Ribbons ('X' lacing)
        ctx.strokeStyle = '#d32f2f';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        // Top X
        ctx.moveTo(-2.5, -3);
        ctx.lineTo(2.5, 0);
        ctx.moveTo(2.5, -3);
        ctx.lineTo(-2.5, 0);
        // Bottom X
        ctx.moveTo(-2.5, 0);
        ctx.lineTo(2.5, 3);
        ctx.moveTo(2.5, 0);
        ctx.lineTo(-2.5, 3);
        ctx.stroke();

        // White floral lace collar frill
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        for (let i = -8; i <= 8; i += 3) {
            ctx.arc(i, -4, 1.8, 0, Math.PI);
        }
        ctx.fill();

        // 4. Flared Red Gingham Skirt with White Frills
        const skirtSway = Math.sin(this.animTimer * 2) * 1.3;
        
        // White petticoat underskirt frill
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(-9, 8);
        ctx.lineTo(9, 8);
        ctx.lineTo(15 + skirtSway, 17);
        ctx.lineTo(-15 + skirtSway, 17);
        ctx.closePath();
        ctx.fill();

        // Gingham Main Flared Skirt
        ctx.fillStyle = this.ginghamPattern || '#e53935';
        ctx.beginPath();
        ctx.moveTo(-8, 7);
        ctx.lineTo(8, 7);
        ctx.lineTo(13.5 + skirtSway, 15);
        ctx.lineTo(-13.5 + skirtSway, 15);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#c62828';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Red waistline belt & cute mini ribbon
        ctx.fillStyle = '#d32f2f';
        ctx.fillRect(-6.5, 6.5, 13, 2);
        this.drawMiniHeart(ctx, 0, 7.5, 2.2);

        ctx.restore();
    }

    drawPuffySleeves(ctx, breath, runCycle) {
        ctx.save();
        ctx.translate(0, breath);

        // Voluminous Ruffled Puffy Sleeves (From photo!)
        // Left Puffy Shoulder
        this.drawSinglePuffSleeve(ctx, -10, -2, -1);

        // Right Puffy Shoulder
        this.drawSinglePuffSleeve(ctx, 10, -2, 1);

        ctx.restore();
    }

    drawSinglePuffSleeve(ctx, x, y, side) {
        ctx.save();
        ctx.translate(x, y);

        // White lace undersleeve frill
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(side * 2, 0, 6.5, 0, Math.PI * 2);
        ctx.fill();

        // Red Gingham Outer Ruffle
        ctx.fillStyle = this.ginghamPattern || '#e53935';
        ctx.strokeStyle = '#c62828';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(side * 1.5, -1, 5.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Inner ruffle pleats
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(side * 1.5, 3, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    drawLegs(ctx, runCycle) {
        const isAir = !this.isGrounded;
        const leftLegAngle = isAir ? 0.3 : runCycle * 0.15;
        const rightLegAngle = isAir ? -0.3 : -runCycle * 0.15;

        // Left Leg
        this.drawSingleLeg(ctx, -5, 12, leftLegAngle);
        // Right Leg
        this.drawSingleLeg(ctx, 5, 12, rightLegAngle);
    }

    drawSingleLeg(ctx, x, y, angle) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);

        // Fair skin thigh
        ctx.fillStyle = '#fff2ec';
        ctx.fillRect(-2.5, 0, 5, 4);

        // White lace thigh-high socks with red ribbon bow
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-2.5, 4, 5, 8);
        ctx.fillStyle = '#e53935';
        ctx.fillRect(-3, 4, 6, 1.5);

        // Stage Boots (Cherry Red with white sole)
        ctx.fillStyle = '#d32f2f';
        ctx.beginPath();
        ctx.roundRect(-3, 10, 6, 7, 2);
        ctx.fill();

        // White Boot Sole & Lace
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-3.5, 15, 7, 2);
        ctx.fillRect(-2, 11, 4, 1.5);

        ctx.restore();
    }

    // Photo Detail: Left Arm raised pointing up to the sky (Index finger point!)
    drawPointingArm(ctx, breath) {
        ctx.save();
        ctx.translate(-7, -2 + breath);
        ctx.rotate(-0.75 + Math.sin(this.animTimer) * 0.08);

        // Upper arm (skin)
        ctx.fillStyle = '#fff2ec';
        ctx.fillRect(-2, -10, 4, 10);

        // Pointing Hand (☝)
        ctx.fillStyle = '#fff2ec';
        ctx.beginPath();
        ctx.arc(0, -11, 2.8, 0, Math.PI * 2);
        ctx.fill();

        // Extended index finger pointing to stars
        ctx.fillRect(-1, -15, 2.2, 5);

        // Sparkle at tip of pointing finger!
        if (Math.sin(this.animTimer * 3) > 0.4) {
            ctx.fillStyle = '#ffeb3b';
            ctx.shadowColor = '#fff59d';
            ctx.shadowBlur = 4;
            this.drawMiniDiamond(ctx, 0, -17, 2);
        }

        ctx.restore();
    }

    // Handheld Stage Prop (Mic, Guitar, Wand, or Glowstick)
    drawHandheldMic(ctx, breath) {
        ctx.save();
        ctx.translate(8, -1 + breath);
        ctx.rotate(0.35 + Math.sin(this.animTimer) * 0.05);

        // Forearm holding item toward mouth/body
        ctx.fillStyle = '#fff2ec';
        ctx.fillRect(-1.5, -4, 3, 8);

        // Hand fingers wrapping item
        ctx.beginPath();
        ctx.arc(0, -4, 2.6, 0, Math.PI * 2);
        ctx.fill();

        if (this.equippedProp === 'guitar') {
            // Electric Rock Guitar
            ctx.fillStyle = '#d50000';
            ctx.strokeStyle = '#212121';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(-10, -8, 16, 22, 4);
            ctx.fill();
            ctx.stroke();
            // Guitar neck
            ctx.fillStyle = '#8d6e63';
            ctx.fillRect(-6, -26, 4, 18);
            // Headstock
            ctx.fillStyle = '#d50000';
            ctx.fillRect(-7, -30, 6, 5);
        } else if (this.equippedProp === 'wand') {
            // Magical Star Wand
            ctx.fillStyle = '#ff4081';
            ctx.fillRect(-1.5, -12, 3, 16);
            ctx.fillStyle = '#ffd54f';
            ctx.shadowColor = '#ffff00';
            ctx.shadowBlur = 8;
            this.drawMiniStar(ctx, 0, -14, 5.5);
            ctx.shadowBlur = 0;
        } else if (this.equippedProp === 'glowstick') {
            // Ultra Rainbow Penlight
            const rainbow = `hsl(${(Date.now() / 4) % 360}, 100%, 65%)`;
            ctx.fillStyle = rainbow;
            ctx.shadowColor = rainbow;
            ctx.shadowBlur = 10;
            ctx.fillRect(-2, -18, 4, 20);
            ctx.shadowBlur = 0;
        } else {
            // Stage Mic Body (Sleek Matte Black)
            ctx.fillStyle = '#212121';
            ctx.fillRect(-1.8, -12, 3.6, 14);

            // Metallic Grille Capsule (Silver/Charcoal Mesh)
            ctx.fillStyle = '#9e9e9e';
            ctx.strokeStyle = '#424242';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.ellipse(0, -14, 2.8, 3.8, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Soundwave sparkle emitted from mic while singing
            if (Math.random() < 0.3) {
                ctx.fillStyle = '#ff80ab';
                ctx.beginPath();
                ctx.arc(0, -18, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.restore();
    }

    drawMiniDiamond(ctx, cx, cy, r) {
        ctx.beginPath();
        ctx.moveTo(cx, cy - r);
        ctx.lineTo(cx + r * 0.7, cy);
        ctx.lineTo(cx, cy + r);
        ctx.lineTo(cx - r * 0.7, cy);
        ctx.closePath();
        ctx.fill();
    }

    drawMiniHeart(ctx, x, y, size) {
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

    drawMiniStar(ctx, cx, cy, r, points = 5) {
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
}

window.IdolPlayer = IdolPlayer;
