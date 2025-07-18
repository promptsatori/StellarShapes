class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        
        // Game state
        this.gameState = 'start'; // 'start', 'playing', 'paused', 'dying', 'gameOver'
        this.score = 0;
        this.wave = 1;
        this.lastTime = 0;
        this.pausedTime = 0;
        this.deathStartTime = 0;
        
        // Enhanced Player with animation
        this.player = {
            x: this.width / 2,
            y: this.height - 60,
            width: 30,
            height: 30,
            baseWidth: 30,
            baseHeight: 30,
            speed: 5,
            health: 100,
            maxHealth: 100,
            lastShot: 0,
            shotCooldown: 200,
            hasWings: false,
            wingDuration: 0,
            sizeBoost: false,
            sizeDuration: 0,
            sizeMultiplier: 1,
            invincible: false,
            engineGlow: 0,
            rotation: 0,
            tilt: 0,
            thrusterParticles: []
        };
        
        // Enhanced Game objects
        this.lasers = [];
        this.enemies = [];
        this.powerUps = [];
        this.particles = [];
        this.bosses = [];
        this.miniBosses = [];
        this.stars = [];
        this.spaceGas = [];
        
        // Initialize background elements
        this.initializeStarField();
        this.initializeSpaceGas();
        
        // Enemy spawn timing
        this.lastEnemySpawn = 0;
        this.enemySpawnRate = 1000;
        
        // Boss timing
        this.lastBossWave = 0;
        this.bossWaveInterval = 30000; // 30 seconds
        this.bossWaveCount = 0;
        
        // Power-up timing
        this.lastPowerUpSpawn = 0;
        this.powerUpSpawnRate = 15000; // 15 seconds
        
        // Screen shake for hit feedback
        this.screenShake = 0;
        this.screenShakeDecay = 0.9;
        
        // Input handling
        this.keys = {};
        this.setupInput();
        this.setupVisibilityHandling();
        
        // Start the game loop
        this.gameLoop();
    }
    
    initializeStarField() {
        for (let i = 0; i < 200; i++) {
            this.stars.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                size: Math.random() * 3 + 1,
                speed: Math.random() * 2 + 0.5,
                brightness: Math.random() * 0.8 + 0.2,
                twinkle: Math.random() * Math.PI * 2
            });
        }
    }
    
    initializeSpaceGas() {
        for (let i = 0; i < 25; i++) {
            this.spaceGas.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                size: Math.random() * 60 + 30,
                speed: Math.random() * 0.2 + 0.05,
                color: ['#221144', '#112233', '#332211', '#441122', '#113322'][Math.floor(Math.random() * 5)],
                opacity: Math.random() * 0.03 + 0.01,
                drift: Math.random() * 0.5 + 0.1,
                phase: Math.random() * Math.PI * 2
            });
        }
    }
    
    
    setupInput() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            
            if (e.code === 'KeyS') {
                e.preventDefault();
                if (this.gameState === 'start') {
                    this.startGame();
                } else if (this.gameState === 'gameOver') {
                    this.restartGame();
                }
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
        
        // Button event listeners
        document.getElementById('startButton').addEventListener('click', () => {
            if (this.gameState === 'start') {
                this.startGame();
            }
        });
        
        document.getElementById('restartButton').addEventListener('click', () => {
            if (this.gameState === 'gameOver') {
                this.restartGame();
            }
        });
    }
    
    setupVisibilityHandling() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.gameState === 'playing') {
                this.gameState = 'paused';
                this.pausedTime = Date.now();
            } else if (!document.hidden && this.gameState === 'paused') {
                // Adjust all time-based spawns to account for pause
                const pauseDuration = Date.now() - this.pausedTime;
                this.lastEnemySpawn += pauseDuration;
                this.lastBossWave += pauseDuration;
                this.lastPowerUpSpawn += pauseDuration;
                this.player.lastShot += pauseDuration;
                
                // Adjust boss and miniboss shot timers
                this.bosses.forEach(boss => boss.lastShot += pauseDuration);
                this.miniBosses.forEach(miniBoss => miniBoss.lastShot += pauseDuration);
                
                this.gameState = 'playing';
            }
        });
    }
    
    startGame() {
        this.gameState = 'playing';
        document.getElementById('startScreen').classList.add('hidden');
    }
    
    restartGame() {
        // Reset all game state
        this.score = 0;
        this.wave = 1;
        this.player.health = this.player.maxHealth;
        this.player.x = this.width / 2;
        this.player.y = this.height - 60;
        this.player.width = this.player.baseWidth;
        this.player.height = this.player.baseHeight;
        this.player.hasWings = false;
        this.player.wingDuration = 0;
        this.player.sizeBoost = false;
        this.player.sizeDuration = 0;
        this.player.sizeMultiplier = 1;
        this.player.invincible = false;
        this.player.shotCooldown = 200;
        this.player.thrusterParticles = []; // Clear thruster particles
        this.player.engineGlow = 0; // Reset engine glow
        this.player.tilt = 0; // Reset ship tilt
        this.lasers = [];
        this.enemies = [];
        this.powerUps = [];
        this.particles = []; // Clear all explosion/destruction particles
        this.bosses = [];
        this.miniBosses = [];
        this.lastEnemySpawn = 0;
        this.lastBossWave = 0;
        this.lastPowerUpSpawn = 0;
        this.bossWaveCount = 0;
        this.screenShake = 0;
        this.deathStartTime = 0; // Reset death animation timing
        
        this.gameState = 'playing';
        document.getElementById('gameOverScreen').classList.add('hidden');
        this.updateUI();
    }
    
    gameLoop(currentTime = 0) {
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        if (this.gameState === 'playing') {
            this.update(deltaTime);
        } else if (this.gameState === 'dying') {
            // Update everything except player during dying state
            this.updateLasers(deltaTime);
            this.updateEnemies(deltaTime);
            this.updateBosses(deltaTime);
            this.updateMiniBosses(deltaTime);
            this.updatePowerUps(deltaTime);
            this.updateParticles(deltaTime);
            this.updateThrusterParticles(deltaTime); // Keep existing thruster particles moving
            this.updateStarField(deltaTime);
            this.updateSpaceGas(deltaTime);
            this.spawnEnemies(deltaTime);
            this.spawnBosses(deltaTime);
            this.spawnPowerUps(deltaTime);
            this.checkCollisionsExcludingPlayer(); // Only check non-player collisions
            this.updateDifficulty();
            this.updateScreenShake(deltaTime);
            this.updateDeathSequence();
            this.updateUI();
        }
        
        this.render();
        requestAnimationFrame((time) => this.gameLoop(time));
    }
    
    update(deltaTime) {
        this.updatePlayer(deltaTime);
        this.updateLasers(deltaTime);
        this.updateEnemies(deltaTime);
        this.updateBosses(deltaTime);
        this.updateMiniBosses(deltaTime);
        this.updatePowerUps(deltaTime);
        this.updateParticles(deltaTime);
        this.updateStarField(deltaTime);
        this.updateSpaceGas(deltaTime);
        this.spawnEnemies(deltaTime);
        this.spawnBosses(deltaTime);
        this.spawnPowerUps(deltaTime);
        this.checkCollisions();
        this.updateDifficulty();
        this.updateScreenShake(deltaTime);
        this.updateUI();
        
        // Check game over
        if (this.player.health <= 0 && this.gameState === 'playing') {
            this.startDeathSequence();
        }
        
        // Handle death sequence
        if (this.gameState === 'dying') {
            this.updateDeathSequence();
        }
    }
    
    updatePlayer(deltaTime) {
        // Don't update player during dying state
        if (this.gameState === 'dying') {
            return;
        }
        
        // Update power-up timers
        if (this.player.hasWings) {
            this.player.wingDuration -= deltaTime;
            if (this.player.wingDuration <= 0) {
                this.player.hasWings = false;
            }
        }
        
        if (this.player.sizeBoost) {
            this.player.sizeDuration -= deltaTime;
            if (this.player.sizeDuration <= 0) {
                this.player.sizeBoost = false;
                this.player.sizeMultiplier = 1;
                this.player.width = this.player.baseWidth;
                this.player.height = this.player.baseHeight;
                this.player.invincible = false;
            }
        }
        
        // Enhanced Movement with animation
        let isMoving = false;
        this.player.tilt *= 0.9; // Smooth tilt reset
        
        if (this.keys['ArrowLeft'] && this.player.x > 0) {
            this.player.x -= this.player.speed;
            this.player.tilt = Math.max(this.player.tilt - 0.15, -0.3);
            isMoving = true;
            this.createThrusterParticles('left');
        }
        if (this.keys['ArrowRight'] && this.player.x < this.width - this.player.width) {
            this.player.x += this.player.speed;
            this.player.tilt = Math.min(this.player.tilt + 0.15, 0.3);
            isMoving = true;
            this.createThrusterParticles('right');
        }
        if (this.keys['ArrowUp'] && this.player.y > 0) {
            this.player.y -= this.player.speed;
            isMoving = true;
            this.createThrusterParticles('up');
        }
        if (this.keys['ArrowDown'] && this.player.y < this.height - this.player.height) {
            this.player.y += this.player.speed;
            isMoving = true;
            this.createThrusterParticles('down');
        }
        
        // Engine glow animation
        if (isMoving) {
            this.player.engineGlow = Math.min(this.player.engineGlow + 0.1, 1);
        } else {
            this.player.engineGlow *= 0.95;
        }
        
        // Update thruster particles
        this.updateThrusterParticles(deltaTime);
        
        // Shooting
        if (this.keys['Space'] && Date.now() - this.player.lastShot > this.player.shotCooldown) {
            this.shootLasers();
            this.player.lastShot = Date.now();
        }
    }
    
    shootLasers() {
        const laserSpeed = 8;
        const spread = 15;
        
        // Determine laser properties based on size boost (orange power-up)
        const isOrangePowerUp = this.player.sizeBoost;
        const laserColor = isOrangePowerUp ? '#ff8800' : '#00ffff';
        const laserDamage = isOrangePowerUp ? 3 : 1;
        const laserWidth = isOrangePowerUp ? 6 : 4;
        const laserHeight = isOrangePowerUp ? 20 : 15;
        
        // Main ship lasers (triple beam)
        // Center laser
        this.lasers.push({
            x: this.player.x + this.player.width / 2 - laserWidth / 2,
            y: this.player.y,
            width: laserWidth,
            height: laserHeight,
            speed: laserSpeed,
            color: laserColor,
            damage: laserDamage,
            special: isOrangePowerUp
        });
        
        // Left laser
        this.lasers.push({
            x: this.player.x + this.player.width / 2 - laserWidth / 2 - spread,
            y: this.player.y,
            width: laserWidth,
            height: laserHeight,
            speed: laserSpeed,
            color: laserColor,
            damage: laserDamage,
            special: isOrangePowerUp
        });
        
        // Right laser
        this.lasers.push({
            x: this.player.x + this.player.width / 2 - laserWidth / 2 + spread,
            y: this.player.y,
            width: laserWidth,
            height: laserHeight,
            speed: laserSpeed,
            color: laserColor,
            damage: laserDamage,
            special: isOrangePowerUp
        });
        
        // Wing lasers (if wings power-up is active)
        if (this.player.hasWings) {
            const wingSpread = 35;
            const wingColor = isOrangePowerUp ? '#ffaa00' : '#ffff00';
            
            // Left wing laser
            this.lasers.push({
                x: this.player.x + this.player.width / 2 - 2 - wingSpread,
                y: this.player.y,
                width: 3,
                height: 12,
                speed: laserSpeed,
                color: wingColor,
                damage: laserDamage,
                special: isOrangePowerUp
            });
            
            // Right wing laser
            this.lasers.push({
                x: this.player.x + this.player.width / 2 - 2 + wingSpread,
                y: this.player.y,
                width: 3,
                height: 12,
                speed: laserSpeed,
                color: wingColor,
                damage: laserDamage,
                special: isOrangePowerUp
            });
        }
    }
    
    updateLasers(deltaTime) {
        for (let i = this.lasers.length - 1; i >= 0; i--) {
            const laser = this.lasers[i];
            laser.y -= laser.speed;
            
            if (laser.y < -laser.height) {
                this.lasers.splice(i, 1);
            }
        }
    }
    
    spawnEnemies(deltaTime) {
        if (Date.now() - this.lastEnemySpawn > this.enemySpawnRate) {
            const colors = ['#ff0000', '#ff8800', '#ffff00', '#00ff00', '#0088ff', '#8800ff'];
            const color = colors[Math.floor(Math.random() * colors.length)];
            
            this.enemies.push({
                x: Math.random() * (this.width - 30),
                y: -30,
                width: 30,
                height: 30,
                speed: 1 + Math.random() * 2 + this.wave * 0.2,
                color: color,
                health: 1,
                points: 10
            });
            
            this.lastEnemySpawn = Date.now();
        }
    }
    
    updateEnemies(deltaTime) {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            enemy.y += enemy.speed;
            
            if (enemy.y > this.height) {
                this.enemies.splice(i, 1);
            }
        }
    }
    
    spawnBosses(deltaTime) {
        if (Date.now() - this.lastBossWave > this.bossWaveInterval) {
            this.bossWaveCount++;
            
            const bossSize = 120;
            const spawnPositions = [
                this.width * 0.2 - bossSize/2,  // Left side
                this.width * 0.5 - bossSize/2,  // Center
                this.width * 0.8 - bossSize/2   // Right side
            ];
            const spawnX = spawnPositions[Math.floor(Math.random() * spawnPositions.length)];
            
            // Progressive difficulty scaling
            const difficultyMultiplier = Math.min(this.bossWaveCount * 0.3, 2.0);
            const bossSpeed = 0.5 + difficultyMultiplier;
            const bossHealth = 25 + this.wave * 5 + this.bossWaveCount * 3;
            const shotCooldown = Math.max(400, 800 - this.bossWaveCount * 50);
            
            // Spawn main boss
            this.bosses.push({
                x: Math.max(0, Math.min(this.width - bossSize, spawnX)),
                y: -bossSize,
                width: bossSize,
                height: bossSize,
                speed: bossSpeed,
                health: bossHealth,
                maxHealth: bossHealth,
                color: '#aa0000',
                points: 750 + this.bossWaveCount * 100,
                lastShot: 0,
                shotCooldown: shotCooldown
            });
            
            // Spawn mini-bosses starting from 3rd wave
            if (this.bossWaveCount >= 3) {
                const miniBossSize = 60;
                const miniBossHealth = 8 + this.bossWaveCount * 2;
                
                // Left mini-boss
                this.miniBosses.push({
                    x: Math.max(0, spawnX - 80),
                    y: -miniBossSize,
                    width: miniBossSize,
                    height: miniBossSize,
                    speed: bossSpeed * 0.8,
                    health: miniBossHealth,
                    maxHealth: miniBossHealth,
                    color: '#cc4400',
                    points: 250,
                    lastShot: 0,
                    shotCooldown: shotCooldown + 200
                });
                
                // Right mini-boss
                this.miniBosses.push({
                    x: Math.min(this.width - miniBossSize, spawnX + bossSize + 20),
                    y: -miniBossSize,
                    width: miniBossSize,
                    height: miniBossSize,
                    speed: bossSpeed * 0.8,
                    health: miniBossHealth,
                    maxHealth: miniBossHealth,
                    color: '#cc4400',
                    points: 250,
                    lastShot: 0,
                    shotCooldown: shotCooldown + 300
                });
            }
            
            this.lastBossWave = Date.now();
        }
    }
    
    updateBosses(deltaTime) {
        for (let i = this.bosses.length - 1; i >= 0; i--) {
            const boss = this.bosses[i];
            
            // Boss movement pattern
            if (boss.y < 50) {
                boss.y += boss.speed;
            } else {
                boss.x += Math.sin(Date.now() * 0.002) * 2;
                boss.x = Math.max(0, Math.min(this.width - boss.width, boss.x));
            }
            
            // Boss shooting
            if (Date.now() - boss.lastShot > boss.shotCooldown) {
                this.spawnEnemyLaser(boss);
                boss.lastShot = Date.now();
            }
            
            if (boss.y > this.height) {
                this.bosses.splice(i, 1);
            }
        }
    }
    
    updateMiniBosses(deltaTime) {
        for (let i = this.miniBosses.length - 1; i >= 0; i--) {
            const miniBoss = this.miniBosses[i];
            
            // Mini-boss movement pattern (similar to main boss but slightly different)
            if (miniBoss.y < 40) {
                miniBoss.y += miniBoss.speed;
            } else {
                miniBoss.x += Math.sin(Date.now() * 0.003 + i) * 1.5;
                miniBoss.x = Math.max(0, Math.min(this.width - miniBoss.width, miniBoss.x));
            }
            
            // Mini-boss shooting
            if (Date.now() - miniBoss.lastShot > miniBoss.shotCooldown) {
                this.spawnEnemyLaser(miniBoss);
                miniBoss.lastShot = Date.now();
            }
            
            if (miniBoss.y > this.height) {
                this.miniBosses.splice(i, 1);
            }
        }
    }
    
    spawnEnemyLaser(enemy) {
        this.lasers.push({
            x: enemy.x + enemy.width / 2 - 2,
            y: enemy.y + enemy.height,
            width: 4,
            height: 15,
            speed: -4,
            color: '#ff0000',
            enemy: true
        });
    }
    
    spawnPowerUps(deltaTime) {
        if (Date.now() - this.lastPowerUpSpawn > this.powerUpSpawnRate) {
            const types = ['health', 'wings', 'size'];
            const type = types[Math.floor(Math.random() * types.length)];
            
            let color;
            switch(type) {
                case 'health': color = '#00ff00'; break;
                case 'wings': color = '#ffff00'; break;
                case 'size': color = '#ff8800'; break;
            }
            
            this.powerUps.push({
                x: Math.random() * (this.width - 24),
                y: -24,
                width: 24,
                height: 24,
                speed: 2,
                type: type,
                color: color
            });
            
            this.lastPowerUpSpawn = Date.now();
        }
    }
    
    updatePowerUps(deltaTime) {
        for (let i = this.powerUps.length - 1; i >= 0; i--) {
            const powerUp = this.powerUps[i];
            powerUp.y += powerUp.speed;
            
            if (powerUp.y > this.height) {
                this.powerUps.splice(i, 1);
            }
        }
    }
    
    updateParticles(deltaTime) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life -= deltaTime;
            
            // Update rotation if it exists
            if (particle.rotationSpeed !== undefined) {
                particle.rotation += particle.rotationSpeed;
            }
            
            // Apply slight friction
            particle.vx *= 0.99;
            particle.vy *= 0.99;
            
            if (particle.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    updateStarField(deltaTime) {
        for (let star of this.stars) {
            star.y += star.speed;
            star.twinkle += 0.05;
            
            if (star.y > this.height) {
                star.y = -10;
                star.x = Math.random() * this.width;
            }
        }
    }
    
    updateSpaceGas(deltaTime) {
        for (let gas of this.spaceGas) {
            gas.y += gas.speed;
            gas.phase += 0.01;
            gas.x += Math.sin(gas.phase) * gas.drift;
            
            // Keep gas clouds within bounds horizontally
            if (gas.x < -gas.size) gas.x = this.width + gas.size;
            if (gas.x > this.width + gas.size) gas.x = -gas.size;
            
            if (gas.y > this.height + gas.size) {
                gas.y = -gas.size;
                gas.x = Math.random() * this.width;
            }
        }
    }
    
    
    createThrusterParticles(direction) {
        const particleCount = 3;
        const baseX = this.player.x + this.player.width / 2;
        const baseY = this.player.y + this.player.height;
        
        // Choose thruster colors based on size boost (orange power-up)
        const thrusterColors = this.player.sizeBoost ? 
            ['#ff8800', '#ffaa00', '#ffcc00'] : // Orange colors during power-up
            ['#00aaff', '#0088ff', '#ffffff']; // Normal blue/white colors
        
        // Scale particle spread based on ship size during power-up
        const sizeMultiplier = this.player.sizeBoost ? this.player.sizeMultiplier : 1;
        const particleSpread = 20 * sizeMultiplier;
        
        for (let i = 0; i < particleCount; i++) {
            let vx = (Math.random() - 0.5) * 2;
            let vy = Math.random() * 3 + 2;
            
            switch(direction) {
                case 'left':
                    vx += 2;
                    break;
                case 'right':
                    vx -= 2;
                    break;
                case 'up':
                    vy += 2;
                    break;
            }
            
            // Scale individual particle size based on ship size
            const particleSize = (Math.random() * 3 + 1) * sizeMultiplier;
            
            this.player.thrusterParticles.push({
                x: baseX + (Math.random() - 0.5) * particleSpread,
                y: baseY,
                vx: vx,
                vy: vy,
                life: 200 + Math.random() * 100,
                maxLife: 300,
                size: particleSize,
                color: thrusterColors[Math.floor(Math.random() * thrusterColors.length)]
            });
        }
    }
    
    updateThrusterParticles(deltaTime) {
        for (let i = this.player.thrusterParticles.length - 1; i >= 0; i--) {
            const particle = this.player.thrusterParticles[i];
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life -= deltaTime;
            particle.vy += 0.1; // gravity
            
            if (particle.life <= 0) {
                this.player.thrusterParticles.splice(i, 1);
            }
        }
    }
    
    checkCollisionsExcludingPlayer() {
        // Only check laser vs enemy/boss collisions during death sequence
        // Player collision checks are excluded
        
        // Laser vs Enemy collisions
        for (let i = this.lasers.length - 1; i >= 0; i--) {
            const laser = this.lasers[i];
            if (laser.enemy) continue;
            
            // Check enemy collisions
            for (let j = this.enemies.length - 1; j >= 0; j--) {
                const enemy = this.enemies[j];
                if (this.isColliding(laser, enemy)) {
                    this.createExplosion(enemy.x + enemy.width/2, enemy.y + enemy.height/2, enemy.color);
                    this.score += enemy.points;
                    this.enemies.splice(j, 1);
                    this.lasers.splice(i, 1);
                    break;
                }
            }
            
            // Check boss collisions
            for (let j = this.bosses.length - 1; j >= 0; j--) {
                const boss = this.bosses[j];
                if (this.isColliding(laser, boss)) {
                    const damage = laser.damage || 1;
                    boss.health -= damage;
                    const explosionColor = laser.special ? '#ff8800' : '#ffff00';
                    this.createExplosion(laser.x, laser.y, explosionColor);
                    this.lasers.splice(i, 1);
                    
                    if (boss.health <= 0) {
                        this.createBossExplosion(boss.x + boss.width/2, boss.y + boss.height/2);
                        this.score += boss.points;
                        this.bosses.splice(j, 1);
                    }
                    break;
                }
            }
            
            // Check mini-boss collisions
            for (let j = this.miniBosses.length - 1; j >= 0; j--) {
                const miniBoss = this.miniBosses[j];
                if (this.isColliding(laser, miniBoss)) {
                    const damage = laser.damage || 1;
                    miniBoss.health -= damage;
                    const explosionColor = laser.special ? '#ff8800' : '#ff8800';
                    this.lasers.splice(i, 1);
                    
                    if (miniBoss.health <= 0) {
                        this.createExplosion(miniBoss.x + miniBoss.width/2, miniBoss.y + miniBoss.height/2, miniBoss.color);
                        this.score += miniBoss.points;
                        this.miniBosses.splice(j, 1);
                    }
                    break;
                }
            }
        }
        
        // Remove enemy lasers that go off screen (no player collision check)
        for (let i = this.lasers.length - 1; i >= 0; i--) {
            const laser = this.lasers[i];
            if (laser.enemy && laser.y > this.height) {
                this.lasers.splice(i, 1);
            }
        }
    }

    checkCollisions() {
        // Laser vs Enemy collisions
        for (let i = this.lasers.length - 1; i >= 0; i--) {
            const laser = this.lasers[i];
            if (laser.enemy) continue;
            
            // Check enemy collisions
            for (let j = this.enemies.length - 1; j >= 0; j--) {
                const enemy = this.enemies[j];
                if (this.isColliding(laser, enemy)) {
                    this.createExplosion(enemy.x + enemy.width/2, enemy.y + enemy.height/2, enemy.color);
                    this.score += enemy.points;
                    this.enemies.splice(j, 1);
                    this.lasers.splice(i, 1);
                    break;
                }
            }
            
            // Check boss collisions
            for (let j = this.bosses.length - 1; j >= 0; j--) {
                const boss = this.bosses[j];
                if (this.isColliding(laser, boss)) {
                    const damage = laser.damage || 1;
                    boss.health -= damage;
                    const explosionColor = laser.special ? '#ff8800' : '#ffff00';
                    this.createExplosion(laser.x, laser.y, explosionColor);
                    this.lasers.splice(i, 1);
                    
                    if (boss.health <= 0) {
                        this.createBossExplosion(boss.x + boss.width/2, boss.y + boss.height/2);
                        this.score += boss.points;
                        this.bosses.splice(j, 1);
                    }
                    break;
                }
            }
            
            // Check mini-boss collisions
            for (let j = this.miniBosses.length - 1; j >= 0; j--) {
                const miniBoss = this.miniBosses[j];
                if (this.isColliding(laser, miniBoss)) {
                    const damage = laser.damage || 1;
                    miniBoss.health -= damage;
                    const explosionColor = laser.special ? '#ff8800' : '#ff8800';
                    this.lasers.splice(i, 1);
                    
                    if (miniBoss.health <= 0) {
                        this.createExplosion(miniBoss.x + miniBoss.width/2, miniBoss.y + miniBoss.height/2, miniBoss.color);
                        this.score += miniBoss.points;
                        this.miniBosses.splice(j, 1);
                    }
                    break;
                }
            }
        }
        
        // Enemy laser vs Player collisions
        for (let i = this.lasers.length - 1; i >= 0; i--) {
            const laser = this.lasers[i];
            if (!laser.enemy) continue;
            
            if (this.isColliding(laser, this.player) && !this.player.invincible) {
                this.player.health = Math.max(0, this.player.health - 10);
                this.triggerHitFeedback(6);
                this.createExplosion(laser.x, laser.y, '#ff0000');
                this.lasers.splice(i, 1);
            }
        }
        
        // Player vs Enemy collisions
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            if (this.isColliding(this.player, enemy)) {
                if (this.player.invincible) {
                    // Destroy enemy when invincible
                    this.createExplosion(enemy.x + enemy.width/2, enemy.y + enemy.height/2, enemy.color);
                    this.score += enemy.points;
                    this.enemies.splice(i, 1);
                } else {
                    // Take damage when not invincible
                    this.player.health = Math.max(0, this.player.health - 20);
                    this.triggerHitFeedback(10);
                    this.createExplosion(enemy.x + enemy.width/2, enemy.y + enemy.height/2, enemy.color);
                    this.enemies.splice(i, 1);
                }
            }
        }
        
        // Player vs Boss collisions
        for (let i = this.bosses.length - 1; i >= 0; i--) {
            const boss = this.bosses[i];
            if (this.isColliding(this.player, boss)) {
                if (this.player.invincible) {
                    // Damage boss when invincible (but don't destroy completely)
                    boss.health -= 5;
                    this.createExplosion(this.player.x + this.player.width/2, this.player.y + this.player.height/2, '#ffaa00');
                    if (boss.health <= 0) {
                        this.createBossExplosion(boss.x + boss.width/2, boss.y + boss.height/2);
                        this.score += boss.points;
                        this.bosses.splice(i, 1);
                    }
                } else {
                    // Take damage when not invincible
                    this.player.health = Math.max(0, this.player.health - 30);
                    this.triggerHitFeedback(15);
                    this.createExplosion(this.player.x + this.player.width/2, this.player.y + this.player.height/2, '#ff0000');
                }
            }
        }
        
        // Player vs Mini-Boss collisions
        for (let i = this.miniBosses.length - 1; i >= 0; i--) {
            const miniBoss = this.miniBosses[i];
            if (this.isColliding(this.player, miniBoss)) {
                if (this.player.invincible) {
                    // Destroy mini-boss when invincible
                    this.createExplosion(miniBoss.x + miniBoss.width/2, miniBoss.y + miniBoss.height/2, miniBoss.color);
                    this.score += miniBoss.points;
                    this.miniBosses.splice(i, 1);
                } else {
                    // Take damage when not invincible
                    this.player.health = Math.max(0, this.player.health - 20);
                    this.triggerHitFeedback(12);
                    this.createExplosion(this.player.x + this.player.width/2, this.player.y + this.player.height/2, '#ff8800');
                }
            }
        }
        
        // Player vs PowerUp collisions
        for (let i = this.powerUps.length - 1; i >= 0; i--) {
            const powerUp = this.powerUps[i];
            if (this.isColliding(this.player, powerUp)) {
                this.applyPowerUp(powerUp.type);
                this.createExplosion(powerUp.x + powerUp.width/2, powerUp.y + powerUp.height/2, powerUp.color);
                this.powerUps.splice(i, 1);
            }
        }
    }
    
    isColliding(obj1, obj2) {
        return obj1.x < obj2.x + obj2.width &&
               obj1.x + obj1.width > obj2.x &&
               obj1.y < obj2.y + obj2.height &&
               obj1.y + obj1.height > obj2.y;
    }
    
    applyPowerUp(type) {
        switch(type) {
            case 'health':
                this.player.health = Math.min(this.player.maxHealth, this.player.health + 50);
                break;
            case 'wings':
                this.player.hasWings = true;
                this.player.wingDuration = 15000; // 15 seconds
                break;
            case 'size':
                this.player.sizeBoost = true;
                this.player.sizeDuration = 10000; // 10 seconds
                this.player.sizeMultiplier = 1.8;
                this.player.width = this.player.baseWidth * this.player.sizeMultiplier;
                this.player.height = this.player.baseHeight * this.player.sizeMultiplier;
                this.player.invincible = true;
                break;
        }
    }
    
    createExplosion(x, y, color) {
        for (let i = 0; i < 12; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                color: color,
                life: 600 + Math.random() * 400,
                maxLife: 1000,
                size: Math.random() * 6 + 2,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.2
            });
        }
        
        // Add bright flash particles
        for (let i = 0; i < 4; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 3,
                vy: (Math.random() - 0.5) * 3,
                color: '#ffffff',
                life: 200,
                maxLife: 200,
                size: Math.random() * 8 + 4,
                rotation: 0,
                rotationSpeed: 0
            });
        }
    }
    
    createBossExplosion(x, y) {
        for (let i = 0; i < 20; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                color: ['#ff0000', '#ff8800', '#ffff00'][Math.floor(Math.random() * 3)],
                life: 1000,
                size: Math.random() * 8 + 4
            });
        }
    }
    
    createDeathExplosion() {
        for (let i = 0; i < 30; i++) {
            this.particles.push({
                x: this.player.x + this.player.width / 2,
                y: this.player.y + this.player.height / 2,
                vx: (Math.random() - 0.5) * 12,
                vy: (Math.random() - 0.5) * 12,
                color: ['#00ffff', '#0088ff', '#ffffff'][Math.floor(Math.random() * 3)],
                life: 1500,
                maxLife: 1500,
                size: Math.random() * 6 + 3,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.3
            });
        }
    }
    
    createEnhancedDeathExplosion() {
        const centerX = this.player.x + this.player.width / 2;
        const centerY = this.player.y + this.player.height / 2;
        
        // Main explosion burst
        for (let i = 0; i < 20; i++) {
            this.particles.push({
                x: centerX + (Math.random() - 0.5) * 20,
                y: centerY + (Math.random() - 0.5) * 20,
                vx: (Math.random() - 0.5) * 15,
                vy: (Math.random() - 0.5) * 15,
                color: ['#00ffff', '#0088ff', '#87ceeb', '#ffffff'][Math.floor(Math.random() * 4)],
                life: 2000 + Math.random() * 1000,
                maxLife: 3000,
                size: Math.random() * 8 + 4,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.4
            });
        }
        
        // Debris particles (ship fragments)
        for (let i = 0; i < 15; i++) {
            this.particles.push({
                x: centerX + (Math.random() - 0.5) * 10,
                y: centerY + (Math.random() - 0.5) * 10,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                color: ['#666666', '#888888', '#00ffff'][Math.floor(Math.random() * 3)],
                life: 3000 + Math.random() * 2000,
                maxLife: 5000,
                size: Math.random() * 6 + 2,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.2
            });
        }
        
        // Bright flash - spread out and varied
        for (let i = 0; i < 6; i++) {
            this.particles.push({
                x: centerX + (Math.random() - 0.5) * 30, // More spread
                y: centerY + (Math.random() - 0.5) * 30,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                color: ['#ffffff', '#ffeeee', '#eeffff', '#ffffee'][Math.floor(Math.random() * 4)], // Varied white tones
                life: 400 + Math.random() * 400, // Shorter, more varied life
                maxLife: 800,
                size: Math.random() * 6 + 3, // Smaller sizes
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.3,
                opacity: 0.6 + Math.random() * 0.4 // Add opacity variation
            });
        }
    }
    
    updateDifficulty() {
        this.wave = Math.floor(this.score / 500) + 1;
        this.enemySpawnRate = Math.max(300, 1000 - this.wave * 50);
    }
    
    updateScreenShake(deltaTime) {
        if (this.screenShake > 0) {
            this.screenShake *= this.screenShakeDecay;
            if (this.screenShake < 0.1) {
                this.screenShake = 0;
            }
        }
    }
    
    triggerHitFeedback(intensity = 8) {
        this.screenShake = intensity;
    }
    
    updateUI() {
        document.getElementById('scoreValue').textContent = this.score;
        // Ensure health never displays below 0
        const healthPercent = Math.max(0, (this.player.health / this.player.maxHealth) * 100);
        document.getElementById('healthFill').style.width = healthPercent + '%';
    }
    
    startDeathSequence() {
        this.gameState = 'dying';
        this.deathStartTime = Date.now();
        this.createEnhancedDeathExplosion();
        this.triggerHitFeedback(20); // Strong screen shake
    }
    
    updateDeathSequence() {
        const deathDuration = 2500; // 2.5 seconds
        const elapsed = Date.now() - this.deathStartTime;
        
        // Continue creating explosion particles throughout the sequence
        if (elapsed < deathDuration - 500) {
            if (Math.random() < 0.3) {
                this.createEnhancedDeathExplosion();
            }
        }
        
        // Transition to game over after delay
        if (elapsed >= deathDuration) {
            this.gameOver();
        }
    }
    
    gameOver() {
        this.gameState = 'gameOver';
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('gameOverScreen').classList.remove('hidden');
    }
    
    render() {
        // Apply screen shake
        this.ctx.save();
        if (this.screenShake > 0) {
            const shakeX = (Math.random() - 0.5) * this.screenShake;
            const shakeY = (Math.random() - 0.5) * this.screenShake;
            this.ctx.translate(shakeX, shakeY);
        }
        
        if (this.gameState === 'gameOver') {
            // Draw solid black background for game over screen
            this.ctx.fillStyle = '#000000';
            this.ctx.fillRect(0, 0, this.width, this.height);
        } else {
            // Clear canvas with enhanced trail effect for active game states
            this.ctx.fillStyle = 'rgba(0, 0, 8, 0.2)';
            this.ctx.fillRect(0, 0, this.width, this.height);
            
            // Draw enhanced background
            this.drawSpaceGas();
            this.drawEnhancedStars();
            
            if (this.gameState === 'playing' || this.gameState === 'dying') {
                if (this.gameState === 'playing') {
                    this.drawPlayer();
                }
                this.drawLasers();
                this.drawEnemies();
                this.drawBosses();
                this.drawMiniBosses();
                this.drawPowerUps();
            }
            
            this.drawParticles();
        }
        
        // Restore from screen shake
        this.ctx.restore();
    }
    
    drawStars() {
        this.ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 100; i++) {
            const x = (i * 37) % this.width;
            const y = (i * 73 + Date.now() * 0.02) % this.height;
            const size = (i % 3) + 1;
            this.ctx.fillRect(x, y, size, size);
        }
    }
    
    drawPlayer() {
        // Draw thruster particles first (behind ship)
        this.drawThrusterParticles();
        
        this.ctx.save();
        this.ctx.translate(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2);
        
        // Apply tilt rotation for movement
        this.ctx.rotate(this.player.tilt);
        
        // Scale for size power-up
        if (this.player.sizeBoost) {
            this.ctx.scale(this.player.sizeMultiplier, this.player.sizeMultiplier);
        }
        
        // Draw wings if wing power-up is active
        if (this.player.hasWings) {
            this.ctx.fillStyle = '#ffff00';
            // Left wing triangle
            this.ctx.beginPath();
            this.ctx.moveTo(-20, -5);
            this.ctx.lineTo(-30, 5);
            this.ctx.lineTo(-15, 8);
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.strokeStyle = '#ffaa00';
            this.ctx.lineWidth = 1;
            this.ctx.stroke();
            
            // Right wing triangle
            this.ctx.beginPath();
            this.ctx.moveTo(20, -5);
            this.ctx.lineTo(30, 5);
            this.ctx.lineTo(15, 8);
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.stroke();
        }
        
        // Draw main player ship (triangle)
        this.ctx.beginPath();
        this.ctx.moveTo(0, -15);
        this.ctx.lineTo(-12, 12);
        this.ctx.lineTo(12, 12);
        this.ctx.closePath();
        
        // Gradient fill - change colors if size boost is active
        const gradient = this.ctx.createLinearGradient(0, -15, 0, 12);
        if (this.player.sizeBoost) {
            // Orange-yellow glow when invincible
            gradient.addColorStop(0, '#ffaa00');
            gradient.addColorStop(1, '#ff6600');
        } else {
            // Normal light blue colors
            gradient.addColorStop(0, '#87CEEB');
            gradient.addColorStop(1, '#4682B4');
        }
        this.ctx.fillStyle = gradient;
        this.ctx.fill();
        
        // Add extra glow effect when size boost is active
        if (this.player.sizeBoost) {
            this.ctx.shadowColor = '#ff8800';
            this.ctx.shadowBlur = 20;
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
        }
        
        // Outline - change color when size boost is active
        if (this.player.sizeBoost) {
            this.ctx.strokeStyle = '#ffcc00';
        } else {
            this.ctx.strokeStyle = '#00ffff';
        }
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        this.ctx.restore();
    }
    
    drawLasers() {
        this.lasers.forEach(laser => {
            this.ctx.save();
            
            // Enhanced laser with gradient and glow
            const gradient = this.ctx.createLinearGradient(laser.x, laser.y, laser.x, laser.y + laser.height);
            if (laser.enemy) {
                gradient.addColorStop(0, '#ff0000');
                gradient.addColorStop(0.5, '#ff4444');
                gradient.addColorStop(1, '#ff0000');
            } else if (laser.special) {
                // Special orange power-up lasers
                gradient.addColorStop(0, '#ffffff');
                gradient.addColorStop(0.3, '#ffaa00');
                gradient.addColorStop(0.7, laser.color);
                gradient.addColorStop(1, '#ff4400');
            } else {
                gradient.addColorStop(0, '#ffffff');
                gradient.addColorStop(0.5, laser.color);
                gradient.addColorStop(1, '#ffffff');
            }
            
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(laser.x, laser.y, laser.width, laser.height);
            
            // Enhanced glow effect - extra bright for special lasers
            this.ctx.shadowColor = laser.color;
            this.ctx.shadowBlur = laser.special ? 25 : 15;
            this.ctx.globalCompositeOperation = 'screen';
            const glowExpansion = laser.special ? 3 : 1;
            this.ctx.fillRect(laser.x - glowExpansion, laser.y, laser.width + (glowExpansion * 2), laser.height);
            this.ctx.globalCompositeOperation = 'source-over';
            this.ctx.shadowBlur = 0;
            
            // Extra sparkle effect for special lasers
            if (laser.special) {
                this.ctx.shadowColor = '#ffffff';
                this.ctx.shadowBlur = 10;
                this.ctx.globalCompositeOperation = 'screen';
                this.ctx.fillRect(laser.x + laser.width/2 - 1, laser.y, 2, laser.height);
                this.ctx.globalCompositeOperation = 'source-over';
                this.ctx.shadowBlur = 0;
            }
            
            this.ctx.restore();
        });
    }
    
    drawEnemies() {
        this.enemies.forEach(enemy => {
            this.ctx.save();
            this.ctx.translate(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
            
            // Enhanced enemy ship design (inverted triangle, more angular like bosses)
            this.ctx.beginPath();
            this.ctx.moveTo(0, 12);
            this.ctx.lineTo(-12, -12);
            this.ctx.lineTo(12, -12);
            this.ctx.closePath();
            
            // Gradient fill similar to hero and bosses
            const gradient = this.ctx.createLinearGradient(0, -12, 0, 12);
            gradient.addColorStop(0, enemy.color);
            gradient.addColorStop(0.7, enemy.color);
            gradient.addColorStop(1, '#222222');
            this.ctx.fillStyle = gradient;
            this.ctx.fill();
            
            // Glow effect matching boss style
            this.ctx.shadowColor = enemy.color;
            this.ctx.shadowBlur = 6;
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
            
            // Outline consistent with hero ship (slightly darker than enemy color)
            this.ctx.strokeStyle = this.darkenColor(enemy.color);
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            
            this.ctx.restore();
        });
    }
    
    darkenColor(color) {
        // Simple color darkening function
        const colorMap = {
            '#ff0000': '#cc0000',
            '#ff8800': '#cc6600',
            '#ffff00': '#cccc00',
            '#00ff00': '#00cc00',
            '#0088ff': '#0066cc',
            '#8800ff': '#6600cc'
        };
        return colorMap[color] || '#666666';
    }
    
    drawBosses() {
        this.bosses.forEach(boss => {
            // Boss body (large square)
            this.ctx.fillStyle = boss.color;
            this.ctx.fillRect(boss.x, boss.y, boss.width, boss.height);
            
            // Add glow effect
            this.ctx.shadowColor = boss.color;
            this.ctx.shadowBlur = 15;
            this.ctx.fillRect(boss.x, boss.y, boss.width, boss.height);
            this.ctx.shadowBlur = 0;
            
            // Inner square details
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 3;
            this.ctx.strokeRect(boss.x + 10, boss.y + 10, boss.width - 20, boss.height - 20);
            
            
            // Health bar
            const healthPercent = boss.health / boss.maxHealth;
            this.ctx.fillStyle = '#ff0000';
            this.ctx.fillRect(boss.x, boss.y - 15, boss.width, 8);
            this.ctx.fillStyle = '#00ff00';
            this.ctx.fillRect(boss.x, boss.y - 15, boss.width * healthPercent, 8);
            
            // Health bar outline
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(boss.x, boss.y - 15, boss.width, 8);
        });
    }
    
    drawMiniBosses() {
        this.miniBosses.forEach(miniBoss => {
            // Mini-boss body (smaller square)
            this.ctx.fillStyle = miniBoss.color;
            this.ctx.fillRect(miniBoss.x, miniBoss.y, miniBoss.width, miniBoss.height);
            
            // Add glow effect
            this.ctx.shadowColor = miniBoss.color;
            this.ctx.shadowBlur = 8;
            this.ctx.fillRect(miniBoss.x, miniBoss.y, miniBoss.width, miniBoss.height);
            this.ctx.shadowBlur = 0;
            
            // Inner square details
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(miniBoss.x + 5, miniBoss.y + 5, miniBoss.width - 10, miniBoss.height - 10);
            
            // Health bar (smaller)
            const healthPercent = miniBoss.health / miniBoss.maxHealth;
            this.ctx.fillStyle = '#ff0000';
            this.ctx.fillRect(miniBoss.x, miniBoss.y - 8, miniBoss.width, 4);
            this.ctx.fillStyle = '#00ff00';
            this.ctx.fillRect(miniBoss.x, miniBoss.y - 8, miniBoss.width * healthPercent, 4);
            
            // Health bar outline
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(miniBoss.x, miniBoss.y - 8, miniBoss.width, 4);
        });
    }
    
    drawPowerUps() {
        this.powerUps.forEach(powerUp => {
            this.ctx.save();
            this.ctx.translate(powerUp.x + powerUp.width / 2, powerUp.y + powerUp.height / 2);
            
            const radius = powerUp.width / 2;
            
            // Draw circular power-up
            this.ctx.beginPath();
            this.ctx.arc(0, 0, radius, 0, Math.PI * 2);
            this.ctx.fillStyle = powerUp.color;
            this.ctx.fill();
            
            // Add glow effect
            this.ctx.shadowColor = powerUp.color;
            this.ctx.shadowBlur = 10;
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
            
            // White outline
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            
            // Draw power-up icon
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            
            let icon = '';
            switch(powerUp.type) {
                case 'health': icon = '+'; break;
                case 'wings': icon = 'W'; break;
                case 'size': icon = 'S'; break;
            }
            this.ctx.fillText(icon, 0, 0);
            
            this.ctx.restore();
        });
    }
    
    drawParticles() {
        this.particles.forEach(particle => {
            this.ctx.save();
            
            // Calculate alpha based on remaining life
            let alpha = particle.maxLife ? particle.life / particle.maxLife : 1;
            
            // Apply particle-specific opacity if it exists
            if (particle.opacity !== undefined) {
                alpha *= particle.opacity;
            }
            
            this.ctx.globalAlpha = alpha;
            
            this.ctx.translate(particle.x, particle.y);
            if (particle.rotation !== undefined) {
                this.ctx.rotate(particle.rotation);
            }
            
            this.ctx.fillStyle = particle.color;
            this.ctx.shadowColor = particle.color;
            this.ctx.shadowBlur = particle.size;
            this.ctx.fillRect(-particle.size/2, -particle.size/2, particle.size, particle.size);
            
            this.ctx.restore();
        });
    }
    
    drawSpaceGas() {
        this.spaceGas.forEach(gas => {
            this.ctx.save();
            this.ctx.globalAlpha = gas.opacity;
            
            // Create gradient for organic-looking gas clouds
            const gradient = this.ctx.createRadialGradient(
                gas.x, gas.y, 0,
                gas.x, gas.y, gas.size
            );
            gradient.addColorStop(0, gas.color);
            gradient.addColorStop(0.5, gas.color + '80'); // Add transparency
            gradient.addColorStop(1, 'transparent');
            
            this.ctx.fillStyle = gradient;
            this.ctx.shadowColor = gas.color;
            this.ctx.shadowBlur = gas.size * 0.5;
            
            // Draw irregular gas cloud shape
            this.ctx.beginPath();
            for (let i = 0; i <= 12; i++) {
                const angle = (i / 12) * Math.PI * 2;
                const variation = 0.7 + 0.3 * Math.sin(angle * 3 + gas.phase);
                const radius = gas.size * variation;
                const x = gas.x + Math.cos(angle) * radius;
                const y = gas.y + Math.sin(angle) * radius;
                
                if (i === 0) {
                    this.ctx.moveTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }
            }
            this.ctx.closePath();
            this.ctx.fill();
            
            this.ctx.restore();
        });
    }
    
    drawEnhancedStars() {
        this.ctx.fillStyle = '#ffffff';
        this.stars.forEach(star => {
            const brightness = star.brightness * (0.5 + 0.5 * Math.sin(star.twinkle));
            this.ctx.globalAlpha = brightness;
            
            // Draw star with glow effect
            this.ctx.shadowColor = '#ffffff';
            this.ctx.shadowBlur = star.size * 2;
            this.ctx.fillRect(star.x, star.y, star.size, star.size);
            this.ctx.shadowBlur = 0;
        });
        this.ctx.globalAlpha = 1;
    }
    
    
    drawThrusterParticles() {
        this.player.thrusterParticles.forEach(particle => {
            const alpha = particle.life / particle.maxLife;
            this.ctx.save();
            this.ctx.globalAlpha = alpha;
            this.ctx.fillStyle = particle.color;
            this.ctx.shadowColor = particle.color;
            this.ctx.shadowBlur = particle.size * 2;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        });
    }
}

// Start the game when the page loads
window.addEventListener('load', () => {
    new Game();
});