// Copyright (C) 2024 NeonStrawberry

// const health_max = 5;
const iframes_max = 50; // 40TPS = 3/4 second iframes
const power_cooldown = 8; // Ticks to wait between power increases
const power_penalty = 60; // Ticks to wait before beginning to charge power after running out
const score_penalty = 50; // Score to lose when hit
const score_reward = 100; // Score to gain when an enemy is killed
const p_width = 16; // Size of the player in pixels
const p_speed = 5;
const weapon_cooldown = 5; // Ticks to wait between weapon shots
const p_projectile_speed = 30;
const p_projectile_width = 10;
const p_wpncost = 2; // Power consumed by weapon
const max_power = 50;
const max_enemy_cooldown = 160; // Ticks to wait between an enemy's death and a new one spawning
const enemy_max_health = 10;
const projectile_speed = 2;
const enemy_count = 1;
const bullet_lifetime = 800;

let mkeys = []; // Keys currently held down
let p_pos = [450, 337];
let p_power = 1;
let p_health = 1;
let p_iframes = 0; // The iframes available
let p_score = 0; // Increase by 1 every tick, lose 50 when hit, increase by 100 when killing an enemy
let p_wpncool = 0; // Weapon cooldown
let p_pwrcool = 0; // Power increase cooldown

let p_projectiles = []; // Player's bullets
let projectiles = []; // Enemies' bullets
let enemies = [];

let waves = 0; // Number of waves so far

let enemy_cooldown = max_enemy_cooldown;

const display = document.getElementById("display");
const ctx = display.getContext("2d");

/* Input handling */
window.onkeydown = function(e) {
    if (mkeys.indexOf(e.keyCode) == -1)
        mkeys.push(e.keyCode);
}

window.onkeyup = function(e) {
    if (mkeys.indexOf(e.keyCode) != -1)
        mkeys.splice(mkeys.indexOf(e.keyCode), 1);
}

/* Damage the player */
function p_hurt() {
    if (p_iframes <= 0) {
        p_health--;
        p_iframes = iframes_max;
        p_score -= score_penalty;
    }
}

function collides_with_player(pos, size) {
    if (Math.abs(pos[0] - p_pos[0]) <= (size / 2 + p_width / 2))
        if (Math.abs(pos[1] - p_pos[1]) <= (size / 2 + p_width / 2))
            return 1;
    return 0;
}

function collides_with_enemy(pos, size) {
    for (let i = 0; i < enemies.length; i++) {
        if (Math.abs(pos[0] - enemies[i].pos[0]) <= (size / 2 + enemies[i].width / 2))
            if (Math.abs(pos[1] - enemies[i].pos[1]) <= (size / 2 + enemies[i].width / 2))
                return i;
    }

    return -1;
}

/* Projectile class */
class Projectile {
    constructor(pos, vel) {
        this.pos = [pos[0], pos[1]];
        this.vel = [vel[0], vel[1]];
        this.lifetime = bullet_lifetime;
    }

    // Return -1 to delete
    ai() {
        this.pos[0] += this.vel[0];
        this.pos[1] += this.vel[1];

        if (this.pos[1] < -10)
            return -1;

        let r = collides_with_enemy(this.pos, p_projectile_width)
        if (r != -1) {
            enemies[r].health--;
            return -1;
        }
    }

    draw(context) {
        context.fillStyle = "white";
        context.fillRect(this.pos[0] - p_projectile_width / 2, this.pos[1] - p_projectile_width / 2, p_projectile_width, p_projectile_width);
    }
}

class BasicEnemyBullet extends Projectile {
    constructor(pos, vel) {
        super(pos, vel);
    }

    ai() {
        this.pos[0] += this.vel[0];
        this.pos[1] += this.vel[1];

        if (this.pos[1] < -10)
            return -1;

        if (collides_with_player(this.pos, p_projectile_width) == 1) {
            p_hurt();
            return -1;
        }

        this.lifetime--;
        if (this.lifetime <= 0)
            return -1;
    }

    draw(context) {
        context.fillStyle = "purple";
        context.fillRect(this.pos[0] - p_projectile_width / 2, this.pos[1] - p_projectile_width / 2, p_projectile_width, p_projectile_width);
    }
}

/* Set health to 0 to delete */
class Enemy {
    constructor() {
        this.health = enemy_max_health;
        this.pos = [450, 80];
        this.width = 20;
        this.speed = 1;
        this.max_bcool = 30;

        this.aim_time = 0; // Ticks to move in a direction
        this.aim_direction = 0; // Direction to move in. 0 = left, 1 = right
        this.bullet_cooldown = this.max_bcool;
    }

    ai() {
        if (this.aim_time == 0 || this.pos[0] < this.width / 2 || this.pos[0] > 900 - this.width / 2) {
            this.aim_time = 20 + Math.floor(Math.random() * 100);
            this.aim_direction = 1 - this.aim_direction;
        }

        this.aim_time--;
        this.bullet_cooldown--;

        this.pos[0] += (this.aim_direction - 0.5) * 2 * this.speed;
        if (this.bullet_cooldown <= 0) {
            enemy_shoot(this);
            this.bullet_cooldown = this.max_bcool;
        }
    }

    draw(context) {
        context.fillStyle = "magenta";
        context.fillRect(this.pos[0] - this.width / 2, this.pos[1] - this.width / 2, this.width, this.width);
    }
}

class Boss extends Enemy {
    constructor() {
        super();

        this.health = 100;
        this.pos = [450, 80];
        this.width = 40;
        this.speed = 4;
        this.max_bcool = 40;

        this.bullet_cooldown = this.max_bcool;
        this.aim_direction = 0;
    }

    ai() {
        if (this.aim_time == 0 || this.pos[0] < this.width / 2 || this.pos[0] > 900 - this.width / 2) {
            this.aim_time = 20 + Math.floor(Math.random() * 100);
            this.aim_direction = 1 - this.aim_direction;
        }

        this.aim_time--;
        this.bullet_cooldown--;

        this.pos[0] += (this.aim_direction - 0.5) * 2 * this.speed;
        if (this.bullet_cooldown <= 0) {
            bullet_star(this.pos, 50);
            this.bullet_cooldown = this.max_bcool;
        }
    }
}

function game_over() {
    alert("u are ded");
    reset();
}

/* Reset the game state */
function reset() {
    p_pos = [450, 337];
    p_power = 1;
    p_health = 1;
    p_iframes = 0;
    p_score = 0;
    p_wpncool = 0;
    mkeys = [];

    p_projectiles = [];
    projectiles = [];
    enemies = [];

    enemy_cooldown = max_enemy_cooldown;
    waves = 0;
}

/* Check if an enemy should spawn */
function check_enemy_spawn() {
    if (enemies.length <= 0) {
        if (enemy_cooldown > 0)
            enemy_cooldown--;
        else {
            waves++;
            enemy_cooldown = max_enemy_cooldown;
            return 1;
        }
    }
}

function spawn_boss() {
    enemies.push(new Boss());
}

function spawn_enemy() {
    if ((waves) % 3 != 0) {
        for (let i = 0; i < enemy_count; i++) {
            enemies.push(new Enemy());
        }
    } else {
        spawn_boss();
    }
}

function bullet_star(pos, num) {
    for (let i = 0; i < num; i++) {
        let vx = Math.sin(i / num * 6.28319) * projectile_speed / 2;
        let vy = Math.cos(i / num * 6.28319) * projectile_speed / 2;

        projectiles.push(new BasicEnemyBullet(pos, [vx, vy]));
    }
}

/* Shoot a projectile from the player */
function player_shoot() {
    let vel = [0, -p_projectile_speed];
    p_projectiles.push(new Projectile(p_pos, vel));
}

function enemy_shoot(en) {
    let vel = [0, projectile_speed];
    projectiles.push(new BasicEnemyBullet(en.pos, vel));
}

/* Update all projectiles */
function projectile_updates() {
    for (let i = 0; i < p_projectiles.length; i++) {
        let r = p_projectiles[i].ai();
        if (r == -1) {
            p_projectiles.splice(i, 1);
            i--;
        }
    }

    for (let i = 0; i < projectiles.length; i++) {
        let r = projectiles[i].ai();
        if (r == -1) {
            projectiles.splice(i, 1);
            i--;
        }
    }
}

function enemy_updates() {
    for (let i = 0; i < enemies.length; i++) {
        enemies[i].ai();
        if (enemies[i].health <= 0) {
            p_health++;
            p_score += score_reward;
            enemies.splice(i, 1);
            i--;
        }    
    }
}

/* General movement updates */
function phys_updates() {
    if (p_wpncool > 0)
        p_wpncool--;

    /* Vertical player movement */
    if (mkeys.indexOf(87) != -1)
        p_pos[1] -= p_speed;
    else if (mkeys.indexOf(83) != -1)
        p_pos[1] += p_speed;

    /* Horizontal player movement */
    if (mkeys.indexOf(65) != -1)
        p_pos[0] -= p_speed;
    else if (mkeys.indexOf(68) != -1)
        p_pos[0] += p_speed;

    if (p_pwrcool <= 0 && p_power < max_power) {
        p_power++;
        p_pwrcool = power_cooldown;
    }

    if (p_pwrcool >= 0)
        p_pwrcool--;

    /* Shoot! */
    if (p_wpncool <= 0 && mkeys.indexOf(32) != -1 && p_power > 0) {
        p_wpncool = weapon_cooldown;
        player_shoot();
        p_power -= p_wpncost;
        if (p_power <= 0) {
            p_power = 0;
            p_pwrcool = power_penalty;
        }
    }

    projectile_updates();
    let s = check_enemy_spawn();
    if (s == 1)
        spawn_enemy();

    enemy_updates();

    if (p_health == 0)
        game_over();
}

function draw_player() {
    ctx.fillStyle = "yellow";
    ctx.fillRect(p_pos[0] - p_width / 2, p_pos[1] - p_width / 2, p_width, p_width);
}

function draw_projectiles() {
    for (let i = 0; i < p_projectiles.length; i++) {
        p_projectiles[i].draw(ctx);
    }

    for (let i = 0; i < projectiles.length; i++) {
        projectiles[i].draw(ctx);
    }
}

function draw_enemies() {
    for (let i = 0; i < enemies.length; i++) {
        enemies[i].draw(ctx);
    }
}

function tick() {
    if (p_iframes > 0)
        p_iframes--;

    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, display.width, display.height);

    phys_updates();
    draw_player();
    draw_projectiles();
    draw_enemies();

    ctx.fillStyle = "white"
    ctx.font = "15px monospace";
    ctx.fillText("Score: " + p_score, 20, 30);

    /* Make the power field red if the player is out of power */
    if (p_power == 0)
        ctx.fillStyle = "red";
    ctx.fillText("Power: " + p_power, 20, 50);

    ctx.fillStyle = "white";

    /* Make the health field magenta if the player has iframes */
    if (p_iframes != 0)
        ctx.fillStyle = "magenta";
    ctx.fillText("Health: " + p_health, 20, 70);

    p_score++;
}

setInterval(tick, 25);
