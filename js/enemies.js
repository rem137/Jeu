const ENEMY_TYPES = {
    normal: { speed: 50, health: 80, color: '#f00' },
    fast: { speed: 90, health: 60, color: '#ff0' },
    tank: { speed: 30, health: 160, color: '#0ff' }
};

class Enemy {
    constructor(path, level = 1, type = 'normal') {
        this.path = path;
        this.type = type;
        const cfg = ENEMY_TYPES[type];
        this.pos = 0;
        this.speed = cfg.speed + level * 2;
        this.health = cfg.health + level * 10;
        this.maxHealth = this.health;
        this.color = cfg.color;
        this.x = path[0].x;
        this.y = path[0].y;
        this.pathLength = this.computeLength();
    }

    computeLength() {
        let len = 0;
        for (let i = 0; i < this.path.length - 1; i++) {
            const dx = this.path[i + 1].x - this.path[i].x;
            const dy = this.path[i + 1].y - this.path[i].y;
            len += Math.hypot(dx, dy);
        }
        return len || 1;
    }

    update(delta) {
        if (this.health <= 0) return;
        this.pos += this.speed * delta * (this.path.length - 1) / this.pathLength;
        if (this.pos >= this.path.length - 1) {
            this.pos = this.path.length - 1;
        }
        const p1 = this.path[Math.floor(this.pos)];
        const p2 = this.path[Math.min(this.path.length - 1, Math.floor(this.pos) + 1)];
        const t = this.pos % 1;
        this.x = p1.x + (p2.x - p1.x) * t;
        this.y = p1.y + (p2.y - p1.y) * t;
        this.draw();
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, gridSize / 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#800';
        ctx.fillRect(this.x - gridSize / 2, this.y - gridSize / 2 - 8, gridSize, 4);
        ctx.fillStyle = '#0f0';
        const w = gridSize * (this.health / this.maxHealth);
        ctx.fillRect(this.x - gridSize / 2, this.y - gridSize / 2 - 8, w, 4);
    }
}

window.ENEMY_TYPES = ENEMY_TYPES;
window.Enemy = Enemy;
