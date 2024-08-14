const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);

let player;
let cursors;
let zombies;
let bullets;
let lastFired = 0;
let gameOver = false;
let round = 1;
let score = 0;
let roundText;
let scoreText;
let wallWeapon;
let wallWeaponPrice = 1000;
let hasWallWeapon = false;
const MIN_SPAWN_DISTANCE = 200;
const BOSS_HEALTH = 20;
const ZOMBIE_HEALTH = 3;
let boss = null;
let bossspeed = null;

function preload() {
    this.load.image('player', 'player.png');
    this.load.image('zombie', 'zombie.png');
    this.load.image('bullet', 'bullet.png');
    this.load.image('gameOver', 'gameover.png');
    this.load.image('bossZombie', 'zombie.png'); // Use the same image but with a tint for the boss
    this.load.image('healthBar', 'healthbar.png');
    this.load.image('wallWeapon', 'weapon.png'); // Image for the wall weapon
}

function create() {
    player = this.physics.add.sprite(400, 300, 'player').setScale(0.08);
    player.setCollideWorldBounds(true);
    player.body.setSize(player.width * 0.5, player.height * 0.5);
    cursors = this.input.keyboard.createCursorKeys();
    zombies = this.physics.add.group();
    bullets = this.physics.add.group();
    roundText = this.add.text(650, 10, `Round: ${round}`, { fontSize: '24px', fill: '#fff' });
    scoreText = this.add.text(650, 40, `Score: ${score}`, { fontSize: '24px', fill: '#fff' });

    wallWeapon = this.physics.add.staticSprite(700, 500, 'wallWeapon').setScale(0.07);

    spawnZombies.call(this);

    // Collision detection
    this.physics.add.collider(bullets, zombies, (bullet, zombie) => {
        bullet.destroy();
        if (zombie.health) {
            zombie.health -= hasWallWeapon ? 2 : 1; // More damage with wall weapon
            score += 10; // Points for damaging a zombie
            scoreText.setText(`Score: ${score}`);
            updateHealthBar.call(this, zombie);
            if (zombie.health <= 0) {
                zombie.healthBarBg.destroy();
                zombie.healthBar.destroy();
                zombie.destroy(); 
                score += 100; // Points for killing a zombie
                scoreText.setText(`Score: ${score}`);
            }
        } else {
            zombie.destroy();
        }
        if (zombies.countActive(true) === 0) {
            round++;
            roundText.setText(`Round: ${round}`);
            spawnZombies.call(this);
        }
    });

    this.physics.add.collider(player, zombies, () => {
        this.physics.pause();
        player.setTint(0xff0000);
        gameOver = true;
        this.add.image(400, 300, 'gameOver').setScale(0.5);
    });

    this.physics.add.overlap(player, wallWeapon, () => {
        if (score >= wallWeaponPrice && !hasWallWeapon) {
            score -= wallWeaponPrice;
            scoreText.setText(`Score: ${score}`);
            hasWallWeapon = true;
            wallWeapon.destroy(); // Remove wall weapon after purchase
        }
    });
}

function update(time, delta) {
    if (gameOver) {
        return;
    }

    if (cursors.left.isDown) {
        player.setVelocityX(-160);
    } else if (cursors.right.isDown) {
        player.setVelocityX(160);
    } else {
        player.setVelocityX(0);
    }

    if (cursors.up.isDown) {
        player.setVelocityY(-160);
    } else if (cursors.down.isDown) {
        player.setVelocityY(160);
    } else {
        player.setVelocityY(0);
    }

    if (this.input.activePointer.isDown && time > lastFired) {
        let bullet = bullets.create(player.x, player.y, 'bullet').setScale(0.05);
        this.physics.moveTo(bullet, this.input.activePointer.x, this.input.activePointer.y, 600);
        lastFired = time + (hasWallWeapon ? 100 : 200); // Faster firing rate with wall weapon
    }

    zombies.getChildren().forEach(zombie => {
        this.physics.moveToObject(zombie, player, 50);
        updateHealthBarPosition(zombie);
    });
}

function spawnZombies() {
    zombies.clear(true, true);

    for (let i = 0; i < 10; i++) {
        let x, y;
        do {
            x = Phaser.Math.Between(100, 700);
            y = Phaser.Math.Between(100, 500);
        } while (Phaser.Math.Distance.Between(x, y, player.x, player.y) < MIN_SPAWN_DISTANCE);
        let zombie = zombies.create(x, y, 'zombie').setScale(0.08);
        zombie.body.setSize(zombie.width * 0.5, zombie.height * 0.5);
        zombie.health = ZOMBIE_HEALTH + round; // Increase health each round
        createHealthBar.call(this, zombie);
    }

    if (round % 10 === 0) {
        let x, y;
        do {
            x = Phaser.Math.Between(100, 700);
            y = Phaser.Math.Between(100, 500);
        } while (Phaser.Math.Distance.Between(x, y, player.x, player.y) < MIN_SPAWN_DISTANCE);
        boss = zombies.create(x, y, 'bossZombie').setScale(0.1).setTint(0x800080);
        boss.body.setSize(boss.width * 0.5, boss.height * 0.5);
        boss.health = BOSS_HEALTH + round * 2; // Increase boss health each round
        boss.isBoss = true;
        createHealthBar.call(this, boss);
    }
}

function createHealthBar(zombie) {
    zombie.healthBarBg = this.add.image(zombie.x, zombie.y - 10, 'healthBarBg').setScale(0.1).setOrigin(0.5, 0.5);
    zombie.healthBar = this.add.image(zombie.x, zombie.y - 10, 'healthBar').setScale(0.1).setOrigin(0.5, 0.5);
}

function updateHealthBar(zombie) {
    const maxHealth = zombie.isBoss ? BOSS_HEALTH + round * 2 : ZOMBIE_HEALTH + round;
    const healthRatio = zombie.health / maxHealth;
    zombie.healthBar.scaleX = healthRatio * 0.5;
}

function updateHealthBarPosition(zombie) {
    zombie.healthBarBg.setPosition(zombie.x, zombie.y - 10);
    zombie.healthBar.setPosition(zombie.x, zombie.y - 10);
}
