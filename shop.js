// Idol Wardrobe & Accessory Shop System
class IdolShop {
    constructor() {
        this.coins = parseInt(localStorage.getItem('star_idol_coins') || '100', 10);
        this.inventory = JSON.parse(localStorage.getItem('star_idol_inventory') || '["mic", "ribbon"]');
        this.equipped = JSON.parse(localStorage.getItem('star_idol_equipped') || '{"prop": "mic", "head": "ribbon"}');

        this.items = [
            // Props (Handheld)
            { id: 'mic', name: '舞台无线麦克风', type: 'prop', price: 0, icon: '🎤', desc: '巡演现场必备手持专业麦克风' },
            { id: 'guitar', name: '摇滚电吉他 (Guitar)', type: 'prop', price: 300, icon: '🎸', desc: '狂热朋克！帅气的樱桃红电吉他' },
            { id: 'wand', name: '星光魔法棒 (Wand)', type: 'prop', price: 450, icon: '🪄', desc: '挥洒闪烁星尘，扩大星光吸附范围' },
            { id: 'glowstick', name: '超绝双持应援棒', type: 'prop', price: 200, icon: '✨', desc: '打Call圣物！挥动时散发七彩虹光' },

            // Head & Wearables
            { id: 'ribbon', name: '红白格子蝴蝶结 (经典)', type: 'head', price: 0, icon: '🎀', desc: '「なぁたん」最具标志性的招牌大发饰' },
            { id: 'neko', name: '萌萌偶像猫耳 (Cat Ears)', type: 'head', price: 350, icon: '🐱', desc: '跳跃时耳尖会俏皮抖动的小猫耳' },
            { id: 'crown', name: '璀璨星光王冠 (Crown)', type: 'head', price: 500, icon: '👑', desc: '银河巡演首席女王的金色微光皇冠' },
            { id: 'wings', name: '常驻天使羽翼 (Angel Wings)', type: 'head', price: 800, icon: '🪽', desc: '神圣羽翼！直接获得常驻三段跳能力' }
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
            alert('星光硬币不足哦！快去巡演收集更多星星吧★');
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
                        ? '<span class="status-badge equipped-badge">已装备</span>' 
                        : (owned 
                            ? `<button class="shop-btn equip-btn" onclick="window.idolShop.equip('${item.id}')">装备</button>`
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
