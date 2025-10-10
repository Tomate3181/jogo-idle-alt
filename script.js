
const config = {
    type: Phaser.AUTO,
    width: 1000,
    height: 600,
    physics: { default: 'arcade', arcade: { gravity: { y: 0 }, debug: false } }, // Defina debug para true para ver as hitboxes
    scene: { preload, create, update }
};

const game = new Phaser.Game(config);

let player;
let keys;
let coins;
let score = 0;

// --- Upgrades ---
let playerSpeed = 100;
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
let shopButtons = {}; // Agora armazenará os retângulos dos botões

// --- COMBATE ---
let enemies;
let currentWeapon = 'pistol';
let inventory = ['pistol', 'sword'];
let bullets; // Balas do jogador
let lastShot = 0;
let fireRate = 300;
let swordAttackCooldown = 500;
let lastSwordAttack = 0;
let pointer;

let playerHealth = 100;
let playerMaxHealth = 100;
let playerDamage = 10;

let enemySpawnTimer;
let maxEnemies = 3;

// --- INIMIGO ATIRADOR (NOVIDADE) ---
let shooterEnemies; // Grupo para inimigos atiradores (opcional, mas pode ajudar a gerenciar diferentes lógicas)
let enemyBullets;   // Grupo para as balas dos inimigos
let shooterEnemyFireRate = 2000; // Tempo entre disparos do inimigo atirador (ms)
let shooterEnemyDamage = 10;     // Dano da bala do inimigo
let shooterEnemyBulletSpeed = 150; // Velocidade da bala do inimigo
let shooterEnemyBulletSpread = 30; // Ângulo de espalhamento para "muitas balas" (graus)
let shooterEnemyBulletCount = 3;   // Quantidade de balas por disparo (bullet hell)


// --- ONDAS ---
let currentWave = 0;
let baseEnemyHealth = 30;
let baseEnemySpeed = 80;
let baseEnemyDamage = 10;
const WAVE_INTERVAL = 30000;

// Variáveis da HUD (AGORA PARTE DA CENA PRINCIPAL)
let hudScoreText;
let hudHealthText;
let hudWaveText;
let hudBg;
let hudWeaponHUD = {};
let hudWeaponContainer;


// --- INIMIGO RICOCHETEADOR (NOVIDADE) ---
let bouncerEnemies;          // Grupo para inimigos ricocheteadores
let bouncerBullets;          // Grupo para as balas ricocheteadoras
let bouncerEnemyFireRate = 3000; // Tempo entre disparos do inimigo ricocheteador (ms)
let bouncerEnemyDamage = 20;     // Dano da bala ricocheteadora
let bouncerEnemyBulletSpeed = 300; // Velocidade da bala ricocheteadora
let bouncerEnemyBulletSize = 15; // Tamanho da bala ricocheteadora (será usado para setScale)
let bouncerEnemyBulletLifetime = 5000; // Tempo de vida da bala ricocheteadora (ms)


// --- LOCAL STORAGE ---
function saveGame() {
    const saveData = {
        score, speedLevel, coinLevel, magnetLevel,
        playerSpeed, maxCoins,
        upgradeCostSpeed, upgradeCostCoins, magnetCost,
        playerHealth, playerMaxHealth, playerDamage,
        currentWave,
        currentWeapon,
        inventory
    };
    localStorage.setItem('idleGameSave', JSON.stringify(saveData));
}

function loadGame() {
    const saved = localStorage.getItem('idleGameSave');
    if (saved) {
        const data = JSON.parse(saved);
        score = data.score ?? 0;
        speedLevel = data.speedLevel ?? 1;
        coinLevel = data.coinLevel ?? 1;
        magnetLevel = data.magnetLevel ?? 0;
        playerSpeed = data.playerSpeed ?? 100;
        maxCoins = data.maxCoins ?? 2;
        upgradeCostSpeed = data.upgradeCostSpeed ?? 50;
        upgradeCostCoins = data.upgradeCostCoins ?? 100;
        magnetCost = data.magnetCost ?? 150;
        playerHealth = data.playerHealth ?? 100;
        playerMaxHealth = data.maxHealth ?? 100;
        playerDamage = data.playerDamage ?? 10;
        currentWave = data.currentWave ?? 0;
        currentWeapon = data.currentWeapon ?? 'pistol';
        inventory = data.inventory ?? ['pistol', 'sword'];
    }
}

// --- preload() MODIFICADO ---
function preload() {
    this.load.image('player', 'player.png');
    this.load.image('coin', 'coin.png');
    this.load.image('red_square', 'enemy.png');
    this.load.image('shooter_enemy', 'shooter_enemy.png');
    this.load.image('enemy_bullet', 'enemy_bullet.png');
    this.load.image('bouncer_enemy', 'bouncer_enemy.png'); // NOVO: Sprite para o inimigo ricocheteador
    this.load.image('bouncer_bullet', 'bouncer_bullet.png'); // NOVO: Sprite para a bala ricocheteadora
}

// --- create() MODIFICADO ---
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

    // --- Hitbox do Player (Opcional, mas recomendado para consistência) ---
    // Exemplo: se o player.png for 64x64 e você quer uma hitbox menor (30x30)
    // player.body.setSize(30, 30);
    // player.body.setOffset((player.width * player.scaleX - 30) / 2, (player.height * player.scaleY - 30) / 2);


    coins = this.physics.add.group();
    spawnCoins(this);

    hudScoreText = this.add.text(16, 16, 'Pontos: 0', {
        fontSize: '24px',
        fill: '#ffffff',
        fontFamily: 'Arial'
    });
    hudHealthText = this.add.text(16, 48, 'Vida: 100/100', {
        fontSize: '24px',
        fill: '#00ff00',
        fontFamily: 'Arial'
    });
    hudWaveText = this.add.text(16, 80, 'Onda: 0', {
        fontSize: '24px',
        fill: '#00bfff',
        fontFamily: 'Arial'
    });
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

    bouncerEnemies = this.physics.add.group(); // NOVO
    bouncerBullets = this.physics.add.group(); // NOVO

    increaseDifficulty.call(this);

    enemySpawnTimer = this.time.addEvent({
        delay: 3000,
        callback: () => {
            // Conta todos os inimigos (normal + atirador)
            const totalEnemies = enemies.getChildren().length + shooterEnemies.getChildren().length;
            if (totalEnemies < maxEnemies) spawnEnemy(this);
        },
        loop: true
    });

    this.time.addEvent({
        delay: WAVE_INTERVAL,
        callback: increaseDifficulty,
        callbackScope: this,
        loop: true
    });

    this.physics.add.overlap(player, enemies, hitEnemy, null, this);
    this.physics.add.overlap(player, shooterEnemies, hitEnemy, null, this); // Colisão player com atirador

    bullets = this.physics.add.group(); // Balas do jogador

    this.input.keyboard.on('keydown-ONE', () => {
        currentWeapon = 'pistol';
        updateHUD();
    });
    this.input.keyboard.on('keydown-TWO', () => {
        currentWeapon = 'sword';
        updateHUD();
    });

    this.physics.add.overlap(player, enemies, hitEnemy, null, this);
    this.physics.add.overlap(player, shooterEnemies, hitEnemy, null, this);
    this.physics.add.overlap(player, bouncerEnemies, hitEnemy, null, this); // NOVO: Colisão player com ricocheteador

    // ...

    this.physics.add.overlap(bullets, enemies, bulletHitEnemy, null, this);
    this.physics.add.overlap(bullets, shooterEnemies, bulletHitEnemy, null, this);
    this.physics.add.overlap(bullets, bouncerEnemies, bulletHitEnemy, null, this); // NOVO: Balas do jogador com ricocheteador

    this.physics.add.overlap(player, enemyBullets, enemyBulletHitPlayer, null, this);
    this.physics.add.overlap(player, bouncerBullets, bouncerBulletHitPlayer, null, this); // NOVO: Colisão balas ricocheteadoras com jogador

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
    hudHealthText.setText(`Vida: ${player.health}/${player.maxHealth}`);
    hudWaveText.setText(`Onda: ${currentWave}`);

    inventory.forEach(weapon => {
        const text = hudWeaponHUD[weapon];
        if (text) {
            text.setColor(weapon === currentWeapon ? '#FFD700' : '#FFFFFF');
        }
    });
}

function collectCoin(player, coin) {
    coin.disableBody(true, true);
    score += pointsPerCoin;
    updateHUD();
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

// ---- LOJA - AGORA COM RETÂNGULOS ESTILIZADOS E POSIÇÃO AJUSTADA ----
function createShop(scene) {
    const shopX = scene.game.config.width - 120; // Ajustado para mais à direita
    let shopY = 16;
    const buttonHeight = 40;
    const spacing = 10;
    const buttonWidth = 180;

    // Cores para os estados dos botões
    const NORMAL_COLOR = 0x222222;
    const HOVER_COLOR = 0x444444;
    const ACTIVE_COLOR = 0x008800; // Verde mais escuro para o clique

    // Função auxiliar para criar um botão retangular
    const createShopButton = (key, textContent, callback, cost) => {
        const buttonBg = scene.add.rectangle(shopX, shopY, buttonWidth, buttonHeight, NORMAL_COLOR)
            .setOrigin(0.5, 0)
            .setInteractive()
            .setStrokeStyle(2, 0xffffff, 0.3)
            .setDepth(10); // Aumenta a profundidade

        const buttonText = scene.add.text(shopX, shopY + buttonHeight / 2, textContent, {
            fontSize: '16px',
            fill: '#ffffff',
            fontFamily: 'Arial',
            align: 'center'
        }).setOrigin(0.5)
            .setDepth(11); // Profundidade maior para o texto

        // Eventos de interatividade
        buttonBg.on('pointerover', () => {
            if (buttonBg.input.enabled) {
                buttonBg.setFillStyle(HOVER_COLOR);
            }
        });
        buttonBg.on('pointerout', () => {
            if (buttonBg.input.enabled) {
                buttonBg.setFillStyle(NORMAL_COLOR);
            }
        });
        buttonBg.on('pointerdown', () => {
            if (buttonBg.input.enabled) { // Verifica se o botão está habilitado para clicar
                buttonBg.setFillStyle(ACTIVE_COLOR);
                callback(scene); // Chama a função de compra
                scene.time.delayedCall(100, () => {
                    if (buttonBg.input.enabled) { // Se ainda estiver habilitado
                        if (buttonBg.input.isOver) { // E o mouse ainda estiver sobre
                            buttonBg.setFillStyle(HOVER_COLOR);
                        } else {
                            buttonBg.setFillStyle(NORMAL_COLOR);
                        }
                    }
                });
            }
        });

        shopTexts[key] = buttonText;
        shopButtons[key] = { bg: buttonBg, text: buttonText, cost: cost };

        shopY += buttonHeight + spacing;

        return scene.add.container(0, 0, [buttonBg, buttonText]);
    };

    // Chamadas para criar cada botão
    createShopButton('speed', `Velocidade: ${speedLevel} (Custo: ${upgradeCostSpeed})`, buySpeed, upgradeCostSpeed);
    createShopButton('coins', `Moedas Max: ${coinLevel} (Custo: ${upgradeCostCoins})`, buyCoins, upgradeCostCoins);
    createShopButton('magnet', `Ímã: ${magnetLevel > 0 ? 'Ativo' : 'Comprar'} (Custo: ${magnetCost})`, buyMagnet, magnetCost);
    createShopButton('maxHealth', `Vida Max: ${playerMaxHealth} (Custo: 200)`, buyMaxHealth, 200);
    createShopButton('playerDamage', `Dano: ${playerDamage} (Custo: 100)`, buyPlayerDamage, 100);

    updateShop();
}


// ---- UPGRADES ----
function buySpeed(scene) {
    if (score >= upgradeCostSpeed) {
        score -= upgradeCostSpeed;
        playerSpeed += 20;
        speedLevel++;
        upgradeCostSpeed = Math.round(upgradeCostSpeed * 1.5);
        updateHUD();
        updateShop();
        saveGame();
    }
}
function buyCoins(scene) {
    if (score >= upgradeCostCoins) {
        score -= upgradeCostCoins;
        maxCoins += 1;
        coinLevel++;
        upgradeCostCoins = Math.round(upgradeCostCoins * 1.5);
        updateHUD();
        updateShop();
        saveGame();
    }
}
function buyMagnet(scene) {
    if (magnetLevel === 0 && score >= magnetCost) {
        score -= magnetCost;
        magnetLevel = 1;
        updateHUD();
        updateShop();
        saveGame();
    }
}
function buyMaxHealth(scene) {
    const cost = 200;
    if (score >= cost) {
        score -= cost;
        playerMaxHealth += 20;
        player.maxHealth = playerMaxHealth;
        player.health += 20;
        if (player.health > player.maxHealth) player.health = player.maxHealth;
        updateHUD();
        updateShop();
        saveGame();
    }
}
function buyPlayerDamage(scene) {
    const cost = 100;
    if (score >= cost) {
        score -= cost;
        playerDamage += 5;
        player.damage = playerDamage;
        updateHUD();
        updateShop();
        saveGame();
    }
}

function updateShop() {
    // Cores para os estados dos botões
    const NORMAL_COLOR = 0x222222;
    const DISABLED_COLOR_BG = 0x111111; // Fundo do botão desabilitado
    const DISABLED_COLOR_TEXT = '#888888'; // Texto do botão desabilitado
    const ENABLED_COLOR_TEXT = '#ffffff'; // Texto do botão habilitado

    // Atualiza os textos dos botões
    shopTexts.speed.setText(`Velocidade: ${speedLevel} (Custo: ${upgradeCostSpeed})`);
    shopTexts.coins.setText(`Moedas Max: ${coinLevel} (Custo: ${upgradeCostCoins})`);
    shopTexts.magnet.setText(`Ímã: ${magnetLevel > 0 ? 'Ativo' : 'Comprar'} (Custo: ${magnetCost})`);
    shopTexts.maxHealth.setText(`Vida Max: ${playerMaxHealth} (Custo: 200)`);
    shopTexts.playerDamage.setText(`Dano: ${playerDamage} (Custo: 100)`);

    // Lógica para habilitar/desabilitar botões
    // Velocidade
    if (shopButtons.speed) {
        const canAfford = score >= upgradeCostSpeed;
        shopButtons.speed.bg.setFillStyle(canAfford ? NORMAL_COLOR : DISABLED_COLOR_BG);
        shopButtons.speed.text.setColor(canAfford ? ENABLED_COLOR_TEXT : DISABLED_COLOR_TEXT);
        shopButtons.speed.bg.input.enabled = canAfford; // Usa input.enabled para controlar a interatividade
    }
    // Moedas
    if (shopButtons.coins) {
        const canAfford = score >= upgradeCostCoins;
        shopButtons.coins.bg.setFillStyle(canAfford ? NORMAL_COLOR : DISABLED_COLOR_BG);
        shopButtons.coins.text.setColor(canAfford ? ENABLED_COLOR_TEXT : DISABLED_COLOR_TEXT);
        shopButtons.coins.bg.input.enabled = canAfford;
    }
    // Ímã (só pode comprar uma vez)
    if (shopButtons.magnet) {
        const canAfford = score >= magnetCost && magnetLevel === 0; // Só pode comprar se não tiver o ímã
        shopButtons.magnet.bg.setFillStyle(canAfford ? NORMAL_COLOR : DISABLED_COLOR_BG);
        shopButtons.magnet.text.setColor(canAfford ? ENABLED_COLOR_TEXT : DISABLED_COLOR_TEXT);
        shopButtons.magnet.bg.input.enabled = canAfford;
    }
    // Vida Máxima
    if (shopButtons.maxHealth) {
        const canAfford = score >= shopButtons.maxHealth.cost;
        shopButtons.maxHealth.bg.setFillStyle(canAfford ? NORMAL_COLOR : DISABLED_COLOR_BG);
        shopButtons.maxHealth.text.setColor(canAfford ? ENABLED_COLOR_TEXT : DISABLED_COLOR_TEXT);
        shopButtons.maxHealth.bg.input.enabled = canAfford;
    }
    // Dano do Jogador
    if (shopButtons.playerDamage) {
        const canAfford = score >= shopButtons.playerDamage.cost;
        shopButtons.playerDamage.bg.setFillStyle(canAfford ? NORMAL_COLOR : DISABLED_COLOR_BG);
        shopButtons.playerDamage.text.setColor(canAfford ? ENABLED_COLOR_TEXT : DISABLED_COLOR_TEXT);
        shopButtons.playerDamage.bg.input.enabled = canAfford;
    }
}


function increaseDifficulty() {
    currentWave++;
    baseEnemyHealth += 10;
    baseEnemySpeed += 5;
    baseEnemyDamage += 2;
    if (currentWave % 2 === 0) maxEnemies += 1;
    this.cameras.main.shake(100, 0.005);
    updateHUD();
    saveGame();
}

function getOffScreenSpawnPosition(scene) {
    const gameWidth = scene.game.config.width;
    const gameHeight = scene.game.config.height;
    const padding = 50; // Distância mínima da borda para garantir que esteja fora da tela

    let x, y;
    const side = Phaser.Math.Between(0, 3); // 0: top, 1: right, 2: bottom, 3: left

    switch (side) {
        case 0: // Top
            x = Phaser.Math.Between(-padding, gameWidth + padding);
            y = -padding;
            break;
        case 1: // Right
            x = gameWidth + padding;
            y = Phaser.Math.Between(-padding, gameHeight + padding);
            break;
        case 2: // Bottom
            x = Phaser.Math.Between(-padding, gameWidth + padding);
            y = gameHeight + padding;
            break;
        case 3: // Left
            x = -padding;
            y = Phaser.Math.Between(-padding, gameHeight + padding);
            break;
    }
    return { x, y };
}


// --- spawnEnemy() MODIFICADO ---
function spawnEnemy(scene) {
    const spawnPos = getOffScreenSpawnPosition(scene);

    let enemy;
    const totalEnemyTypes = 3; // Agora temos 3 tipos: normal, shooter, bouncer
    const randomType = Phaser.Math.Between(0, totalEnemyTypes - 1); // 0, 1 ou 2

    // Defina as chances para cada tipo (ajuste conforme a dificuldade desejada)
    // Exemplo: 0 = Normal (60%), 1 = Shooter (30%), 2 = Bouncer (10%)
    // Ou faça por onda:
    let enemyTypeChance = Phaser.Math.Between(0, 100);
    const shooterChance = 30 + currentWave * 2; // Aumenta a chance do atirador com a onda
    const bouncerChance = 10 + currentWave * 1; // Aumenta a chance do ricocheteador com a onda

    // priorize inimigos mais perigosos em ondas mais altas
    if (enemyTypeChance < bouncerChance && currentWave >= 2) { // Ricocheteador a partir da onda 2
        enemy = scene.physics.add.sprite(spawnPos.x, spawnPos.y, 'bouncer_enemy');
        enemy.health = baseEnemyHealth * 2.0; // Ricocheteadores podem ter mais vida
        enemy.damage = baseEnemyDamage * 1.5; // E causar mais dano no toque
        enemy.speed = baseEnemySpeed * 0.5; // E ser mais lento
        enemy.type = 'bouncer';
        enemy.lastShotTime = 0;
        enemy.fireRate = bouncerEnemyFireRate;
        bouncerEnemies.add(enemy);
    } else if (enemyTypeChance < shooterChance && currentWave >= 1) { // Atirador a partir da onda 1
        enemy = scene.physics.add.sprite(spawnPos.x, spawnPos.y, 'shooter_enemy');
        enemy.health = baseEnemyHealth * 1.5;
        enemy.damage = baseEnemyDamage;
        enemy.speed = baseEnemySpeed * 0.7;
        enemy.type = 'shooter';
        enemy.lastShotTime = 0;
        enemy.fireRate = shooterEnemyFireRate;
        shooterEnemies.add(enemy);
    } else { // Normal
        enemy = scene.physics.add.sprite(spawnPos.x, spawnPos.y, 'red_square');
        enemy.health = baseEnemyHealth;
        enemy.damage = baseEnemyDamage;
        enemy.speed = baseEnemySpeed;
        enemy.type = 'normal';
        enemies.add(enemy);
    }

    // --- Hitbox do Inimigo --- (mantenha a lógica de hitbox para todos os inimigos)
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
        // Reduz a vida do jogador
        player.health -= enemy.damage;
        player.lastHitTime = this.time.now;

        // Efeito visual de acerto no jogador
        player.setTint(0xff0000);
        this.time.delayedCall(200, () => player.clearTint());
        updateHUD();

        // Se o jogador morrer, reinicia o jogo e reseta as variáveis
        if (player.health <= 0) {
            score = 0;
            currentWave = 0;
            saveGame();
            this.scene.restart();
        }
    }
}

function shootBullet(scene, angle) {
    let bullet = scene.add.rectangle(player.x, player.y, 8, 4, 0xffffff);
    scene.physics.add.existing(bullet);
    bullets.add(bullet);
    bullet.body.setAllowGravity(false);
    bullet.damage = player.damage;
    scene.physics.velocityFromRotation(angle, 400, bullet.body.velocity);
    scene.time.delayedCall(2000, () => bullet.destroy());
}

function swordAttack(scene, angle) {
    let distance = 40;
    let offsetX = Math.cos(angle) * distance;
    let offsetY = Math.sin(angle) * distance;
    let hitbox = scene.add.rectangle(player.x + offsetX, player.y + offsetY, 50, 30, 0x00ff00, 0.3);
    scene.physics.add.existing(hitbox);
    hitbox.body.setAllowGravity(false);
    hitbox.damage = player.damage;
    let enemiesHit = new Set();
    scene.physics.overlap(hitbox, enemies, (box, enemy) => {
        if (!enemiesHit.has(enemy)) {
            takeDamage.call(scene, enemy, box.damage);
            enemiesHit.add(enemy);
        }
    });
    scene.physics.overlap(hitbox, shooterEnemies, (box, enemy) => { // Dano da espada no atirador
        if (!enemiesHit.has(enemy)) {
            takeDamage.call(scene, enemy, box.damage);
            enemiesHit.add(enemy);
        }
    });
    scene.time.delayedCall(200, () => hitbox.destroy());
}

function bulletHitEnemy(bullet, enemy) {
    bullet.destroy();
    takeDamage.call(this, enemy, bullet.damage);
}

// --- takeDamage() MODIFICADO para lidar com diferentes grupos de inimigos ---
function takeDamage(target, amount) {
    if (!target || !target.active) return;
    target.health -= amount;
    target.setTint(0xff8888);
    this.time.delayedCall(150, () => target.clearTint());
    if (target.health <= 0) {
        target.destroy();
        score += 10 + currentWave * 2;
        updateHUD();
        saveGame();
    }
}

// --- NOVA FUNÇÃO: Inimigo atira balas ---
function enemyShootBullet(scene, enemy) {
    // Calcula o ângulo em direção ao jogador
    const angleToPlayer = Phaser.Math.Angle.Between(enemy.x, enemy.y, player.x, player.y);

    // Ajusta o ângulo do inimigo para "olhar" para o jogador
    enemy.setRotation(angleToPlayer);

    // Dispara múltiplas balas com um pouco de espalhamento
    for (let i = 0; i < shooterEnemyBulletCount; i++) {
        const spreadAngle = Phaser.Math.Between(-shooterEnemyBulletSpread / 2, shooterEnemyBulletSpread / 2);
        const finalAngle = Phaser.Math.DegToRad(Phaser.Math.RadToDeg(angleToPlayer) + spreadAngle);

        let bullet = scene.add.sprite(enemy.x, enemy.y, 'enemy_bullet').setScale(0.1); // Use sprite para bala inimiga
        scene.physics.add.existing(bullet);
        enemyBullets.add(bullet); // Adiciona ao grupo de balas inimigas

        bullet.body.setAllowGravity(false);
        bullet.damage = shooterEnemyDamage; // Dano da bala do inimigo

        scene.physics.velocityFromRotation(finalAngle, shooterEnemyBulletSpeed, bullet.body.velocity);

        // Ajuste a hitbox da bala do inimigo se necessário
        bullet.body.setSize(10, 10); // Exemplo: 10x10 para a bala do inimigo
        bullet.body.setOffset((bullet.width * bullet.scaleX - 10) / 2, (bullet.height * bullet.scaleY - 10) / 2);


        // Balas inimigas são destruídas após um tempo ou fora da tela
        scene.time.delayedCall(3000, () => bullet.destroy()); // Destruir após 3 segundos
    }
}

// --- NOVA FUNÇÃO: Colisão de bala inimiga com jogador ---
function enemyBulletHitPlayer(player, bullet) {
    bullet.destroy(); // Destroi a bala do inimigo ao atingir o jogador

    // Lógica de dano ao jogador (similar à colisão com o inimigo)
    if (!player.lastHitTime) player.lastHitTime = 0;
    const hitCooldown = 500; // Cooldown para não tomar dano de várias balas de uma vez
    if (this.time.now > player.lastHitTime + hitCooldown) {
        player.health -= bullet.damage;
        player.lastHitTime = this.time.now;
        player.setTint(0xff0000);
        this.time.delayedCall(200, () => player.clearTint());
        updateHUD();
        if (player.health <= 0) {
            score = 0;
            currentWave = 0;
            saveGame();
            this.scene.restart();
        }
    }
}

// --- NOVA FUNÇÃO: Inimigo ricocheteador atira bala ---
function bouncerEnemyShootBullet(scene, enemy) {
    // Calcula o ângulo em direção ao jogador
    const angleToPlayer = Phaser.Math.Angle.Between(enemy.x, enemy.y, player.x, player.y);

    // Ajusta o ângulo do inimigo para "olhar" para o jogador
    enemy.setRotation(angleToPlayer);

    let bullet = scene.add.sprite(enemy.x, enemy.y, 'bouncer_bullet')
        .setScale(bouncerEnemyBulletSize / 32); // Ajusta a escala baseado no tamanho desejado e tamanho original do sprite (se for 32x32)
    scene.physics.add.existing(bullet);
    bouncerBullets.add(bullet);

    bullet.body.setAllowGravity(false);
    bullet.damage = bouncerEnemyDamage;
    bullet.body.setCollideWorldBounds(true); // Faz a bala ricochetear nas bordas do mundo
    bullet.body.setBounce(1); // Define o "ricochete" para 100%

    // Ajusta a hitbox da bala ricocheteadora
    bullet.body.setSize(bouncerEnemyBulletSize, bouncerEnemyBulletSize);
    bullet.body.setOffset((bullet.width * bullet.scaleX - bouncerEnemyBulletSize) / 2, (bullet.height * bullet.scaleY - bouncerEnemyBulletSize) / 2);

    scene.physics.velocityFromRotation(angleToPlayer, bouncerEnemyBulletSpeed, bullet.body.velocity);

    // Destruir bala após um tempo
    scene.time.delayedCall(bouncerEnemyBulletLifetime, () => {
        if (bullet.active) bullet.destroy();
    });
}

// --- NOVA FUNÇÃO: Colisão de bala ricocheteadora com jogador ---
function bouncerBulletHitPlayer(player, bullet) {
    bullet.destroy(); // Destrói a bala ricocheteadora ao atingir o jogador

    // Lógica de dano ao jogador (similar às outras balas)
    if (!player.lastHitTime) player.lastHitTime = 0;
    const hitCooldown = 500; // Cooldown para não tomar dano de várias balas de uma vez
    if (this.time.now > player.lastHitTime + hitCooldown) {
        player.health -= bullet.damage;
        player.lastHitTime = this.time.now;
        player.setTint(0xff0000);
        this.time.delayedCall(200, () => player.clearTint());
        updateHUD();
        if (player.health <= 0) {
            score = 0;
            currentWave = 0;
            saveGame();
            this.scene.restart();
        }
    }
}


// --- update()
function update(time, delta) {
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

    // Movimento dos inimigos normais
    enemies.getChildren().forEach(enemy => {
        if (enemy.active) this.physics.moveToObject(enemy, player, enemy.speed);
    });

    // Movimento e disparo dos inimigos atiradores
    shooterEnemies.getChildren().forEach(enemy => {
        if (enemy.active) {
            const stopDistance = 200;
            const distanceToPlayer = Phaser.Math.Distance.Between(enemy.x, enemy.y, player.x, player.y);

            if (distanceToPlayer > stopDistance) {
                this.physics.moveToObject(enemy, player, enemy.speed);
            } else {
                enemy.body.setVelocity(0);
            }

            if (time > enemy.lastShotTime + enemy.fireRate) {
                enemyShootBullet(this, enemy);
                enemy.lastShotTime = time;
            }
        }
    });

    // --- NOVIDADE: Movimento e disparo dos inimigos ricocheteadores ---
    bouncerEnemies.getChildren().forEach(enemy => {
        if (enemy.active) {
            const bouncerStopDistance = 250; // Distância para o inimigo ricocheteador parar
            const distanceToPlayer = Phaser.Math.Distance.Between(enemy.x, enemy.y, player.x, player.y);

            if (distanceToPlayer > bouncerStopDistance) {
                this.physics.moveToObject(enemy, player, enemy.speed);
            } else {
                enemy.body.setVelocity(0);
            }

            // Lógica de disparo de tiro único
            if (time > enemy.lastShotTime + enemy.fireRate) {
                bouncerEnemyShootBullet(this, enemy);
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

    // Destruir balas inimigas que saem da tela
    enemyBullets.getChildren().forEach(bullet => {
        if (bullet.active && !this.physics.world.bounds.contains(bullet.x, bullet.y)) {
            bullet.destroy();
        }
    });
}