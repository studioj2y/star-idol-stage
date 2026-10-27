// Idol Wardrobe & Accessory Shop System
class IdolShop {
    constructor() {
        this.coins = parseInt(localStorage.getItem('star_idol_coins') || '100', 10);
        this.inventory = JSON.parse(localStorage.getItem('star_idol_inventory') || '["mic", "ribbon"]');
        this.equipped = JSON.parse(localStorage.getItem('star_idol_equipped') || '{"prop": "mic", "head": "ribbon"}');

        this.items = [
            // Props (Handheld)
            { id: 'mic', name: 'STAGE WIRELESS MIC (ステージマイク)', type: 'prop', price: 0, icon: '🎤', desc: 'ライブ定番のワイヤレスマイク！クリアな歌声を会場中にお届け' },
            { id: 'guitar', name: 'ROCK ELECTRIC GUITAR (エレキギター)', type: 'prop', price: 300, icon: '🎸', desc: 'クールなチェリーレッド！ロックなサウンドで観客を熱狂させよう' },
            { id: 'wand', name: 'STARDUST MAGIC WAND (星の魔法の杖)', type: 'prop', price: 450, icon: '🪄', desc: 'きらめく星屑を振りまき、スターの引き寄せ範囲がUP！' },
            { id: 'glowstick', name: 'ULTRA RAINBOW PENLIGHT (超絶ペンライト)', type: 'prop', price: 200, icon: '✨', desc: '応援の必需品！振るたびに鮮やかな虹色の光を放つ' },

            // Head & Wearables
            { id: 'ribbon', name: 'RED GINGHAM RIBBON (赤チェックリボン)', type: 'head', price: 0, icon: '🎀', desc: '「なぁたん」のトレードマーク！大人気サイドポニー用の特大リボン' },
            { id: 'neko', name: 'CUTE CAT EARS (アイドル猫耳)', type: 'head', price: 350, icon: '🐱', desc: 'ジャンプに合わせてピコピコ動くキュートな猫耳カチューシャ' },
            { id: 'crown', name: 'SHINING STAR CROWN (星のティアラ王冠)', type: 'head', price: 500, icon: '👑', desc: '銀河ツアーを制したトップアイドルに輝くゴールドクラウン' },
            { id: 'wings', name: 'ANGEL WINGS (常時エンジェルウィング)', type: 'head', price: 800, icon: '🪽', desc: '神聖な翼を宿し、常時トリプルジャンプ（3段ジャンプ）が可能に！' }
        ];
    }

    addCoins(amount) {
        this.coins += amount;
        this.save();
        this.updateUI();
    }

    save() {
        localStorage.setItem('star_idol_coins', this.coins);
        localStorage.setItem('star_idol_inventory', JSON.stringify(this.inventory));
        localStorage.setItem('star_idol_equipped', JSON.stringify(this.equipped));
    }

    isOwned(id) {
        return this.inventory.includes(id);
    }

    isEquipped(id) {
        return this.equipped.prop === id || this.equipped.head === id;
    }

    buy(id) {
        const item = this.items.find(it => it.id === id);
        if (!item || this.isOwned(id)) return false;

        if (this.coins >= item.price) {
            this.coins -= item.price;
            this.inventory.push(id);
            this.equip(id);
            this.save();
            this.renderShop();
            this.updateUI();
            if (window.soundManager) window.soundManager.playStar(5);
            return true;
        } else {
            alert('スターコインが足りないよ！ライブツアーでスターを集めてね★ (Need more Star Coins!)');
            return false;
        }
    }

    equip(id) {
        const item = this.items.find(it => it.id === id);
        if (!item || !this.isOwned(id)) return;

        if (item.type === 'prop') {
            this.equipped.prop = id;
        } else if (item.type === 'head') {
            this.equipped.head = id;
        }
        this.save();

        // Sync with player if active
        if (window.game && window.game.player) {
            window.game.player.equippedProp = this.equipped.prop;
            window.game.player.equippedHead = this.equipped.head;
            if (this.equipped.head === 'wings') {
                window.game.player.hasWings = true;
            }
        }
        this.renderShop();
    }

    updateUI() {
        const coinElems = document.querySelectorAll('.star-coins-display');
        coinElems.forEach(el => {
            el.textContent = `⭐ ${this.coins}`;
        });
    }

    renderShop() {
        const listElem = document.getElementById('shopItemList');
        if (!listElem) return;

        listElem.innerHTML = '';
        this.items.forEach(item => {
            const owned = this.isOwned(item.id);
            const equipped = this.isEquipped(item.id);

            const card = document.createElement('div');
            card.className = `shop-item-card ${equipped ? 'equipped' : (owned ? 'owned' : '')}`;

            card.innerHTML = `
                <div class="shop-item-icon">${item.icon}</div>
                <div class="shop-item-info">
                    <div class="shop-item-name">${item.name}</div>
                    <div class="shop-item-desc">${item.desc}</div>
                </div>
                <div class="shop-item-action">
                    ${equipped 
                        ? '<span class="status-badge equipped-badge">EQUIPPED (装備中)</span>' 
                        : (owned 
                            ? `<button class="shop-btn equip-btn" onclick="window.idolShop.equip('${item.id}')">EQUIP (装備)</button>`
                            : `<button class="shop-btn buy-btn" onclick="window.idolShop.buy('${item.id}')">⭐ ${item.price}</button>`
                        )
                    }
                </div>
            `;
            listElem.appendChild(card);
        });
        this.updateUI();
    }

    open() {
        this.renderShop();
        const modal = document.getElementById('shopModal');
        if (modal) modal.style.display = 'flex';
    }

    close() {
        const modal = document.getElementById('shopModal');
        if (modal) modal.style.display = 'none';
    }
}

window.idolShop = new IdolShop();
