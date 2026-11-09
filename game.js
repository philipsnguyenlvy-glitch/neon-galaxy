// Game Engine - Neon Galaxy Space Shooter
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI Elements
const hud = document.getElementById('hud');
const scoreVal = document.getElementById('scoreVal');
const waveVal = document.getElementById('waveVal');
const highScoreVal = document.getElementById('highScoreVal');
const hpBar = document.getElementById('hpBar');
const weaponLevelIcons = document.querySelectorAll('.lvl-dot');
const bombIcons = document.getElementById('bombIcons');
const bossHpContainer = document.getElementById('bossHpContainer');
const bossHpFill = document.getElementById('bossHpFill');

const startScreen = document.getElementById('startScreen');
const pauseScreen = document.getElementById('pauseScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const finalScore = document.getElementById('finalScore');
const finalWave = document.getElementById('finalWave');
const finalHighScore = document.getElementById('finalHighScore');

const btnStart = document.getElementById('btnStart');
const btnResume = document.getElementById('btnResume');
const btnRestartFromPause = document.getElementById('btnRestartFromPause');
const btnRestart = document.getElementById('btnRestart');
const btnSoundToggle = document.getElementById('btnSoundToggle');

// State
let gameState = 'START'; // 'START', 'PLAYING', 'PAUSED', 'GAMEOVER'
let score = 0;
let highScore = parseInt(localStorage.getItem('neon_galaxy_highscore')) || 0;
let wave = 1;
let waveTimer = 0;
let screenShake = 0;

highScoreVal.textContent = highScore;

// Resize handling
function resizeCanvas() {
    const container = document.getElementById('game-container');
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Input Tracking
const keys = {};
const mouse = { x: canvas.width / 2, y: canvas.height * 0.8, isDown: false, active: false };

window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'KeyP') togglePause();
    if ((e.code === 'KeyE') && gameState === 'PLAYING') triggerBomb();
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
    mouse.active = true;
});

canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) mouse.isDown = true;
    if (e.button === 2) {
        e.preventDefault();
        triggerBomb();
    }
});

window.addEventListener('mouseup', (e) => {
    if (e.button === 0) mouse.isDown = false;
});

canvas.addEventListener('contextmenu', (e) => e.preventDefault());

// Touch support
canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    mouse.x = touch.clientX - rect.left;
    mouse.y = touch.clientY - rect.top;
    mouse.active = true;
    mouse.isDown = true;
}, { passive: false });

canvas.addEventListener('touchstart', (e) => {
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    mouse.x = touch.clientX - rect.left;
    mouse.y = touch.clientY - rect.top;
    mouse.active = true;
    mouse.isDown = true;
});

canvas.addEventListener('touchend', () => {
    mouse.isDown = false;
});

// Sound Toggle Button
btnSoundToggle.addEventListener('click', () => {
    sounds.init();
    const isMuted = sounds.toggleMute();
    btnSoundToggle.textContent = isMuted ? '🔇' : '🔊';
});

// Starfield Background
class Starfield {
    constructor() {
        this.stars = [];
        this.numStars = 120;
        this.init();
    }

    init() {
        this.stars = [];
        for (let i = 0; i < this.numStars; i++) {
            this.stars.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: Math.random() * 2 + 0.5,
                speed: Math.random() * 2.5 + 0.5,
                color: ['#00f0ff', '#ff007f', '#ffffff', '#7986cb'][Math.floor(Math.random() * 4)],
                alpha: Math.random() * 0.7 + 0.3
            });
        }
    }

    update() {
        for (const star of this.stars) {
            star.y += star.speed;
            if (star.y > canvas.height) {
                star.y = 0;
                star.x = Math.random() * canvas.width;
            }
        }
    }

    draw() {
        ctx.save();
        for (const star of this.stars) {
            ctx.fillStyle = star.color;
            ctx.globalAlpha = star.alpha;
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}

// Particle System
class Particle {
    constructor(x, y, color, size, speed, life, type = 'spark') {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = size;
        this.maxLife = life;
        this.life = life;
        const angle = Math.random() * Math.PI * 2;
        this.vx = Math.cos(angle) * speed * (Math.random() * 0.8 + 0.4);
        this.vy = Math.sin(angle) * speed * (Math.random() * 0.8 + 0.4);
        this.type = type;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life--;
        if (this.type === 'smoke') {
            this.size += 0.2;
        }
    }

    draw() {
        const progress = this.life / this.maxLife;
        ctx.save();
        ctx.globalAlpha = progress;
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(this.x, this.y, Math.max(0.5, this.size * progress), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

let particles = [];
function createExplosion(x, y, color = '#ff0055', count = 25, speed = 4) {
    for (let i = 0; i < count; i++) {
        particles.push(new Particle(x, y, color, Math.random() * 3 + 2, speed, Math.random() * 25 + 15));
    }
    for (let i = 0; i < 6; i++) {
        particles.push(new Particle(x, y, '#ffffff', Math.random() * 2 + 1, speed * 1.5, 15));
    }
}

// Player Ship
class Player {
    constructor() {
        this.width = 38;
        this.height = 42;
        this.x = canvas.width / 2;
        this.y = canvas.height * 0.82;
        this.speed = 6.5;
        this.maxHp = 100;
        this.hp = 100;
        this.weaponLevel = 1;
        this.bombs = 2;
        this.shootCooldown = 0;
        this.fireRate = 12; // lower = faster
        this.invulnerableTimer = 0;
        this.missiles = [];
    }

    update() {
        // Keyboard movement
        let moveX = 0;
        let moveY = 0;

        if (keys['KeyA'] || keys['ArrowLeft']) moveX -= 1;
        if (keys['KeyD'] || keys['ArrowRight']) moveX += 1;
        if (keys['KeyW'] || keys['ArrowUp']) moveY -= 1;
        if (keys['KeyS'] || keys['ArrowDown']) moveY += 1;

        if (moveX !== 0 || moveY !== 0) {
            mouse.active = false;
            const dist = Math.hypot(moveX, moveY);
            this.x += (moveX / dist) * this.speed;
            this.y += (moveY / dist) * this.speed;
        } else if (mouse.active) {
            // Smooth mouse follow
            const dx = mouse.x - this.x;
            const dy = mouse.y - this.y;
            this.x += dx * 0.15;
            this.y += dy * 0.15;
        }

        // Clamp boundaries
        this.x = Math.max(this.width / 2, Math.min(canvas.width - this.width / 2, this.x));
        this.y = Math.max(this.height / 2, Math.min(canvas.height - this.height / 2, this.y));

        // Engine flame thruster particles
        if (Math.random() < 0.6) {
            particles.push(new Particle(
                this.x + (Math.random() * 8 - 4),
                this.y + this.height / 2 + 2,
                Math.random() < 0.5 ? '#00f0ff' : '#0077ff',
                Math.random() * 2.5 + 1.5,
                1.5,
                14,
                'smoke'
            ));
        }

        // Auto/Manual Shooting
        if (this.shootCooldown > 0) this.shootCooldown--;
        const wantsToShoot = keys['Space'] || mouse.isDown || keys['KeyZ'];
        if (wantsToShoot && this.shootCooldown <= 0) {
            this.shoot();
            this.shootCooldown = Math.max(7, this.fireRate - (this.weaponLevel - 1));
        }

        if (this.invulnerableTimer > 0) this.invulnerableTimer--;
    }

    shoot() {
        sounds.playLaser(this.weaponLevel);
        const y = this.y - this.height / 2;

        if (this.weaponLevel === 1) {
            bullets.push(new Bullet(this.x, y, 0, -11, '#00f0ff', 12, 1));
        } else if (this.weaponLevel === 2) {
            bullets.push(new Bullet(this.x - 10, y, 0, -11, '#00f0ff', 12, 1));
            bullets.push(new Bullet(this.x + 10, y, 0, -11, '#00f0ff', 12, 1));
        } else if (this.weaponLevel === 3) {
            bullets.push(new Bullet(this.x, y, 0, -12, '#00f0ff', 13, 1));
            bullets.push(new Bullet(this.x - 12, y, -1.8, -11, '#00d0ff', 11, 1));
            bullets.push(new Bullet(this.x + 12, y, 1.8, -11, '#00d0ff', 11, 1));
        } else if (this.weaponLevel === 4) {
            bullets.push(new Bullet(this.x - 7, y, -0.6, -12, '#00f0ff', 14, 1));
            bullets.push(new Bullet(this.x + 7, y, 0.6, -12, '#00f0ff', 14, 1));
            bullets.push(new Bullet(this.x - 18, y + 4, -2.8, -11, '#ff00ea', 12, 1));
            bullets.push(new Bullet(this.x + 18, y + 4, 2.8, -11, '#ff00ea', 12, 1));
        } else {
            // Level 5 MAX: Overdrive barrage + homing seeker
            bullets.push(new Bullet(this.x, y - 4, 0, -14, '#ffffff', 20, 2));
            bullets.push(new Bullet(this.x - 12, y, -1.2, -12, '#00f0ff', 14, 1));
            bullets.push(new Bullet(this.x + 12, y, 1.2, -12, '#00f0ff', 14, 1));
            bullets.push(new Bullet(this.x - 24, y + 6, -3.5, -11, '#ff00ea', 13, 1));
            bullets.push(new Bullet(this.x + 24, y + 6, 3.5, -11, '#ff00ea', 13, 1));
        }
    }

    takeDamage(amount) {
        if (this.invulnerableTimer > 0) return;
        this.hp -= amount;
        this.invulnerableTimer = 45; // ~0.75s invincible
        screenShake = 10;
        sounds.playHit();
        createExplosion(this.x, this.y, '#00f0ff', 15, 3);

        if (this.weaponLevel > 1 && Math.random() < 0.4) {
            this.weaponLevel--;
            updateWeaponHUD();
        }

        updateHUD();

        if (this.hp <= 0) {
            this.hp = 0;
            updateHUD();
            gameOver();
        }
    }

    draw() {
        if (this.invulnerableTimer > 0 && Math.floor(Date.now() / 80) % 2 === 0) {
            return; // Flashing when hit
        }

        ctx.save();
        ctx.translate(this.x, this.y);

        // Neon Glow Shield aura
        ctx.strokeStyle = '#00f0ff';
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 12;
        ctx.lineWidth = 2.5;

        // Spaceship Body (sleek arrowhead design)
        ctx.fillStyle = '#0b162c';
        ctx.beginPath();
        ctx.moveTo(0, -this.height / 2);
        ctx.lineTo(this.width / 2, this.height / 2);
        ctx.lineTo(0, this.height / 3);
        ctx.lineTo(-this.width / 2, this.height / 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Inner Cockpit Core
        ctx.fillStyle = '#00ffff';
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.moveTo(0, -this.height / 4);
        ctx.lineTo(6, this.height / 6);
        ctx.lineTo(-6, this.height / 6);
        ctx.closePath();
        ctx.fill();

        // Wingtip accents
        ctx.fillStyle = '#ff007f';
        ctx.shadowColor = '#ff007f';
        ctx.shadowBlur = 8;
        ctx.fillRect(-this.width / 2 - 2, this.height / 3, 3, 7);
        ctx.fillRect(this.width / 2 - 1, this.height / 3, 3, 7);

        ctx.restore();
    }
}

// Bullet
class Bullet {
    constructor(x, y, vx, vy, color, damage, size = 1, isEnemy = false) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.damage = damage;
        this.size = size;
        this.isEnemy = isEnemy;
        this.radius = isEnemy ? 4.5 : 3.5 * size;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
    }

    draw() {
        ctx.save();
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        if (this.isEnemy) {
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Capsule beam for player lasers
            if (ctx.roundRect) {
                ctx.roundRect(this.x - this.radius, this.y - 8 * this.size, this.radius * 2, 16 * this.size, 3);
            } else {
                ctx.rect(this.x - this.radius, this.y - 8 * this.size, this.radius * 2, 16 * this.size);
            }
            ctx.fill();
        }
        ctx.restore();
    }
}

// Powerup Items
class Powerup {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type; // 'weapon', 'shield', 'bomb', 'score'
        this.vy = 1.8;
        this.radius = 14;
        this.angle = 0;
    }

    update() {
        this.y += this.vy;
        this.angle += 0.04;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        let color = '#00f0ff';
        let label = 'P';
        if (this.type === 'shield') { color = '#00ff88'; label = 'S'; }
        if (this.type === 'bomb') { color = '#ffd700'; label = 'B'; }
        if (this.type === 'score') { color = '#ff00e5'; label = '★'; }

        ctx.strokeStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 12;
        ctx.lineWidth = 2;
        ctx.strokeRect(-this.radius, -this.radius, this.radius * 2, this.radius * 2);

        ctx.rotate(-this.angle);
        ctx.fillStyle = color;
        ctx.font = 'bold 12px Orbitron, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, 0, 1);

        ctx.restore();
    }
}

// Enemies
class Asteroid {
    constructor(x, y, radius = 24, speedY = null) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.hp = Math.ceil(radius * 0.8);
        this.maxHp = this.hp;
        this.vy = speedY || (Math.random() * 1.5 + 1.2);
        this.vx = Math.random() * 1 - 0.5;
        this.rot = 0;
        this.rotSpeed = (Math.random() - 0.5) * 0.04;
        this.color = '#7986cb';

        // Generate jagged asteroid vertices
        this.points = [];
        const numPoints = 8;
        for (let i = 0; i < numPoints; i++) {
            const angle = (i / numPoints) * Math.PI * 2;
            const dist = this.radius * (0.75 + Math.random() * 0.4);
            this.points.push({ x: Math.cos(angle) * dist, y: Math.sin(angle) * dist });
        }
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.rot += this.rotSpeed;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rot);
        ctx.strokeStyle = '#a3b8cc';
        ctx.fillStyle = '#181e2b';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#5c6bc0';
        ctx.shadowBlur = 6;

        ctx.beginPath();
        ctx.moveTo(this.points[0].x, this.points[0].y);
        for (let i = 1; i < this.points.length; i++) {
            ctx.lineTo(this.points[i].x, this.points[i].y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.restore();
    }
}

class ScoutDrone {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 16;
        this.hp = 25;
        this.vy = 2.2;
        this.initialX = x;
        this.sinOffset = Math.random() * Math.PI * 2;
        this.shootTimer = Math.floor(Math.random() * 40 + 30);
    }

    update() {
        this.y += this.vy;
        this.sinOffset += 0.05;
        this.x = this.initialX + Math.sin(this.sinOffset) * 45;

        // Shoot at player
        this.shootTimer--;
        if (this.shootTimer <= 0) {
            sounds.playEnemyLaser();
            enemyBullets.push(new Bullet(this.x, this.y + 12, 0, 5.5, '#ff0055', 12, 1, true));
            this.shootTimer = Math.floor(Math.random() * 60 + 55);
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.strokeStyle = '#ff0055';
        ctx.fillStyle = '#2b0c16';
        ctx.shadowColor = '#ff0055';
        ctx.shadowBlur = 10;
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(0, 14);
        ctx.lineTo(14, -10);
        ctx.lineTo(0, -4);
        ctx.lineTo(-14, -10);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Eye
        ctx.fillStyle = '#ffcc00';
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

class Cruiser {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 28;
        this.hp = 85;
        this.vy = 1.1;
        this.shootTimer = 45;
    }

    update() {
        this.y += this.vy;
        this.shootTimer--;
        if (this.shootTimer <= 0) {
            sounds.playEnemyLaser();
            // Triple spread
            [-2.2, 0, 2.2].forEach(vx => {
                enemyBullets.push(new Bullet(this.x, this.y + 20, vx, 4.5, '#ff7700', 14, 1, true));
            });
            this.shootTimer = 75;
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.strokeStyle = '#ff7700';
        ctx.fillStyle = '#2c190a';
        ctx.shadowColor = '#ff7700';
        ctx.shadowBlur = 12;
        ctx.lineWidth = 2;

        // Heavy armor hexagon
        ctx.beginPath();
        ctx.moveTo(0, 24);
        ctx.lineTo(24, 6);
        ctx.lineTo(18, -20);
        ctx.lineTo(-18, -20);
        ctx.lineTo(-24, 6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Cannons
        ctx.fillStyle = '#ff7700';
        ctx.fillRect(-14, 14, 4, 8);
        ctx.fillRect(10, 14, 4, 8);

        ctx.restore();
    }
}

// Boss Mothership
class Boss {
    constructor() {
        this.x = canvas.width / 2;
        this.y = -120;
        this.targetY = 110;
        this.radius = 65;
        this.maxHp = 600 + wave * 250;
        this.hp = this.maxHp;
        this.attackTimer = 0;
        this.pattern = 0;
        this.dirX = 1;
        this.speedX = 1.6;
        bossHpContainer.classList.remove('hidden');
        sounds.playBossAlert();
    }

    update() {
        // Entrance animation
        if (this.y < this.targetY) {
            this.y += 1.5;
            return;
        }

        // Horizontal hover movement
        this.x += this.speedX * this.dirX;
        if (this.x > canvas.width - this.radius - 20) this.dirX = -1;
        if (this.x < this.radius + 20) this.dirX = 1;

        this.attackTimer++;

        // Attack patterns
        if (this.attackTimer % 45 === 0) {
            // Spiral ring shot
            const baseAngle = (this.attackTimer / 45) * 0.4;
            const count = 7;
            for (let i = 0; i < count; i++) {
                const angle = baseAngle + (i / count) * Math.PI * 2;
                const spd = 3.8;
                enemyBullets.push(new Bullet(
                    this.x,
                    this.y + 30,
                    Math.cos(angle) * spd,
                    Math.sin(angle) * spd,
                    '#ff0055',
                    15,
                    1.2,
                    true
                ));
            }
            sounds.playEnemyLaser();
        }

        if (this.attackTimer % 90 === 0) {
            // Direct aimed burst at player
            const angle = Math.atan2(player.y - this.y, player.x - this.x);
            [-0.2, 0, 0.2].forEach(offset => {
                const spd = 5.2;
                enemyBullets.push(new Bullet(
                    this.x,
                    this.y + 40,
                    Math.cos(angle + offset) * spd,
                    Math.sin(angle + offset) * spd,
                    '#ff00ff',
                    18,
                    1.3,
                    true
                ));
            });
        }

        // Update Boss HP bar
        const hpPercent = Math.max(0, (this.hp / this.maxHp) * 100);
        bossHpFill.style.width = hpPercent + '%';
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);

        ctx.strokeStyle = '#ff0055';
        ctx.fillStyle = '#260515';
        ctx.shadowColor = '#ff0055';
        ctx.shadowBlur = 20;
        ctx.lineWidth = 3;

        // Big Dreadnought Silhouette
        ctx.beginPath();
        ctx.moveTo(0, 50);
        ctx.lineTo(60, 20);
        ctx.lineTo(75, -30);
        ctx.lineTo(30, -50);
        ctx.lineTo(-30, -50);
        ctx.lineTo(-75, -30);
        ctx.lineTo(-60, 20);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Core pulsating sphere
        const pulse = 12 + Math.sin(Date.now() / 150) * 3;
        ctx.fillStyle = '#ff007f';
        ctx.shadowColor = '#ff00e5';
        ctx.shadowBlur = 25;
        ctx.beginPath();
        ctx.arc(0, 0, pulse, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

// Game Arrays
const starfield = new Starfield();
let player = new Player();
let bullets = [];
let enemyBullets = [];
let enemies = [];
let powerups = [];
let boss = null;
let spawnTimer = 0;

// Bomb Function
function triggerBomb() {
    if (player.bombs <= 0 || gameState !== 'PLAYING') return;
    player.bombs--;
    updateBombHUD();
    sounds.playBomb();
    screenShake = 25;

    // Destroy all normal enemies & clear bullets
    enemyBullets = [];

    for (const enemy of enemies) {
        createExplosion(enemy.x, enemy.y, '#ffd700', 30, 6);
        score += 100;
    }
    enemies = [];

    if (boss) {
        boss.hp -= 250;
        createExplosion(boss.x, boss.y, '#ffd700', 40, 8);
        if (boss.hp <= 0) destroyBoss();
    }

    updateHUD();
}

// Drop item logic
function maybeDropPowerup(x, y) {
    const rand = Math.random();
    if (rand < 0.12) {
        powerups.push(new Powerup(x, y, 'weapon'));
    } else if (rand < 0.20) {
        powerups.push(new Powerup(x, y, 'shield'));
    } else if (rand < 0.25) {
        powerups.push(new Powerup(x, y, 'bomb'));
    } else if (rand < 0.40) {
        powerups.push(new Powerup(x, y, 'score'));
    }
}

function destroyBoss() {
    createExplosion(boss.x, boss.y, '#ff007f', 80, 8);
    sounds.playExplosion(3);
    score += 2000 * wave;
    powerups.push(new Powerup(boss.x - 20, boss.y, 'weapon'));
    powerups.push(new Powerup(boss.x + 20, boss.y, 'shield'));
    powerups.push(new Powerup(boss.x, boss.y + 20, 'bomb'));
    boss = null;
    bossHpContainer.classList.add('hidden');
    wave++;
    updateHUD();
}

// Spawn wave management
function handleSpawns() {
    if (boss) return; // Don't spawn swarm during boss

    spawnTimer++;
    const interval = Math.max(35, 75 - wave * 4);

    if (spawnTimer >= interval) {
        spawnTimer = 0;
        const x = Math.random() * (canvas.width - 60) + 30;
        const typeRand = Math.random();

        if (typeRand < 0.5) {
            enemies.push(new Asteroid(x, -30, Math.random() * 15 + 18));
        } else if (typeRand < 0.8) {
            enemies.push(new ScoutDrone(x, -20));
        } else {
            enemies.push(new Cruiser(x, -30));
        }
    }

    // Boss trigger every 5 waves or ~3000 score milestones
    if (score >= wave * 3000 && !boss) {
        boss = new Boss();
    }
}

// Collision Helper
function checkCircleCollision(c1, c2) {
    const dx = c1.x - c2.x;
    const dy = c1.y - c2.y;
    return (dx * dx + dy * dy) < (c1.radius + c2.radius) * (c1.radius + c2.radius);
}

// Game Updates & Physics
function update() {
    starfield.update();
    player.update();
    handleSpawns();

    // Bullets update
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.update();
        if (b.y < -20 || b.x < -20 || b.x > canvas.width + 20) {
            bullets.splice(i, 1);
        }
    }

    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const eb = enemyBullets[i];
        eb.update();
        if (eb.y > canvas.height + 20 || eb.x < -20 || eb.x > canvas.width + 20) {
            enemyBullets.splice(i, 1);
            continue;
        }

        // Enemy bullet hits player
        if (checkCircleCollision({ x: eb.x, y: eb.y, radius: eb.radius }, { x: player.x, y: player.y, radius: 15 })) {
            player.takeDamage(eb.damage);
            enemyBullets.splice(i, 1);
        }
    }

    // Enemies update & bullet collisions
    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        e.update();

        // Player collision
        if (checkCircleCollision(e, { x: player.x, y: player.y, radius: 16 })) {
            player.takeDamage(25);
            createExplosion(e.x, e.y, '#ff0055', 20, 4);
            enemies.splice(i, 1);
            continue;
        }

        // Offscreen remove
        if (e.y > canvas.height + 60) {
            enemies.splice(i, 1);
            continue;
        }

        // Hit by player bullets
        for (let j = bullets.length - 1; j >= 0; j--) {
            const b = bullets[j];
            if (checkCircleCollision(e, { x: b.x, y: b.y, radius: b.radius })) {
                e.hp -= b.damage;
                createExplosion(b.x, b.y, '#00f0ff', 4, 2);
                bullets.splice(j, 1);

                if (e.hp <= 0) {
                    sounds.playExplosion(1);
                    createExplosion(e.x, e.y, e.color || '#ff0055', 25, 4);
                    score += 50;
                    maybeDropPowerup(e.x, e.y);

                    // Asteroid split mechanic
                    if (e instanceof Asteroid && e.radius > 20) {
                        enemies.push(new Asteroid(e.x - 10, e.y, e.radius / 1.7, e.vy * 1.3));
                        enemies.push(new Asteroid(e.x + 10, e.y, e.radius / 1.7, e.vy * 1.3));
                    }

                    enemies.splice(i, 1);
                    updateHUD();
                    break;
                }
            }
        }
    }

    // Boss logic
    if (boss) {
        boss.update();

        // Player collision with boss
        if (checkCircleCollision(boss, { x: player.x, y: player.y, radius: 20 })) {
            player.takeDamage(35);
        }

        // Bullets hit boss
        for (let j = bullets.length - 1; j >= 0; j--) {
            const b = bullets[j];
            if (checkCircleCollision(boss, { x: b.x, y: b.y, radius: b.radius })) {
                boss.hp -= b.damage;
                createExplosion(b.x, b.y, '#ff0055', 4, 3);
                bullets.splice(j, 1);

                if (boss.hp <= 0) {
                    destroyBoss();
                    break;
                }
            }
        }
    }

    // Powerups update
    for (let i = powerups.length - 1; i >= 0; i--) {
        const p = powerups[i];
        p.update();

        // Player pickup
        if (checkCircleCollision(p, { x: player.x, y: player.y, radius: 24 })) {
            sounds.playPowerup();
            createExplosion(p.x, p.y, '#ffffff', 18, 3);

            if (p.type === 'weapon') {
                if (player.weaponLevel < 5) player.weaponLevel++;
                updateWeaponHUD();
            } else if (p.type === 'shield') {
                player.hp = Math.min(player.maxHp, player.hp + 35);
                updateHUD();
            } else if (p.type === 'bomb') {
                player.bombs = Math.min(5, player.bombs + 1);
                updateBombHUD();
            } else if (p.type === 'score') {
                score += 500;
                updateHUD();
            }

            powerups.splice(i, 1);
            continue;
        }

        if (p.y > canvas.height + 40) {
            powerups.splice(i, 1);
        }
    }

    // Particles update
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        if (particles[i].life <= 0) {
            particles.splice(i, 1);
        }
    }

    // Screen Shake decay
    if (screenShake > 0) screenShake *= 0.9;
    if (screenShake < 0.5) screenShake = 0;
}

// Rendering
function render() {
    ctx.save();

    // Screen shake transform
    if (screenShake > 0) {
        const shakeX = (Math.random() - 0.5) * screenShake;
        const shakeY = (Math.random() - 0.5) * screenShake;
        ctx.translate(shakeX, shakeY);
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background elements
    starfield.draw();

    // Draw game objects
    for (const p of powerups) p.draw();
    for (const b of bullets) b.draw();
    for (const eb of enemyBullets) eb.draw();
    for (const e of enemies) e.draw();
    if (boss) boss.draw();
    player.draw();
    for (const pt of particles) pt.draw();

    ctx.restore();
}

// Game Loop
function gameLoop() {
    if (gameState === 'PLAYING') {
        update();
        render();
    }
    requestAnimationFrame(gameLoop);
}

// HUD updates
function updateHUD() {
    scoreVal.textContent = score;
    waveVal.textContent = wave;
    hpBar.style.width = Math.max(0, (player.hp / player.maxHp) * 100) + '%';
    if (score > highScore) {
        highScore = score;
        highScoreVal.textContent = highScore;
        localStorage.setItem('neon_galaxy_highscore', highScore);
    }
}

function updateWeaponHUD() {
    weaponLevelIcons.forEach((icon, idx) => {
        if (idx < player.weaponLevel) {
            icon.classList.add('active');
        } else {
            icon.classList.remove('active');
        }
    });
}

function updateBombHUD() {
    bombIcons.textContent = '💣 '.repeat(player.bombs);
}

// Game Controls
function startGame() {
    sounds.init();
    score = 0;
    wave = 1;
    gameState = 'PLAYING';
    player = new Player();
    bullets = [];
    enemyBullets = [];
    enemies = [];
    powerups = [];
    particles = [];
    boss = null;
    bossHpContainer.classList.add('hidden');

    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    pauseScreen.classList.add('hidden');
    hud.classList.remove('hidden');

    updateHUD();
    updateWeaponHUD();
    updateBombHUD();
}

function gameOver() {
    gameState = 'GAMEOVER';
    sounds.playExplosion(2.5);
    finalScore.textContent = score;
    finalWave.textContent = wave;
    finalHighScore.textContent = highScore;

    gameOverScreen.classList.remove('hidden');
}

function togglePause() {
    if (gameState === 'PLAYING') {
        gameState = 'PAUSED';
        pauseScreen.classList.remove('hidden');
    } else if (gameState === 'PAUSED') {
        gameState = 'PLAYING';
        pauseScreen.classList.add('hidden');
    }
}

// Event Listeners for UI
btnStart.addEventListener('click', startGame);
btnResume.addEventListener('click', togglePause);
btnRestartFromPause.addEventListener('click', startGame);
btnRestart.addEventListener('click', startGame);

// Initial Render for Start Screen
starfield.init();
function idleLoop() {
    if (gameState === 'START' || gameState === 'PAUSED' || gameState === 'GAMEOVER') {
        starfield.update();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        starfield.draw();
    }
    requestAnimationFrame(idleLoop);
}
idleLoop();
gameLoop();
