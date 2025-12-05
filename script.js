
const config = {
    type: Phaser.AUTO,
    width: 1000,
    height: 600,
    physics: { default: 'arcade', arcade: { gravity: { y: 0 }, debug: false } },
    scene: { preload, create, update }
};

const game = new Phaser.Game(config);

let player;
let keys;
let coins;
let score = 0;

// --- Upgrades & Stats ---
let playerSpeed = 80; // Balanced: Start slower
let maxCoins = 2;
let coinSpawnInterval = 2000;

let upgradeCostSpeed = 50;
let upgradeCostCoins = 100;
let magnetCost = 150;

let speedLevel = 1;
let coinLevel = 1;
let magnetLevel = 0;

let pointsPerCoin = 5;
let magnetActive = false;
let magnetDuration = 5000;

let shopTexts = {};
let shopButtons = {};

// --- COMBATE ---
let enemies;
let currentWeapon = 'pistol';
let inventory = ['pistol', 'sword'];
let bullets;
let lastShot = 0;
let fireRate = 500; // Balanced: Slower fire rate
let swordAttackCooldown = 500;
let lastSwordAttack = 0;
let pointer;

let playerHealth = 50; // Balanced: Start weaker
let playerMaxHealth = 50;
let playerDamage = 5; // Balanced: Weaker damage

let enemySpawnTimer;
let maxEnemies = 4;

// --- INIMIGOS ---
let shooterEnemies;
let enemyBullets;
let shooterEnemyFireRate = 2000;
let shooterEnemyDamage = 10;
let shooterEnemyBulletSpeed = 150;
let shooterEnemyBulletSpread = 30;
let shooterEnemyBulletCount = 5;

let bouncerEnemies;
let bouncerBullets;
let bouncerEnemyFireRate = 3000;
let bouncerEnemyDamage = 20;
let bouncerEnemyBulletSpeed = 300;
let bouncerEnemyBulletSize = 15;
let bouncerEnemyBulletLifetime = 5000;

// Novos Inimigos
let exploderEnemies;
let sniperEnemies;

// --- ONDAS ---
let currentWave = 0;
let baseEnemyHealth = 30;
let baseEnemySpeed = 80;
let baseEnemyDamage = 10;
const WAVE_INTERVAL = 30000;

// --- HUD ---
let hudScoreText;
let hudHealthText;
let hudWaveText;
let hudBg;
let hudWeaponHUD = {};
let hudWeaponContainer;

// --- POWER UPS ---
let powerUps = [];
let isGamePaused = false;
let playerBulletCount = 1; // Multishot

// --- LOCAL STORAGE ---
function saveGame() {
    const saveData = {
        score, speedLevel, coinLevel, magnetLevel,
        playerSpeed, maxCoins,
        upgradeCostSpeed, upgradeCostCoins, magnetCost,
        playerHealth, playerMaxHealth, playerDamage,
        currentWave,
        currentWeapon,
        inventory,
        fireRate,
        playerBulletCount,
        powerUps
    };
    localStorage.setItem('idleGameSave', JSON.stringify(saveData));
}

function resetGame() {
    score = 0;
    speedLevel = 1;
    coinLevel = 1;
    magnetLevel = 0;
    playerSpeed = 80;
    maxCoins = 2;
    upgradeCostSpeed = 50;
    upgradeCostCoins = 100;
    magnetCost = 150;
    playerHealth = 50;
    playerMaxHealth = 50;
    playerDamage = 5;
    currentWave = 0;
    currentWeapon = 'pistol';
    inventory = ['pistol', 'sword'];
    fireRate = 500;
    playerBulletCount = 1;
    powerUps = [];

    baseEnemyHealth = 30;
    baseEnemySpeed = 80;
    baseEnemyDamage = 10;
    maxEnemies = 4;

    saveGame();
}

function loadGame() {
    const saved = localStorage.getItem('idleGameSave');
    if (saved) {
        const data = JSON.parse(saved);
        score = data.score ?? 0;
        speedLevel = data.speedLevel ?? 1;
        coinLevel = data.coinLevel ?? 1;
        magnetLevel = data.magnetLevel ?? 0;
        playerSpeed = data.playerSpeed ?? 80;
        maxCoins = data.maxCoins ?? 2;
        upgradeCostSpeed = data.upgradeCostSpeed ?? 50;
        upgradeCostCoins = data.upgradeCostCoins ?? 100;
        magnetCost = data.magnetCost ?? 150;
        playerHealth = data.playerHealth ?? 50;
        playerMaxHealth = data.maxHealth ?? 50;
        playerDamage = data.playerDamage ?? 5;
        currentWave = data.currentWave ?? 0;
        currentWeapon = data.currentWeapon ?? 'pistol';
        inventory = data.inventory ?? ['pistol', 'sword'];
        fireRate = data.fireRate ?? 500;
        playerBulletCount = data.playerBulletCount ?? 1;
        powerUps = data.powerUps ?? [];
    }
}

function preload() {
    this.load.image('player', 'player.png');
    this.load.image('coin', 'coin.png');
    this.load.image('red_square', 'enemy.png');
    this.load.image('shooter_enemy', 'shooter_enemy.png');
    this.load.image('enemy_bullet', 'enemy_bullet.png');
    this.load.image('bouncer_enemy', 'bouncer_enemy.png');
    this.load.image('bouncer_bullet', 'bouncer_bullet.png');
    // Placeholder colors for new enemies if images don't exist, Phaser handles missing images by showing a green box usually, 
    // but we can use tinting on existing sprites to differentiate.
}

function create() {
    loadGame();

    keys = this.input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        down: Phaser.Input.Keyboard.KeyCodes.S,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        right: Phaser.Input.Keyboard.KeyCodes.D
    });

    player = this.physics.add.sprite(400, 300, 'player')
        .setCollideWorldBounds(true)
        .setScale(0.1);
    player.health = playerHealth;
    player.maxHealth = playerMaxHealth;
    player.damage = playerDamage;

    coins = this.physics.add.group();
    spawnCoins(this);

    // HUD
    hudScoreText = this.add.text(16, 16, 'Pontos: 0', { fontSize: '24px', fill: '#ffffff', fontFamily: 'Arial' });
    hudHealthText = this.add.text(16, 48, 'Vida: 100/100', { fontSize: '24px', fill: '#00ff00', fontFamily: 'Arial' });
    hudWaveText = this.add.text(16, 80, 'Onda: 0', { fontSize: '24px', fill: '#00bfff', fontFamily: 'Arial' });
    hudBg = this.add.graphics();
    hudBg.fillStyle(0x000000, 0.3);
    hudBg.fillRoundedRect(8, 8, 200, 100, 10);
    hudBg.setDepth(-1);
    createWeaponHUD(this);

    this.physics.add.overlap(player, coins, collectCoin, null, this);

    this.time.addEvent({
        delay: coinSpawnInterval,
        callback: () => spawnCoins(this),
        loop: true
    });

    createShop(this);

    enemies = this.physics.add.group();
    shooterEnemies = this.physics.add.group();
    enemyBullets = this.physics.add.group();
    bouncerEnemies = this.physics.add.group();
    bouncerBullets = this.physics.add.group();
    exploderEnemies = this.physics.add.group();
    sniperEnemies = this.physics.add.group();

    increaseDifficulty.call(this);

    enemySpawnTimer = this.time.addEvent({
        delay: 3000,
        callback: () => {
            if (isGamePaused) return;
            const totalEnemies = enemies.getChildren().length + shooterEnemies.getChildren().length + bouncerEnemies.getChildren().length + exploderEnemies.getChildren().length + sniperEnemies.getChildren().length;
            if (totalEnemies < maxEnemies) spawnEnemy(this);
        },
        loop: true
    });

    this.time.addEvent({
        delay: WAVE_INTERVAL,
        callback: () => {
            if (!isGamePaused) increaseDifficulty.call(this);
        },
        loop: true
    });

    // Collisions
    this.physics.add.overlap(player, enemies, hitEnemy, null, this);
    this.physics.add.overlap(player, shooterEnemies, hitEnemy, null, this);
    this.physics.add.overlap(player, bouncerEnemies, hitEnemy, null, this);
    this.physics.add.overlap(player, exploderEnemies, hitExploder, null, this);
    this.physics.add.overlap(player, sniperEnemies, hitEnemy, null, this);

    bullets = this.physics.add.group();

    this.input.keyboard.on('keydown-ONE', () => { currentWeapon = 'pistol'; updateHUD(); });
    this.input.keyboard.on('keydown-TWO', () => { currentWeapon = 'sword'; updateHUD(); });

    this.physics.add.overlap(bullets, enemies, bulletHitEnemy, null, this);
    this.physics.add.overlap(bullets, shooterEnemies, bulletHitEnemy, null, this);
    this.physics.add.overlap(bullets, bouncerEnemies, bulletHitEnemy, null, this);
    this.physics.add.overlap(bullets, exploderEnemies, bulletHitEnemy, null, this);
    this.physics.add.overlap(bullets, sniperEnemies, bulletHitEnemy, null, this);

    this.physics.add.overlap(player, enemyBullets, enemyBulletHitPlayer, null, this);
    this.physics.add.overlap(player, bouncerBullets, bouncerBulletHitPlayer, null, this);

    pointer = this.input.activePointer;
    updateHUD();
}

function createWeaponHUD(scene) {
    hudWeaponContainer = scene.add.container();
    const startX = scene.game.config.width - 150;
    const startY = scene.game.config.height - 80;
    const spacingY = 40;
    if (!inventory) return;
    inventory.forEach((weapon, index) => {
        const bg = scene.add.rectangle(startX + 50, startY - index * spacingY, 120, 30, 0x222222, 0.8);
        bg.setStrokeStyle(2, 0xffffff, 0.3);
        bg.setOrigin(0.5);
        const text = scene.add.text(startX + 50, startY - index * spacingY, weapon.toUpperCase(), {
            font: '18px Arial',
            fill: weapon === currentWeapon ? '#FFD700' : '#FFFFFF'
        }).setOrigin(0.5);
        hudWeaponContainer.add(bg);
        hudWeaponContainer.add(text);
        hudWeaponHUD[weapon] = text;
    });
}

function updateHUD() {
    hudScoreText.setText(`Pontos: ${score}`);
    hudHealthText.setText(`Vida: ${Math.floor(player.health)}/${playerMaxHealth}`);
    hudWaveText.setText(`Onda: ${currentWave}`);
    inventory.forEach(weapon => {
        const text = hudWeaponHUD[weapon];
        if (text) text.setColor(weapon === currentWeapon ? '#FFD700' : '#FFFFFF');
    });
}

function collectCoin(player, coin) {
    coin.disableBody(true, true);
    score += pointsPerCoin;
    updateHUD();
    updateShop();
    saveGame();
}

function spawnCoins(scene) {
    let currentCoins = coins.getChildren().filter(c => c.active).length;
    while (currentCoins < maxCoins) {
        let x = Phaser.Math.Between(50, 750);
        let y = Phaser.Math.Between(50, 550);
        let coin = coins.create(x, y, 'coin').setScale(0.1);
        currentCoins++;
    }
}

function createShop(scene) {
    const shopX = scene.game.config.width - 120;
    let shopY = 16;
    const buttonHeight = 40;
    const spacing = 10;
    const buttonWidth = 180;
    const NORMAL_COLOR = 0x222222;
    const HOVER_COLOR = 0x444444;
    const ACTIVE_COLOR = 0x008800;

    const createShopButton = (key, textContent, callback, cost) => {
        const buttonBg = scene.add.rectangle(shopX, shopY, buttonWidth, buttonHeight, NORMAL_COLOR)
            .setOrigin(0.5, 0).setInteractive().setStrokeStyle(2, 0xffffff, 0.3).setDepth(10);
        const buttonText = scene.add.text(shopX, shopY + buttonHeight / 2, textContent, {
            fontSize: '16px', fill: '#ffffff', fontFamily: 'Arial', align: 'center'
        }).setOrigin(0.5).setDepth(11);

        buttonBg.on('pointerover', () => { if (buttonBg.input.enabled) buttonBg.setFillStyle(HOVER_COLOR); });
        buttonBg.on('pointerout', () => { if (buttonBg.input.enabled) buttonBg.setFillStyle(NORMAL_COLOR); });
        buttonBg.on('pointerdown', () => {
            if (buttonBg.input.enabled) {
                buttonBg.setFillStyle(ACTIVE_COLOR);
                callback(scene);
                scene.time.delayedCall(100, () => {
                    if (buttonBg.input.enabled) buttonBg.setFillStyle(buttonBg.input.isOver ? HOVER_COLOR : NORMAL_COLOR);
                });
            }
        });
        shopTexts[key] = buttonText;
        shopButtons[key] = { bg: buttonBg, text: buttonText, cost: cost };
        shopY += buttonHeight + spacing;
        return scene.add.container(0, 0, [buttonBg, buttonText]);
    };

    createShopButton('speed', `Velocidade: ${speedLevel} (${upgradeCostSpeed})`, buySpeed, upgradeCostSpeed);
    createShopButton('coins', `Moedas Max: ${coinLevel} (${upgradeCostCoins})`, buyCoins, upgradeCostCoins);
    createShopButton('magnet', `Ímã: ${magnetLevel > 0 ? 'Ativo' : 'Comprar'} (${magnetCost})`, buyMagnet, magnetCost);
    createShopButton('maxHealth', `Vida Max: ${playerMaxHealth} (200)`, buyMaxHealth, 200);
    createShopButton('playerDamage', `Dano: ${playerDamage} (100)`, buyPlayerDamage, 100);
    updateShop();
}

function buySpeed(scene) {
    if (score >= upgradeCostSpeed) {
        score -= upgradeCostSpeed;
        playerSpeed += 20;
        speedLevel++;
        upgradeCostSpeed = Math.round(upgradeCostSpeed * 1.5);
        updateHUD(); updateShop(); saveGame();
    }
}
function buyCoins(scene) {
    if (score >= upgradeCostCoins) {
        score -= upgradeCostCoins;
        maxCoins += 1;
        coinLevel++;
        upgradeCostCoins = Math.round(upgradeCostCoins * 1.5);
        updateHUD(); updateShop(); saveGame();
    }
}
function buyMagnet(scene) {
    if (magnetLevel === 0 && score >= magnetCost) {
        score -= magnetCost;
        magnetLevel = 1;
        updateHUD(); updateShop(); saveGame();
    }
}
function buyMaxHealth(scene) {
    if (score >= 200) {
        score -= 200;
        playerMaxHealth += 20;
        player.maxHealth = playerMaxHealth;
        player.health += 20;
        if (player.health > player.maxHealth) player.health = player.maxHealth;
        updateHUD(); updateShop(); saveGame();
    }
}
function buyPlayerDamage(scene) {
    if (score >= 100) {
        score -= 100;
        playerDamage += 5;
        player.damage = playerDamage;
        updateHUD(); updateShop(); saveGame();
    }
}

function updateShop() {
    const NORMAL_COLOR = 0x222222;
    const DISABLED_COLOR_BG = 0x111111;
    const DISABLED_COLOR_TEXT = '#888888';
    const ENABLED_COLOR_TEXT = '#ffffff';

    const updateButton = (key, text, cost, condition = true) => {
        if (shopButtons[key]) {
            shopTexts[key].setText(text);
            const canAfford = score >= cost && condition;
            shopButtons[key].bg.setFillStyle(canAfford ? NORMAL_COLOR : DISABLED_COLOR_BG);
            shopButtons[key].text.setColor(canAfford ? ENABLED_COLOR_TEXT : DISABLED_COLOR_TEXT);
            shopButtons[key].bg.input.enabled = canAfford;
        }
    };

    updateButton('speed', `Velocidade: ${speedLevel} (${upgradeCostSpeed})`, upgradeCostSpeed);
    updateButton('coins', `Moedas Max: ${coinLevel} (${upgradeCostCoins})`, upgradeCostCoins);
    updateButton('magnet', `Ímã: ${magnetLevel > 0 ? 'Ativo' : 'Comprar'} (${magnetCost})`, magnetCost, magnetLevel === 0);
    updateButton('maxHealth', `Vida Max: ${playerMaxHealth} (200)`, 200);
    updateButton('playerDamage', `Dano: ${playerDamage} (100)`, 100);
}

function increaseDifficulty() {
    currentWave++;
    baseEnemyHealth += 10;
    baseEnemySpeed += 5;
    baseEnemyDamage += 2;
    if (currentWave % 2 === 0) maxEnemies += 1;
    this.cameras.main.shake(100, 0.005);

    if (currentWave % 5 === 0) {
        showPowerUpSelection(this);
    }

    updateHUD();
    saveGame();
}

function showPowerUpSelection(scene) {
    isGamePaused = true;
    scene.physics.pause();

    // Create a container for the UI
    const container = scene.add.container(scene.game.config.width / 2, scene.game.config.height / 2);
    const bg = scene.add.rectangle(0, 0, 600, 400, 0x000000, 0.9).setStrokeStyle(4, 0x00ff00);
    const title = scene.add.text(0, -150, 'ESCOLHA UM PODER', { fontSize: '32px', fill: '#00ff00', fontStyle: 'bold' }).setOrigin(0.5);

    container.add([bg, title]);

    const options = [
        { name: 'Tiro Duplo', desc: 'Atira +1 bala por vez', type: 'multishot' },
        { name: 'Metralhadora', desc: 'Atira mais rápido', type: 'rapidfire' },
        { name: 'Dano Extra', desc: 'Aumenta o dano', type: 'damage' },
        { name: 'Velocidade', desc: 'Corre mais rápido', type: 'speed' },
        { name: 'Cura Total', desc: 'Recupera toda vida', type: 'heal' },
        { name: 'Vida Máxima', desc: 'Aumenta vida máxima', type: 'maxhealth' },
        // Add more ideas
        { name: 'Vampirismo', desc: 'Cura ao matar', type: 'vampirism' },
        { name: 'Congelamento', desc: 'Chance de congelar', type: 'freeze' },
        { name: 'Explosivo', desc: 'Inimigos explodem', type: 'explosive' },
        { name: 'Sniper', desc: 'Tiro mais rápido e forte', type: 'sniper_upgrade' }
    ];

    // Pick 3 random options
    const choices = [];
    while (choices.length < 3) {
        const opt = options[Phaser.Math.Between(0, options.length - 1)];
        if (!choices.includes(opt)) choices.push(opt);
    }

    choices.forEach((opt, index) => {
        const y = -50 + index * 80;
        const btn = scene.add.rectangle(0, y, 400, 60, 0x333333).setInteractive();
        const btnText = scene.add.text(0, y, `${opt.name}\n${opt.desc}`, { fontSize: '18px', fill: '#ffffff', align: 'center' }).setOrigin(0.5);

        btn.on('pointerover', () => btn.setFillStyle(0x555555));
        btn.on('pointerout', () => btn.setFillStyle(0x333333));
        btn.on('pointerdown', () => {
            applyPowerUp(opt.type);
            container.destroy();
            isGamePaused = false;
            scene.physics.resume();
        });

        container.add([btn, btnText]);
    });
}

function applyPowerUp(type) {
    powerUps.push(type);
    switch (type) {
        case 'multishot': playerBulletCount++; break;
        case 'rapidfire': fireRate = Math.max(100, fireRate - 50); break;
        case 'damage': playerDamage += 5; player.damage = playerDamage; break;
        case 'speed': playerSpeed += 20; break;
        case 'heal': player.health = playerMaxHealth; break;
        case 'maxhealth': playerMaxHealth += 50; player.maxHealth = playerMaxHealth; player.health += 50; break;
        case 'sniper_upgrade': playerDamage += 10; fireRate += 100; break; // Stronger but slower
        // Others are passive effects handled in update/collision
    }
    updateHUD();
    saveGame();
}

function getOffScreenSpawnPosition(scene) {
    const gameWidth = scene.game.config.width;
    const gameHeight = scene.game.config.height;
    const padding = 50;
    let x, y;
    const side = Phaser.Math.Between(0, 3);
    switch (side) {
        case 0: x = Phaser.Math.Between(-padding, gameWidth + padding); y = -padding; break;
        case 1: x = gameWidth + padding; y = Phaser.Math.Between(-padding, gameHeight + padding); break;
        case 2: x = Phaser.Math.Between(-padding, gameWidth + padding); y = gameHeight + padding; break;
        case 3: x = -padding; y = Phaser.Math.Between(-padding, gameHeight + padding); break;
    }
    return { x, y };
}

function spawnEnemy(scene) {
    const spawnPos = getOffScreenSpawnPosition(scene);
    let enemy;

    // Chances based on wave
    let r = Phaser.Math.Between(0, 100);

    // Wave 5+: Exploders (10%)
    // Wave 3+: Snipers (15%)
    // Wave 2+: Bouncers (20%)
    // Wave 1+: Shooters (30%)
    // Rest: Normal

    if (currentWave >= 5 && r < 10) {
        // Exploder
        enemy = scene.physics.add.sprite(spawnPos.x, spawnPos.y, 'red_square'); // Placeholder
        enemy.setTint(0xffaa00); // Orange
        enemy.health = baseEnemyHealth * 0.5; // Low HP
        enemy.damage = baseEnemyDamage * 3; // High Damage
        enemy.speed = baseEnemySpeed * 2.5; // Very Fast
        enemy.type = 'exploder';
        exploderEnemies.add(enemy);
    } else if (currentWave >= 3 && r < 25) {
        // Sniper
        enemy = scene.physics.add.sprite(spawnPos.x, spawnPos.y, 'shooter_enemy');
        enemy.setTint(0x0000ff); // Blue tint
        enemy.health = baseEnemyHealth * 0.8;
        enemy.damage = baseEnemyDamage * 2;
        enemy.speed = baseEnemySpeed * 0.6; // Slow move
        enemy.type = 'sniper';
        enemy.lastShotTime = 0;
        enemy.fireRate = 4000; // Slow fire
        sniperEnemies.add(enemy);
    } else if (currentWave >= 2 && r < 45) {
        // Bouncer
        enemy = scene.physics.add.sprite(spawnPos.x, spawnPos.y, 'bouncer_enemy');
        enemy.health = baseEnemyHealth * 2;
        enemy.damage = baseEnemyDamage * 1.5;
        enemy.speed = baseEnemySpeed * 0.5;
        enemy.type = 'bouncer';
        enemy.lastShotTime = 0;
        enemy.fireRate = bouncerEnemyFireRate;
        bouncerEnemies.add(enemy);
    } else if (currentWave >= 1 && r < 75) {
        // Shooter
        enemy = scene.physics.add.sprite(spawnPos.x, spawnPos.y, 'shooter_enemy');
        enemy.health = baseEnemyHealth * 1.5;
        enemy.damage = baseEnemyDamage;
        enemy.speed = baseEnemySpeed * 0.7;
        enemy.type = 'shooter';
        enemy.lastShotTime = 0;
        enemy.fireRate = shooterEnemyFireRate;
        shooterEnemies.add(enemy);
    } else {
        // Normal
        enemy = scene.physics.add.sprite(spawnPos.x, spawnPos.y, 'red_square');
        enemy.health = baseEnemyHealth;
        enemy.damage = baseEnemyDamage;
        enemy.speed = baseEnemySpeed;
        enemy.type = 'normal';
        enemies.add(enemy);
    }

    const hitboxWidth = 40;
    const hitboxHeight = 40;
    enemy.body.setSize(hitboxWidth, hitboxHeight);
    const offsetX = (enemy.width - hitboxWidth) / 2;
    const offsetY = (enemy.height - hitboxHeight) / 2;
    enemy.body.setOffset(offsetX, offsetY);
}

function hitEnemy(player, enemy) {
    if (!player.lastHitTime) player.lastHitTime = 0;
    const hitCooldown = 500;
    if (this.time.now > player.lastHitTime + hitCooldown) {
        player.health -= enemy.damage;
        player.lastHitTime = this.time.now;
        player.setTint(0xff0000);
        this.time.delayedCall(200, () => player.clearTint());
        updateHUD();
        if (player.health <= 0) {
            resetGame();
            this.scene.restart();
        }
    }
}

function hitExploder(player, enemy) {
    // Exploder explodes instantly on contact
    enemy.destroy();
    // Create explosion effect (simple circle for now)
    let explosion = this.add.circle(enemy.x, enemy.y, 100, 0xff0000, 0.5);
    this.time.delayedCall(200, () => explosion.destroy());

    player.health -= enemy.damage; // High damage
    player.setTint(0xff0000);
    this.time.delayedCall(200, () => player.clearTint());
    updateHUD();
    if (player.health <= 0) {
        resetGame();
        this.scene.restart();
    }
}

function shootBullet(scene, angle) {
    // Multishot logic
    const spread = 10; // degrees
    const startAngle = angle - Phaser.Math.DegToRad((playerBulletCount - 1) * spread / 2);

    for (let i = 0; i < playerBulletCount; i++) {
        let currentAngle = startAngle + Phaser.Math.DegToRad(i * spread);

        let bullet = scene.add.rectangle(player.x, player.y, 8, 4, 0xffffff);
        scene.physics.add.existing(bullet);
        bullets.add(bullet);
        bullet.body.setAllowGravity(false);
        bullet.damage = player.damage;
        scene.physics.velocityFromRotation(currentAngle, 400, bullet.body.velocity);
        scene.time.delayedCall(2000, () => bullet.destroy());
    }
}

function swordAttack(scene, angle) {
    let distance = 40;
    let offsetX = Math.cos(angle) * distance;
    let offsetY = Math.sin(angle) * distance;
    let hitbox = scene.add.rectangle(player.x + offsetX, player.y + offsetY, 50, 30, 0x00ff00, 0.3);
    scene.physics.add.existing(hitbox);
    hitbox.body.setAllowGravity(false);
    hitbox.damage = player.damage * 2; // Sword deals more damage
    let enemiesHit = new Set();

    const checkHit = (box, enemy) => {
        if (!enemiesHit.has(enemy)) {
            takeDamage.call(scene, enemy, box.damage);
            enemiesHit.add(enemy);
        }
    };

    scene.physics.overlap(hitbox, enemies, checkHit);
    scene.physics.overlap(hitbox, shooterEnemies, checkHit);
    scene.physics.overlap(hitbox, bouncerEnemies, checkHit);
    scene.physics.overlap(hitbox, exploderEnemies, checkHit);
    scene.physics.overlap(hitbox, sniperEnemies, checkHit);

    scene.time.delayedCall(200, () => hitbox.destroy());
}

function bulletHitEnemy(bullet, enemy) {
    if (!powerUps.includes('piercing')) bullet.destroy(); // Destroy unless piercing
    takeDamage.call(this, enemy, bullet.damage);
}

function takeDamage(target, amount) {
    if (!target || !target.active) return;
    target.health -= amount;
    target.setTint(0xff8888);
    this.time.delayedCall(150, () => {
        if (target.active) target.clearTint();
        if (target.type === 'exploder') target.setTint(0xffaa00);
        if (target.type === 'sniper') target.setTint(0x0000ff);
    });

    if (target.health <= 0) {
        // Vampirism
        if (powerUps.includes('vampirism')) {
            player.health = Math.min(player.health + 1, playerMaxHealth);
            updateHUD();
        }
        // Explosive kill
        if (powerUps.includes('explosive')) {
            let explosion = this.add.circle(target.x, target.y, 50, 0xffaa00, 0.5);
            this.time.delayedCall(100, () => explosion.destroy());
            // Logic to damage nearby enemies could go here
        }

        target.destroy();
        score += 10 + currentWave * 2;
        updateHUD();
        saveGame();
    }
}

function enemyShootBullet(scene, enemy) {
    const angleToPlayer = Phaser.Math.Angle.Between(enemy.x, enemy.y, player.x, player.y);
    enemy.setRotation(angleToPlayer);

    for (let i = 0; i < shooterEnemyBulletCount; i++) {
        const spreadAngle = Phaser.Math.Between(-shooterEnemyBulletSpread / 2, shooterEnemyBulletSpread / 2);
        const finalAngle = Phaser.Math.DegToRad(Phaser.Math.RadToDeg(angleToPlayer) + spreadAngle);

        let bullet = scene.add.sprite(enemy.x, enemy.y, 'enemy_bullet').setScale(0.1);
        scene.physics.add.existing(bullet);
        enemyBullets.add(bullet);
        bullet.body.setAllowGravity(false);
        bullet.damage = shooterEnemyDamage;
        scene.physics.velocityFromRotation(finalAngle, shooterEnemyBulletSpeed, bullet.body.velocity);
        bullet.body.setSize(10, 10);
        scene.time.delayedCall(3000, () => bullet.destroy());
    }
}

function sniperShoot(scene, enemy) {
    const angleToPlayer = Phaser.Math.Angle.Between(enemy.x, enemy.y, player.x, player.y);
    enemy.setRotation(angleToPlayer);

    // Fast, single shot
    let bullet = scene.add.rectangle(enemy.x, enemy.y, 10, 4, 0x00ffff);
    scene.physics.add.existing(bullet);
    enemyBullets.add(bullet);
    bullet.body.setAllowGravity(false);
    bullet.damage = shooterEnemyDamage * 2;
    scene.physics.velocityFromRotation(angleToPlayer, 600, bullet.body.velocity); // Very fast
    scene.time.delayedCall(2000, () => bullet.destroy());
}

function enemyBulletHitPlayer(player, bullet) {
    bullet.destroy();
    if (!player.lastHitTime) player.lastHitTime = 0;
    const hitCooldown = 500;
    if (this.time.now > player.lastHitTime + hitCooldown) {
        player.health -= bullet.damage;
        player.lastHitTime = this.time.now;
        player.setTint(0xff0000);
        this.time.delayedCall(200, () => player.clearTint());
        updateHUD();
        if (player.health <= 0) {
            resetGame();
            this.scene.restart();
        }
    }
}

function bouncerEnemyShootBullet(scene, enemy) {
    const angleToPlayer = Phaser.Math.Angle.Between(enemy.x, enemy.y, player.x, player.y);
    enemy.setRotation(angleToPlayer);

    let bullet = scene.add.sprite(enemy.x, enemy.y, 'bouncer_bullet').setScale(bouncerEnemyBulletSize / 32);
    scene.physics.add.existing(bullet);
    bouncerBullets.add(bullet);
    bullet.body.setAllowGravity(false);
    bullet.damage = bouncerEnemyDamage;
    bullet.body.setCollideWorldBounds(true);
    bullet.body.setBounce(1);
    bullet.body.setSize(bouncerEnemyBulletSize, bouncerEnemyBulletSize);
    scene.physics.velocityFromRotation(angleToPlayer, bouncerEnemyBulletSpeed, bullet.body.velocity);
    scene.time.delayedCall(bouncerEnemyBulletLifetime, () => { if (bullet.active) bullet.destroy(); });
}

function bouncerBulletHitPlayer(player, bullet) {
    bullet.destroy();
    if (!player.lastHitTime) player.lastHitTime = 0;
    const hitCooldown = 500;
    if (this.time.now > player.lastHitTime + hitCooldown) {
        player.health -= bullet.damage;
        player.lastHitTime = this.time.now;
        player.setTint(0xff0000);
        this.time.delayedCall(200, () => player.clearTint());
        updateHUD();
        if (player.health <= 0) {
            resetGame();
            this.scene.restart();
        }
    }
}

function update(time, delta) {
    if (isGamePaused) return;

    player.setVelocity(0);
    if (keys.left.isDown) player.setVelocityX(-playerSpeed);
    if (keys.right.isDown) player.setVelocityX(playerSpeed);
    if (keys.up.isDown) player.setVelocityY(-playerSpeed);
    if (keys.down.isDown) player.setVelocityY(playerSpeed);

    let angle = Phaser.Math.Angle.Between(player.x, player.y, pointer.worldX, pointer.worldY);
    player.setRotation(angle);

    if (magnetLevel > 0) {
        const baseMagnetSpeed = 80;
        const baseMagnetRange = 100;
        const magnetSpeed = baseMagnetSpeed + (magnetLevel - 1) * 60;
        const magnetRange = baseMagnetRange + (magnetLevel - 1) * 80;

        coins.getChildren().forEach(coin => {
            if (!coin.active) return;
            const dist = Phaser.Math.Distance.Between(player.x, player.y, coin.x, coin.y);
            if (dist <= magnetRange) {
                const cAngle = Phaser.Math.Angle.Between(coin.x, coin.y, player.x, player.y);
                const vx = Math.cos(cAngle) * magnetSpeed;
                const vy = Math.sin(cAngle) * magnetSpeed;
                coin.body.setVelocity(vx, vy);
                if (dist <= 24) collectCoin(player, coin);
            } else coin.body.setVelocity(0, 0);
        });
    }

    // Enemy AI
    enemies.getChildren().forEach(enemy => {
        if (enemy.active) this.physics.moveToObject(enemy, player, enemy.speed);
    });

    shooterEnemies.getChildren().forEach(enemy => {
        if (enemy.active) {
            const stopDistance = 200;
            const distanceToPlayer = Phaser.Math.Distance.Between(enemy.x, enemy.y, player.x, player.y);
            if (distanceToPlayer > stopDistance) this.physics.moveToObject(enemy, player, enemy.speed);
            else enemy.body.setVelocity(0);
            if (time > enemy.lastShotTime + enemy.fireRate) {
                enemyShootBullet(this, enemy);
                enemy.lastShotTime = time;
            }
        }
    });

    bouncerEnemies.getChildren().forEach(enemy => {
        if (enemy.active) {
            const bouncerStopDistance = 250;
            const distanceToPlayer = Phaser.Math.Distance.Between(enemy.x, enemy.y, player.x, player.y);
            if (distanceToPlayer > bouncerStopDistance) this.physics.moveToObject(enemy, player, enemy.speed);
            else enemy.body.setVelocity(0);
            if (time > enemy.lastShotTime + enemy.fireRate) {
                bouncerEnemyShootBullet(this, enemy);
                enemy.lastShotTime = time;
            }
        }
    });

    exploderEnemies.getChildren().forEach(enemy => {
        if (enemy.active) this.physics.moveToObject(enemy, player, enemy.speed);
    });

    sniperEnemies.getChildren().forEach(enemy => {
        if (enemy.active) {
            const stopDistance = 400; // Stays far
            const distanceToPlayer = Phaser.Math.Distance.Between(enemy.x, enemy.y, player.x, player.y);
            if (distanceToPlayer > stopDistance) this.physics.moveToObject(enemy, player, enemy.speed);
            else enemy.body.setVelocity(0);

            if (time > enemy.lastShotTime + enemy.fireRate) {
                sniperShoot(this, enemy);
                enemy.lastShotTime = time;
            }
        }
    });

    if (pointer.isDown) {
        if (currentWeapon === 'pistol' && time > lastShot + fireRate) {
            shootBullet(this, angle);
            lastShot = time;
        } else if (currentWeapon === 'sword' && time > lastSwordAttack + swordAttackCooldown) {
            swordAttack(this, angle);
            lastSwordAttack = time;
        }
    }

    enemyBullets.getChildren().forEach(bullet => {
        if (bullet.active && !this.physics.world.bounds.contains(bullet.x, bullet.y)) bullet.destroy();
    });
}