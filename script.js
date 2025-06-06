const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const gridSize = 40;
let lastTime = 0;
const towers = [];
const enemies = [];

class Tower {
    constructor(x, y, element) {
        this.x = x;
        this.y = y;
        this.element = element; // ex: "H", "O"
        this.range = 80;
        this.cooldown = 1000;
        this.lastShot = 0;
    }

    draw() {
        ctx.fillStyle = '#0af';
        ctx.fillRect(this.x - gridSize / 2, this.y - gridSize / 2, gridSize, gridSize);
        ctx.fillStyle = '#fff';
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(this.element, this.x, this.y + 6);
    }

    update(delta) {
        if (Date.now() - this.lastShot > this.cooldown) {
            const target = enemies.find(e => this.inRange(e));
            if (target) {
                target.health -= 10; // simple damage
                this.lastShot = Date.now();
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

class Enemy {
    constructor(path) {
        this.path = path;
        this.pos = 0;
        this.speed = 50; // pixels per second
        this.health = 100;
        this.x = path[0].x;
        this.y = path[0].y;
    }

    update(delta) {
        if (this.health <= 0) return;
        this.pos += this.speed * delta;
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
        ctx.fillStyle = '#f00';
        ctx.beginPath();
        ctx.arc(this.x, this.y, gridSize / 3, 0, Math.PI * 2);
        ctx.fill();
    }
}

const path = [
    { x: 0, y: 300 },
    { x: 800, y: 300 }
];

function spawnEnemy() {
    enemies.push(new Enemy(path));
}

canvas.addEventListener('click', e => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    towers.push(new Tower(x, y, 'H'));
});

function update(time) {
    const delta = (time - lastTime) / 1000;
    lastTime = time;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // draw path
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (const p of path.slice(1)) {
        ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();

    towers.forEach(t => t.update(delta));
    enemies.forEach(e => e.update(delta));

    requestAnimationFrame(update);
}

spawnEnemy();
requestAnimationFrame(update);
