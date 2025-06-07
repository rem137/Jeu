const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const gridSize = 40;
let lastTime = 0;
const towers = [];
const enemies = [];

const statsDiv = document.getElementById('stats');
const startBtn = document.getElementById('startBtn');
let gold = 100;
let lives = 10;
let wave = 0;
let waveInProgress = false;
const TOWER_TYPES = {
    H: { cost: 20, damage: 10, range: 80, color: '#0af' },
    O: { cost: 30, damage: 15, range: 100, color: '#0f0' }
};
let selectedTower = 'H';

function updateStats() {
    statsDiv.textContent = `Gold: ${gold} | Lives: ${lives} | Wave: ${wave}`;
}
updateStats();

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
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - gridSize / 2, this.y - gridSize / 2, gridSize, gridSize);
        ctx.fillStyle = '#fff';
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(this.type, this.x, this.y + 6);
    }

    update(delta) {
        if (Date.now() - this.lastShot > this.cooldown) {
            const target = enemies.find(e => this.inRange(e));
            if (target) {
                target.health -= this.damage;
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
    constructor(path, level = 1) {
        this.path = path;
        this.pos = 0;
        this.speed = 50 + level * 5; // pixels per second
        this.health = 80 + level * 20;
        this.maxHealth = this.health;
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
        ctx.fillStyle = '#f00';
        ctx.beginPath();
        ctx.arc(this.x, this.y, gridSize / 3, 0, Math.PI * 2);
        ctx.fill();

        // health bar
        ctx.fillStyle = '#800';
        ctx.fillRect(this.x - gridSize / 2, this.y - gridSize / 2 - 8, gridSize, 4);
        ctx.fillStyle = '#0f0';
        const w = gridSize * (this.health / this.maxHealth);
        ctx.fillRect(this.x - gridSize / 2, this.y - gridSize / 2 - 8, w, 4);
    }
}

const path = [
    { x: 0, y: 300 },
    { x: 200, y: 300 },
    { x: 200, y: 100 },
    { x: 600, y: 100 },
    { x: 600, y: 500 },
    { x: 800, y: 500 }
];

function spawnEnemy(level) {
    enemies.push(new Enemy(path, level));
}

function gameOver() {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    ctx.font = '48px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2);
}

canvas.addEventListener('click', e => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cfg = TOWER_TYPES[selectedTower];
    if (gold >= cfg.cost) {
        towers.push(new Tower(x, y, selectedTower));
        gold -= cfg.cost;
        updateStats();
    }
});

document.querySelectorAll('#controls button[data-tower]').forEach(btn => {
    btn.addEventListener('click', () => {
        selectedTower = btn.dataset.tower;
        document.querySelectorAll('#controls button[data-tower]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    });
});

function startWave() {
    if (waveInProgress) return;
    waveInProgress = true;
    wave++;
    updateStats();
    let spawned = 0;
    const interval = setInterval(() => {
        spawnEnemy(wave);
        spawned++;
        if (spawned >= 10) {
            clearInterval(interval);
            waveInProgress = false;
        }
    }, 1000);
}

startBtn.addEventListener('click', startWave);

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
    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        e.update(delta);
        if (e.health <= 0) {
            enemies.splice(i, 1);
            gold += 5;
            updateStats();
        } else if (e.pos >= e.path.length - 1) {
            enemies.splice(i, 1);
            lives--;
            updateStats();
            if (lives <= 0) {
                gameOver();
                return;
            }
        }
    }

    requestAnimationFrame(update);
}

requestAnimationFrame(update);
startWave();
