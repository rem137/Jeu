const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const gridSize = 40;
let lastTime = 0;
const towers = [];
const enemies = [];
const projectiles = [];

const statsDiv = document.getElementById('stats');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const startScreen = document.getElementById('startScreen');
const startGameBtn = document.getElementById('startGameBtn');
const gameOverScreen = document.getElementById('gameOverScreen');
const finalStats = document.getElementById('finalStats');
const restartBtn = document.getElementById('restartBtn');
let gold = 100;
let lives = 10;
let wave = 0;
let kills = 0;
let waveInProgress = false;
let paused = true;
let mouseX;
let mouseY;
let hoverTower = null;
const TOWER_TYPES = {
    H: { cost: 20, damage: 15, range: 80, color: '#0af' },
    O: { cost: 30, damage: 25, range: 100, color: '#0f0' },
    C: { cost: 50, damage: 40, range: 120, color: '#f80' }
};
let selectedTower = 'H';

function updateStats() {
    statsDiv.textContent = `Gold: ${gold} | Lives: ${lives} | Wave: ${wave} | Kills: ${kills}`;
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
    let type = 'normal';
    if (level > 5 && Math.random() < 0.3) {
        type = 'tank';
    } else if (level > 2 && Math.random() < 0.4) {
        type = 'fast';
    }
    enemies.push(new Enemy(path, level, type));
}

function gameOver() {
    paused = true;
    finalStats.textContent = `Wave: ${wave} | Kills: ${kills}`;
    gameOverScreen.classList.remove('hidden');
}

function getCanvasPos(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    return { x, y };
}

function handlePointerDown(e) {
    e.preventDefault();
    const { x, y } = getCanvasPos(e);
    const tower = towers.find(t => Math.abs(t.x - x) < gridSize / 2 && Math.abs(t.y - y) < gridSize / 2);
    if (tower) {
        if (e.shiftKey) {
            const refund = Math.floor(TOWER_TYPES[tower.type].cost * tower.level * 0.5);
            gold += refund;
            towers.splice(towers.indexOf(tower), 1);
            updateStats();
        } else {
            tower.upgrade();
        }
    } else {
        const cfg = TOWER_TYPES[selectedTower];
        if (gold >= cfg.cost) {
            towers.push(new Tower(x, y, selectedTower));
            gold -= cfg.cost;
            updateStats();
        }
    }
}

function handlePointerMove(e) {
    const { x, y } = getCanvasPos(e);
    mouseX = x;
    mouseY = y;
    hoverTower = towers.find(t => Math.abs(t.x - mouseX) < gridSize / 2 && Math.abs(t.y - mouseY) < gridSize / 2) || null;
}

canvas.addEventListener('pointerdown', handlePointerDown);
canvas.addEventListener('pointermove', handlePointerMove);

document.querySelectorAll('#controls button[data-tower]').forEach(btn => {
    btn.addEventListener('click', () => {
        selectedTower = btn.dataset.tower;
        document.querySelectorAll('#controls button[data-tower]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    });
});

pauseBtn.addEventListener('click', () => {
    paused = !paused;
    pauseBtn.textContent = paused ? 'Resume' : 'Pause';
    if (!paused) requestAnimationFrame(update);
});

startGameBtn.addEventListener('click', () => {
    startScreen.classList.add('hidden');
    paused = false;
    lastTime = performance.now();
    requestAnimationFrame(update);
    startWave();
});

restartBtn.addEventListener('click', () => {
    location.reload();
});

function startWave() {
    if (waveInProgress) return;
    waveInProgress = true;
    wave++;
    updateStats();
    let spawned = 0;
    const toSpawn = 10 + wave * 2;
    const interval = setInterval(() => {
        spawnEnemy(wave);
        spawned++;
        if (spawned >= toSpawn) {
            clearInterval(interval);
            waveInProgress = false;
        }
    }, 1000);
}

startBtn.addEventListener('click', startWave);

function update(time) {
    if (paused) return;
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

    // range indicator
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    if (hoverTower) {
        ctx.beginPath();
        ctx.arc(hoverTower.x, hoverTower.y, hoverTower.range, 0, Math.PI * 2);
        ctx.stroke();
    } else if (mouseX !== undefined && mouseY !== undefined) {
        const r = TOWER_TYPES[selectedTower].range;
        ctx.beginPath();
        ctx.arc(mouseX, mouseY, r, 0, Math.PI * 2);
        ctx.stroke();
    }

    // projectiles
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        const progress = (Date.now() - p.start) / p.duration;
        if (progress >= 1) {
            projectiles.splice(i, 1);
            continue;
        }
        const x = p.x1 + (p.x2 - p.x1) * progress;
        const y = p.y1 + (p.y2 - p.y1) * progress;
        ctx.strokeStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(p.x1, p.y1);
        ctx.lineTo(x, y);
        ctx.stroke();
    }

    towers.forEach(t => t.update(delta));
    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        e.update(delta);
        if (e.health <= 0) {
            enemies.splice(i, 1);
            kills++;
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


