const TOWER_TYPES = {
    H: { cost: 20, damage: 15, range: 80, color: '#0af' },
    O: { cost: 30, damage: 25, range: 100, color: '#0f0' },
    C: { cost: 50, damage: 40, range: 120, color: '#f80' }
};

class Tower {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        const cfg = TOWER_TYPES[type];
        this.range = cfg.range;
        this.damage = cfg.damage;
        this.color = cfg.color;
        this.cooldown = 1000;
        this.lastShot = 0;
        this.level = 1;
    }

    upgrade() {
        const cost = TOWER_TYPES[this.type].cost * this.level;
        if (gold >= cost) {
            gold -= cost;
            this.level++;
            this.damage = Math.round(this.damage * 1.5);
            this.range = Math.round(this.range * 1.1);
            updateStats();
        }
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - gridSize / 2, this.y - gridSize / 2, gridSize, gridSize);
        ctx.fillStyle = '#fff';
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(this.type + this.level, this.x, this.y + 6);
    }

    update(delta) {
        if (Date.now() - this.lastShot > this.cooldown) {
            const target = enemies.find(e => this.inRange(e));
            if (target) {
                target.health -= this.damage;
                this.lastShot = Date.now();
                projectiles.push({
                    x1: this.x,
                    y1: this.y,
                    x2: target.x,
                    y2: target.y,
                    start: Date.now(),
                    duration: 200
                });
            }
        }
        this.draw();
    }

    inRange(enemy) {
        const dx = enemy.x - this.x;
        const dy = enemy.y - this.y;
        return Math.sqrt(dx * dx + dy * dy) < this.range;
    }
}

window.TOWER_TYPES = TOWER_TYPES;
window.Tower = Tower;
