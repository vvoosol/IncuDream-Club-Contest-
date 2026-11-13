// Extracted from scientist-survival/main.js; see DEVELOPMENT.md.
function getRulerDamage(level) {
  return [32, 38, 44, 50, 54][clamp(level, 1, 5) - 1] || 32;
}


function attackRuler(level) {
  // Narrow, strong straight slash.
  const p = state.player;
  const swings = level >= 4 ? 2 : 1;
  const length = level >= 3 ? 86 : 66;
  const width = 15;
  const damage = applyLavoisierPassive(getRulerDamage(level) * state.stats.damage, true);
  const baseDir = getAimDirection();

  for (let s = 0; s < swings; s += 1) {
    const dir = baseDir + (s === 0 ? 0 : Math.PI);
    const finalDamage = applyNewtonPassive(damage, dir, p.x, p.y);
    state.slashes.push({ kind: "line", x: p.x, y: p.y, dir, length, width, life: 0.13, maxLife: 0.13, color: "rgba(255, 219, 103, 0.78)" });
    hitLineEnemies(p.x, p.y, dir, length, width, finalDamage, 12, "ruler");
  }
}


function attackSteelRuler() {
  const p = state.player;
  const dir = getAimDirection();
  const length = 136;
  const width = 18;
  const damage = applyLavoisierPassive(applyNewtonPassive(70 * state.stats.damage, dir, p.x, p.y), true);
  for (const slashDir of [dir, dir + Math.PI]) {
    state.slashes.push({ kind: "line", x: p.x, y: p.y, dir: slashDir, length, width, life: 0.16, maxLife: 0.16, color: "rgba(218, 235, 240, 0.88)" });
    hitLineEnemies(p.x, p.y, slashDir, length, width, damage, 16, "steel_ruler");
  }
}


function attackBall(level) {
  // Bouncing projectile: rebounds off enemies and arena edges.
  const p = state.player;
  const count = (level >= 4 ? 2 : 1) + state.stats.projectiles;
  const speed = (level >= 5 ? 400 : level >= 2 ? 250 : 205) * getProjectileSpeedMultiplier();
  const damage = applyLavoisierPassive((level >= 2 ? 20 : 14) * state.stats.damage, true);
  const bounces = level >= 3 ? 7 : 4;

  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    state.projectiles.push({
      kind: "ball",
      x: p.x,
      y: p.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 7,
      damage: applyNewtonPassive(damage, angle, p.x, p.y),
      life: getEffectDuration(7),
      bounces,
      hit: new Set(),
    });
  }
}


function attackIronBall() {
  const p = state.player;
  const count = 2 + state.stats.projectiles;
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    state.projectiles.push({
      kind: "iron_ball",
      x: p.x,
      y: p.y,
      vx: Math.cos(angle) * 400 * getProjectileSpeedMultiplier(),
      vy: Math.sin(angle) * 400 * getProjectileSpeedMultiplier(),
      radius: 8,
      damage: applyLavoisierPassive(applyNewtonPassive(16 * state.stats.damage, angle, p.x, p.y), true),
      power: 1,
      life: getEffectDuration(7.5),
      bounces: 8,
      hit: new Set(),
    });
  }
}


function attackChalk(level) {
  // Single-target chalk shot with a small splash.
  const p = state.player;
  const target = findTarget();
  if (!target) return;
  const count = 1 + state.stats.projectiles;
  const base = Math.atan2(target.y - p.y, target.x - p.x);
  const splash = level >= 3 ? 52 : 36;

  for (let i = 0; i < count; i += 1) {
    const angle = base + (i - (count - 1) / 2) * 0.16;
    state.projectiles.push({
      kind: "chalk",
      x: p.x,
      y: p.y,
      vx: Math.cos(angle) * 320 * getProjectileSpeedMultiplier(),
      vy: Math.sin(angle) * 320 * getProjectileSpeedMultiplier(),
      radius: 5,
      damage: applyLavoisierPassive(applyNewtonPassive((level >= 2 ? 28 : 20) * state.stats.damage, angle, p.x, p.y), true),
      life: getEffectDuration(2.2),
      pierce: level >= 4 ? 1 : 0,
      splash,
      hit: new Set(),
    });
  }
}


function attackChalkMachine() {
  const p = state.player;
  const target = findTarget();
  if (!target) return;
  const count = 1 + Math.max(0, Math.floor(state.stats.projectiles || 0));
  const base = Math.atan2(target.y - p.y, target.x - p.x);
  for (let i = 0; i < count; i += 1) {
    const angle = base + rand(-0.08, 0.08);
    state.projectiles.push({
      kind: "chalk_machine",
      x: p.x + Math.cos(angle) * 12,
      y: p.y + Math.sin(angle) * 12,
      vx: Math.cos(angle) * 390 * getProjectileSpeedMultiplier(),
      vy: Math.sin(angle) * 390 * getProjectileSpeedMultiplier(),
      radius: 4,
      damage: applyLavoisierPassive(applyNewtonPassive(7 * state.stats.damage, angle, p.x, p.y), true),
      life: getEffectDuration(1.25),
      pierce: 0,
      splash: 40,
      hit: new Set(),
    });
    state.particles.push({ kind: "dust", x: p.x, y: p.y, vx: -Math.cos(angle) * rand(16, 45), vy: -Math.sin(angle) * rand(16, 45), life: 0.32, maxLife: 0.32 });
  }
}


function attackAmmonia(level, options = {}) {
  // Low damage aura around the player.
  const p = state.player;
  const source = options.source || "ammonia";
  const radius = (level >= 4 ? 86 : level >= 2 ? 68 : 50) * getAttackSizeMultiplier();
  const damage = applyNewtonPassive((level >= 3 ? 9 : 6) * state.stats.damage * (options.damageScale || 1));

  for (const e of state.enemies) {
    if (dist(p, e) <= radius + e.radius) {
      hitEnemy(e, damage, 2, e.x - p.x, e.y - p.y, source);
    }
  }
  if (options.showReactionEffect) {
    const life = getEffectDuration(5);
    state.areas.push({
      kind: "element_aura",
      followPlayer: true,
      x: p.x,
      y: p.y,
      radius,
      damage,
      tick: 0,
      life,
      maxLife: life,
      source,
    });
    state.particles.push({ kind: "reaction_ammonia_cloud", x: p.x, y: p.y, radius, life: 0.8, maxLife: 0.8 });
  }
}


function attackChemWarfare() {
  const p = state.player;
  const radius = 88;
  const damage = applyNewtonPassive(8 * state.stats.damage);
  state.particles.push({ kind: "chem_warfare_aura", x: p.x, y: p.y, radius, life: getEffectDuration(0.34), maxLife: getEffectDuration(0.34) });

  for (const e of state.enemies) {
    if (dist(p, e) <= radius + e.radius) {
      e.x += ((e.x - p.x) / (dist(p, e) || 1)) * 1.4;
      e.y += ((e.y - p.y) / (dist(p, e) || 1)) * 1.4;
      e.slowTimer = 0.45;
      hitEnemy(e, damage, 1, e.x - p.x, e.y - p.y, "chem_warfare");
    }
  }
}


function attackFlask(level) {
  // Ground field throw: places a chemical area near enemies or along the aim direction.
  const p = state.player;
  const throws = (level >= 4 ? 2 : 1) + state.stats.projectiles;
  const target = Math.random() < 0.72 ? findTarget() : null;
  const base = target ? Math.atan2(target.y - p.y, target.x - p.x) : getAimDirection();
  for (let i = 0; i < throws; i += 1) {
    const singleAngle = Math.random() * Math.PI * 2;
    const point = throws === 1 && target
      ? { x: clamp(target.x + Math.cos(singleAngle) * rand(20, 100), 24, W - 24), y: clamp(target.y + Math.sin(singleAngle) * rand(20, 90), 42, H - 24) }
      : getSeparatedLanding(base, i, throws, 92, 176, 0.82);
    const tx = point.x;
    const ty = point.y;
    state.areas.push({
      kind: "flask",
      x: tx,
      y: ty,
      radius: level >= 3 ? 46 : 36,
      damage: applyNewtonPassive((level >= 2 ? 9.5 : 7) * state.stats.damage, null, tx, ty),
      tick: 0,
      life: getEffectDuration(level >= 5 ? 3.4 : 2.5),
      maxLife: getEffectDuration(level >= 5 ? 3.4 : 2.5),
    });
    state.particles.push({ kind: "splash", x: tx, y: ty, radius: 22, life: 0.25, maxLife: 0.25 });
  }
}


function attackFlammableMaterial() {
  const p = state.player;
  const throws = 2 + state.stats.projectiles;
  const target = Math.random() < 0.82 ? findTarget() : null;
  const base = target ? Math.atan2(target.y - p.y, target.x - p.x) : getAimDirection();
  for (let i = 0; i < throws; i += 1) {
    const singleAngle = Math.random() * Math.PI * 2;
    const point = throws === 1 && target
      ? { x: clamp(target.x + Math.cos(singleAngle) * rand(18, 104), 24, W - 24), y: clamp(target.y + Math.sin(singleAngle) * rand(18, 92), 42, H - 24) }
      : getDirectionalLanding(base, i, throws, 86, 168, 0.84);
    const tx = point.x;
    const ty = point.y;
    state.areas.push({
      kind: "flammable",
      x: tx,
      y: ty,
      radius: 56,
      damage: applyNewtonPassive(3.5 * state.stats.damage, null, tx, ty),
      explosionDamage: applyNewtonPassive(62 * state.stats.damage, null, tx, ty),
      tick: 0,
      life: 2.5,
      maxLife: 2.5,
    });
    state.particles.push({ kind: "flame_splash", x: tx, y: ty, radius: 24, life: 0.25, maxLife: 0.25 });
  }
}


function attackApple(level) {
  const count = (level >= 4 ? 2 : 1) + state.stats.projectiles;
  const target = findTarget();
  const baseDir = target ? Math.atan2(target.y - state.player.y, target.x - state.player.x) : getAimDirection();
  for (let i = 0; i < count; i += 1) {
    const singleAngle = Math.random() * Math.PI * 2;
    const point = count === 1 && target
      ? { x: clamp(target.x + Math.cos(singleAngle) * rand(0, 52), 28, W - 28), y: clamp(target.y + Math.sin(singleAngle) * rand(0, 44), 44, H - 28) }
      : getSeparatedLanding(baseDir, i, count, 92, 182, 0.82);
    const tx = point.x;
    const ty = point.y;
    state.falls.push({
      kind: "apple",
      x: tx,
      y: ty,
      height: 92,
      radius: level >= 3 ? 66 : 54,
      damage: applyNewtonPassive((level >= 2 ? 46 : 36) * state.stats.damage, null, tx, ty),
      knock: level >= 5 ? 16 : 4,
      life: getEffectDuration(0.72),
      maxLife: getEffectDuration(0.72),
      source: "apple",
    });
  }
}


function attackGravity() {
  const count = 2 + Math.min(1, state.stats.projectiles);
  const target = findTarget();
  for (let i = 0; i < count; i += 1) {
    const point = getSafeGravityPoint(target, i, count);
    state.falls.push({
      kind: "gravity",
      x: point.x,
      y: point.y,
      height: 110,
      radius: 102,
      damage: applyNewtonPassive(56 * state.stats.damage, null, point.x, point.y),
      knock: 22,
      pull: true,
      life: getEffectDuration(0.86),
      maxLife: getEffectDuration(0.86),
      source: "gravity",
    });
  }
}


function getSafeGravityPoint(target, index = 0, count = 1) {
  const p = state.player;
  const base = target ? Math.atan2(target.y - p.y, target.x - p.x) : getAimDirection();
  if (count > 1) {
    for (let tries = 0; tries < 8; tries += 1) {
      const point = getDirectionalLanding(base, index, count, 124, 230, 0.86);
      if (Math.hypot(point.x - p.x, point.y - p.y) >= 120) return point;
    }
  }
  for (let tries = 0; tries < 8; tries += 1) {
    const angle = Math.random() * Math.PI * 2;
    const baseX = target ? target.x : p.x;
    const baseY = target ? target.y : p.y;
    const x = clamp(baseX + Math.cos(angle) * rand(40, 130), 34, W - 34);
    const y = clamp(baseY + Math.sin(angle) * rand(36, 108), 50, H - 34);
    if (Math.hypot(x - p.x, y - p.y) >= 120) return { x, y };
  }
  const away = Math.atan2((target?.y ?? p.y + 1) - p.y, (target?.x ?? p.x + 1) - p.x);
  return {
    x: clamp(p.x + Math.cos(away) * 140, 34, W - 34),
    y: clamp(p.y + Math.sin(away) * 120, 50, H - 34),
  };
}


function attackLaser(level) {
  const p = state.player;
  const dir = getAimDirection();
  const baseBeams = level >= 5 ? 3 : level >= 3 ? 2 : 1;
  const beamCount = baseBeams + state.stats.projectiles;
  const spread = beamCount === 1 ? 0 : 0.18;
  const beams = Array.from({ length: beamCount }, (_, i) => (i - (beamCount - 1) / 2) * spread);
  const length = Math.hypot(W, H);
  const width = 5;
  const damage = (level >= 5 ? 13.5 : level >= 2 ? 11.5 : 9) * state.stats.damage;
  for (const offset of beams) {
    const beamDir = dir + offset;
    const finalDamage = applyNewtonPassive(damage, beamDir, p.x, p.y);
    state.slashes.push({ kind: "laser", x: p.x, y: p.y, dir: beamDir, length, width, life: 0.12, maxLife: 0.12, color: "rgba(116, 231, 255, 0.9)" });
    hitLineEnemies(p.x, p.y, beamDir, length, width, finalDamage, 5, "laser");
    if (level >= 4) {
      state.areas.push({
        kind: "afterglow",
        x: p.x + Math.cos(beamDir) * length * 0.5,
        y: p.y + Math.sin(beamDir) * length * 0.5,
        dir: beamDir,
        length,
        width: 13,
        damage: 4 * state.stats.damage,
        tick: 0,
        life: 0.42,
        maxLife: 0.42,
      });
    }
  }
}


function attackPrism() {
  const p = state.player;
  const dir = getAimDirection();
  const length = Math.hypot(W, H);
  const beamCount = 3 + state.stats.projectiles;
  const spread = beamCount === 1 ? 0 : 0.18;
  const beams = Array.from({ length: beamCount }, (_, i) => (i - (beamCount - 1) / 2) * spread);
  for (const offset of beams) {
    const beamDir = dir + offset;
    const firstDamage = applyNewtonPassive(14.5 * state.stats.damage, beamDir, p.x, p.y);
    const firstHit = hitFirstLineEnemy(p.x, p.y, beamDir, length, 6, firstDamage, 4, "prism");
    const visualLength = firstHit ? Math.hypot(firstHit.x - p.x, firstHit.y - p.y) : length;
    state.slashes.push({ kind: "laser", x: p.x, y: p.y, dir: beamDir, length: visualLength, width: 6, life: 0.18, maxLife: 0.18, color: "rgba(191, 245, 255, 0.95)" });
    if (!firstHit) continue;

    state.particles.push({ kind: "star_burst", x: firstHit.x, y: firstHit.y, radius: 30, life: 0.45, maxLife: 0.45 });
    const splitDirs = [beamDir - 0.42, beamDir, beamDir + 0.42];
    for (const splitDir of splitDirs) {
      const damage = applyNewtonPassive(16 * state.stats.damage, splitDir, firstHit.x, firstHit.y);
      const startX = firstHit.x + Math.cos(splitDir) * (firstHit.enemy.radius + 5);
      const startY = firstHit.y + Math.sin(splitDir) * (firstHit.enemy.radius + 5);
      state.slashes.push({ kind: "laser", x: firstHit.x, y: firstHit.y, dir: splitDir, length, width: 7, life: 0.28, maxLife: 0.28, color: "rgba(191, 245, 255, 0.9)" });
      hitLineEnemies(startX, startY, splitDir, length, 7, damage, 4, "prism");
    }
  }
}


function attackPea(level) {
  const p = state.player;
  const target = findTarget();
  const base = target ? Math.atan2(target.y - p.y, target.x - p.x) : Math.atan2(p.facingY, p.facingX);
  const count = 1 + state.stats.projectiles;
  const speed = (level >= 4 ? 300 : 250) * getProjectileSpeedMultiplier();
  const splitsLeft = level >= 5 ? 3 : 1;
  const damage = (level >= 2 ? 21 : 17) * state.stats.damage;
  firePeaBurst(p.x, p.y, base, count, {
    damage,
    speed,
    radius: 6,
    splitsLeft,
    splitChance: level >= 5 ? 0.45 : level >= 3 ? 0.4 : 0.35,
    splitChanceCap: 0.6,
    splitCount: level >= 5 ? 3 : 2,
    splitDamageScales: level >= 5 ? [0.8, 0.48, 0.28] : [0.8, 0.46],
    guaranteedSplits: level >= 5 ? 1 : 0,
    maxTotalSplits: level >= 5 ? 9 : 4,
    knock: level >= 3 ? 12 : 10,
    source: "pea",
    spread: 0.28,
    life: getEffectDuration(2.4),
  });
}


function attackSegregationLaw() {
  const p = state.player;
  const target = findTarget();
  const base = target ? Math.atan2(target.y - p.y, target.x - p.x) : Math.atan2(p.facingY, p.facingX);
  firePeaBurst(p.x, p.y, base, 2 + state.stats.projectiles, {
    damage: 20 * state.stats.damage,
    speed: 295 * getProjectileSpeedMultiplier(),
    radius: 8,
    splitsLeft: 3,
    splitChance: 0.42,
    splitChanceCap: 0.5,
    splitCount: 3,
    splitDamageScales: [0.68, 0.38, 0.2],
    guaranteedSplits: 1,
    maxTotalSplits: 9,
    knock: 12,
    source: "segregation_law",
    spread: 0.34,
    life: getEffectDuration(2.65),
  });
}


function attackPlanting(level) {
  createPlantPot(level, false);
}


function attackPureCross() {
  createPlantPot(5, true);
}


function createPlantPot(level, evolved) {
  const maxPlants = evolved ? 5 : level >= 4 ? 3 : 1;
  if (state.plants.length >= maxPlants) return;
  const p = state.player;
  const angle = Math.random() * Math.PI * 2;
  const distance = rand(90, 230);
  const x = clamp(p.x + Math.cos(angle) * distance, 34, W - 34);
  const y = clamp(p.y + Math.sin(angle) * distance, 50, H - 34);
  const life = (evolved ? getEffectDuration(24) : getEffectDuration(13)) * getSummonDurationMultiplier();
  state.plants.push({
    x,
    y,
    level,
    evolved,
    radius: evolved ? 28 : 22,
    growing: false,
    grown: false,
    grow: 0,
    growTime: evolved ? 1.75 : level >= 3 ? 2 : 3,
    life,
    ttl: 13,
    fire: 0,
  });
  state.particles.push({ kind: "sprout", x, y, radius: 16, life: 0.42, maxLife: 0.42 });
}


function updatePlantTurrets(dt) {
  if (!state.plants.length) return;
  const p = state.player;
  for (const plant of state.plants) {
    updateTelescopeAllyMagnify(plant, dt);
    if (!plant.grown) {
      const inRange = Math.hypot(plant.x - p.x, plant.y - p.y) <= 64;
      if (!plant.growing && !inRange) plant.ttl -= dt;
      if (inRange) {
        plant.growing = true;
        plant.ttl = 999;
        plant.grow += dt * (1 + ((state.avatarItemStats || {}).installGrowthSpeed || 0)) * getSummonPowerMultiplier();
        if (plant.grow >= plant.growTime) {
          plant.grown = true;
          plant.fire = 0.05;
          state.particles.push({ kind: "sprout", x: plant.x, y: plant.y, radius: plant.evolved ? 30 : 22, life: 0.55, maxLife: 0.55 });
        }
      } else if (plant.growing) {
        plant.grow = Math.max(0, plant.grow - dt * 0.85);
        if (plant.grow <= 0) {
          plant.growing = false;
          plant.ttl = Math.min(plant.ttl, 8);
        }
      }
      continue;
    }

    plant.life -= dt;
    plant.fire -= dt;
    if (plant.fire <= 0) {
      plant.fire = (plant.evolved ? 0.42 : 0.6) / getSummonPowerMultiplier();
      firePlantPea(plant);
    }
    if (plant.life <= 0 && !plant.withered) {
      plant.withered = true;
      if (plant.level >= 2) {
        state.gems.push({ kind: "heal_pea", x: plant.x, y: plant.y, value: 5, radius: 7, pull: false });
        state.particles.push({ kind: "sprout", x: plant.x, y: plant.y, radius: 18, life: 0.35, maxLife: 0.35 });
      }
    }
  }
  state.plants = state.plants.filter(plant => plant.grown ? plant.life > 0 : plant.ttl > 0);
}


function firePlantPea(plant) {
  const target = findTargetFrom(plant.x, plant.y);
  if (!target) return;
  const base = Math.atan2(target.y - plant.y, target.x - plant.x);
  const doubleShot = plant.evolved || plant.level >= 5;
  const count = doubleShot ? 2 : 1;
  const giant = plant.evolved && Math.random() < 0.18;
  firePeaBurst(plant.x, plant.y - 10, base, count, {
    damage: (giant ? 36 : plant.evolved ? 24 : 17) * state.stats.damage,
    speed: plant.evolved ? 320 : 280,
    radius: giant ? 11 : plant.evolved ? 7 : 6,
    splitsLeft: giant ? 2 : 1,
    splitCount: plant.evolved ? 3 : 2,
    splitDamageScales: plant.evolved ? [0.66, 0.44] : [0.58, 0.34],
    source: plant.evolved ? "pure_cross" : "planting",
    spread: 0.2,
    life: getEffectDuration(2.0),
    pierce: plant.evolved ? 1 : 0,
    kind: giant ? "giant_pea" : "pea",
  });
}


function firePeaBurst(x, y, base, count, options) {
  const spread = count === 1 ? 0 : options.spread;
  for (let i = 0; i < count; i += 1) {
    const angle = base + (i - (count - 1) / 2) * spread;
    state.projectiles.push({
      kind: options.kind || "pea",
      x: x + Math.cos(angle) * 10,
      y: y + Math.sin(angle) * 10,
      vx: Math.cos(angle) * options.speed,
      vy: Math.sin(angle) * options.speed,
      radius: options.radius,
      damage: applyNewtonPassive(options.damage, angle, x, y),
      life: options.life,
      pierce: options.pierce || 0,
      splitsLeft: options.splitsLeft,
      splitChance: options.splitChance ?? 1,
      splitChanceCap: options.splitChanceCap ?? 0.8,
      splitCount: options.splitCount,
      splitDamageScales: options.splitDamageScales || [0.6, 0.35],
      guaranteedSplits: options.guaranteedSplits || 0,
      maxTotalSplits: options.maxTotalSplits ?? 99,
      totalSplits: options.totalSplits || 0,
      knock: options.knock ?? 10,
      source: options.source,
      hit: new Set(),
    });
  }
}


function splitPeaProjectile(pr) {
  if ((pr.splitsLeft || 0) <= 0) return;
  if ((pr.totalSplits || 0) >= (pr.maxTotalSplits || 99)) return;
  const chance = applyCombatChance(pr.splitChance ?? 1, pr.splitChanceCap ?? 0.8);
  const guaranteed = (pr.guaranteedSplits || 0) > 0;
  if (!guaranteed && Math.random() >= chance) return;
  if (guaranteed) pr.guaranteedSplits -= 1;
  const pieces = pr.splitCount || 2;
  const base = Math.atan2(pr.vy, pr.vx);
  const spread = pr.splitsLeft > 1 ? 0.66 : 0.52;
  const scales = pr.splitDamageScales || [0.6, 0.35];
  const scaleIndex = Math.max(0, scales.length - pr.splitsLeft);
  const scale = scales[Math.min(scaleIndex, scales.length - 1)];
  const speed = Math.hypot(pr.vx, pr.vy) * 0.88;
  for (let i = 0; i < pieces; i += 1) {
    const angle = base + (i - (pieces - 1) / 2) * spread;
    state.projectiles.push({
      kind: "pea_split",
      x: pr.x + Math.cos(angle) * 8,
      y: pr.y + Math.sin(angle) * 8,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: Math.max(3, pr.radius * 0.72),
      damage: pr.damage * scale,
      life: getEffectDuration(1.25),
      pierce: 0,
      splitsLeft: pr.splitsLeft - 1,
      splitChance: pr.splitChance,
      splitChanceCap: pr.splitChanceCap,
      splitCount: pieces,
      splitDamageScales: scales,
      guaranteedSplits: pr.guaranteedSplits || 0,
      maxTotalSplits: pr.maxTotalSplits,
      totalSplits: (pr.totalSplits || 0) + 1,
      knock: Math.max(5, (pr.knock ?? 10) * 0.75),
      source: pr.source,
      hit: new Set(),
    });
  }
  state.particles.push({ kind: "sprout", x: pr.x, y: pr.y, radius: pr.radius + 8, life: 0.18, maxLife: 0.18 });
}


function attackCurrent(level) {
  const p = state.player;
  const target = findTarget();
  if (!target) return;
  const count = 1 + state.stats.projectiles;
  const base = Math.atan2(target.y - p.y, target.x - p.x);
  const speed = 330 * getProjectileSpeedMultiplier();
  const damage = (level >= 2 ? 18 : 14) * state.stats.damage;
  const chainRange = level >= 3 ? 118 : 92;
  const chainCount = level >= 5 ? 4 : level >= 3 ? 3 : 2;
  for (let i = 0; i < count; i += 1) {
    const angle = base + (i - (count - 1) / 2) * 0.18;
    state.projectiles.push({
      kind: "current",
      x: p.x,
      y: p.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 7,
      damage,
      chainDamage: damage * (level >= 5 ? 0.82 : 0.68),
      chainRange,
      chainCount,
      knock: 4,
      life: 1.4,
      hit: new Set(),
    });
  }
}


function attackLightning() {
  const target = findTarget();
  if (!target) return;
  const damage = 20 * state.stats.damage;
  state.particles.push({ kind: "electric_ring", x: state.player.x, y: state.player.y, radius: 78, life: 0.18, maxLife: 0.18 });
  state.particles.push({ kind: "electric", x: target.x, y: target.y, radius: 42, life: 0.26, maxLife: 0.26 });
  state.particles.push({
    kind: "electric_arc",
    x: state.player.x,
    y: state.player.y,
    x2: target.x,
    y2: target.y,
    heavy: true,
    life: 0.2,
    maxLife: 0.2,
  });
  chainElectricDamage(target, damage, 152, 6 + Math.min(2, state.stats.projectiles), "lightning", true);
  state.particles.push({ kind: "electric_ring", x: target.x, y: target.y, radius: 72, life: 0.26, maxLife: 0.26 });
  addScreenShake(0.07);
}


function attackMagnet(level) {
  const p = state.player;
  const dir = getAimDirection();
  state.areas.push({
    kind: "magnetic_field",
    x: p.x,
    y: p.y,
    dir,
    length: Math.hypot(W, H),
    width: level >= 2 ? 0.5 : 0.36,
    damage: 1.45 * state.stats.damage,
    force: level >= 3 ? 15 : 10,
    tick: 0.03,
    life: level >= 5 ? 0.56 : 0.36,
    maxLife: level >= 5 ? 0.56 : 0.36,
    source: "magnet",
  });
  state.particles.push({ kind: "magnetic_field", x: p.x, y: p.y, dir, radius: 120, life: 0.36, maxLife: 0.36 });
}


function attackMagneticStorm() {
  const p = state.player;
  const dir = getAimDirection();
  state.areas.push({
    kind: "magnetic_storm",
    x: p.x + Math.cos(dir) * 22,
    y: p.y + Math.sin(dir) * 22,
    vx: Math.cos(dir) * 135,
    vy: Math.sin(dir) * 135,
    dir,
    radius: 58,
    maxRadius: 142,
    damage: 6.5 * state.stats.damage,
    force: 20,
    tick: 0.05,
    life: 2.05,
    maxLife: 2.05,
    source: "magnetic_storm",
  });
  state.particles.push({ kind: "electric_ring", x: p.x, y: p.y, radius: 72, life: 0.34, maxLife: 0.34 });
}


function getSpreadAngle(base, index, count, spread = 0.74) {
  if (count <= 1) return base + rand(-0.18, 0.18);
  return base + (index - (count - 1) / 2) * spread + rand(-0.1, 0.1);
}


function getDirectionalLanding(base, index, count, minDistance, maxDistance, yScale = 0.9) {
  const p = state.player;
  const angle = getSpreadAngle(base, index, count, count >= 4 ? 0.56 : 0.76);
  const distance = rand(minDistance, maxDistance);
  return {
    x: clamp(p.x + Math.cos(angle) * distance, 28, W - 28),
    y: clamp(p.y + Math.sin(angle) * distance * yScale, 44, H - 28),
  };
}


function getSeparatedLanding(base, index, count, minDistance, maxDistance, yScale = 0.9) {
  if (count <= 1) return getDirectionalLanding(base, index, count, minDistance, maxDistance, yScale);
  const p = state.player;
  const distance = rand(minDistance, maxDistance);
  const patterns = count === 2
    ? [{ a: -1.05, d: 0.98 }, { a: 1.05, d: 0.98 }]
    : count === 3
      ? [{ a: 0, d: 1.08 }, { a: -1.28, d: 0.94 }, { a: 1.28, d: 0.94 }]
      : [
        { a: 0, d: 1.08 },
        { a: Math.PI, d: 0.7 },
        { a: -Math.PI / 2, d: 0.84 },
        { a: Math.PI / 2, d: 0.84 },
        { a: -0.86, d: 1.18 },
        { a: 0.86, d: 1.18 },
      ];
  const pattern = patterns[index % patterns.length];
  const extraRing = Math.floor(index / patterns.length);
  const angle = base + pattern.a + rand(-0.08, 0.08);
  const ring = distance * pattern.d + extraRing * 34;
  return {
    x: clamp(p.x + Math.cos(angle) * ring, 28, W - 28),
    y: clamp(p.y + Math.sin(angle) * ring * yScale, 44, H - 28),
  };
}


function updateNotebook(dt) {
  // Rotating notebook hits enemies along its orbit.
  const owned = state.weapons.find(w => w.id === "notebook" || w.id === "exam_cheatsheet");
  if (!owned) return;
  const p = state.player;
  const evolved = owned.id === "exam_cheatsheet";
  const level = owned.level;
  const count = evolved ? 4 + state.stats.projectiles : 1 + (level >= 2 ? 1 : 0) + (level >= 5 ? 1 : 0) + state.stats.projectiles;
  const orbit = evolved ? 96 : level >= 3 ? 88 : 74;
  const baseDamage = evolved ? 14 : level >= 3 ? 13 : level >= 2 ? 11.5 : 12.5;
  const damage = applyNewtonPassive(baseDamage * state.stats.damage);
  const previousAngle = state.notebookAngle;
  state.notebookAngle += dt * (evolved ? 3.35 : 2.9) * getAvatarOrbitSpeedMultiplier();
  const tickRate = evolved ? 0.18 : level >= 4 ? 0.2 : 0.28;
  owned.tick = Math.max(0, (owned.tick || 0) - dt);
  if (owned.tick > 0) return;
  owned.tick = tickRate;

  const fromAngle = owned.lastNotebookHitAngle ?? previousAngle;
  const toAngle = state.notebookAngle;
  const hitThisTick = new Set();
  for (let i = 0; i < count; i += 1) {
    sweepNotebookPath(p.x, p.y, orbit, fromAngle + (Math.PI * 2 * i) / count, toAngle + (Math.PI * 2 * i) / count, 15, damage, owned.id, hitThisTick);
  }
  owned.lastNotebookHitAngle = toAngle;
  triggerSuperpositionNotebook(owned, count, orbit, damage);
  sweepDeadEnemies();
}


function sweepNotebookPath(cx, cy, orbit, fromAngle, toAngle, hitRadius, damage, source, hitSet) {
  const delta = Math.abs(toAngle - fromAngle);
  const steps = Math.max(3, Math.ceil(delta * orbit / 18));
  for (let step = 0; step <= steps; step += 1) {
    const t = step / steps;
    const a = lerp(fromAngle, toAngle, t);
    const nx = cx + Math.cos(a) * orbit;
    const ny = cy + Math.sin(a) * orbit;
    for (const e of state.enemies) {
      if (hitSet.has(e) || e.hp <= 0) continue;
      if (Math.hypot(e.x - nx, e.y - ny) <= e.radius + hitRadius) {
        hitSet.add(e);
        hitEnemy(e, damage, 0, e.x - cx, e.y - cy, source);
      }
    }
  }
}


function calculateDirectionalBonus(attackDir) {
  if (!isNewtonCharacter()) return { multiplier: 1, label: "", color: "#ffffff" };
  const p = state.player;
  let multiplier = 1;
  let label = "";
  let color = "#ffffff";
  if (isPlayerMoving()) multiplier *= 1.1;
  if (p.stillTime >= 1) multiplier *= 0.9;

  if (Number.isFinite(attackDir)) {
    const move = getMovementDirection();
    const dot = Math.cos(attackDir) * move.x + Math.sin(attackDir) * move.y;
    if (dot > 0.65) {
      multiplier *= 1.2;
      label = "F = ma!";
      color = "#9ef7c5";
    } else if (dot < -0.65) {
      multiplier *= 0.7;
      label = "역가속";
      color = "#ff7777";
    }
  }
  return { multiplier, label, color };
}


function applyNewtonPassive(baseDamage, attackDir = null, x = state.player.x, y = state.player.y) {
  const bonus = calculateDirectionalBonus(attackDir);
  if (bonus.label && Math.random() < 0.35) {
    state.particles.push({ kind: "text", x, y: y - 18, text: bonus.label, color: bonus.color, life: 0.55, maxLife: 0.55 });
  }
  return baseDamage * bonus.multiplier;
}


function getWeaponCooldown(def, level) {
  let scale = Math.max(0.35, state.stats.cooldown);
  if ((def.id === "ruler" || def.id === "chalk") && level >= 5) scale *= 0.78;
  if (def.id === "ammonia" && level >= 5) scale *= 0.62;
  if (def.id === "continental_shift" && level >= 4) scale *= 0.78;
  if (def.id === "wave" && level >= 5) scale *= 0.82;
  if (def.id === "xray" && level >= 5) scale *= 0.82;
  if (def.id === "bell_sound" && level >= 2) scale *= 0.82;
  if ((def.id === "element_analysis" || def.id === "chemical_decomposition") && getElementBonus("analysisCooldown") > 0) scale *= 1 - getElementBonus("analysisCooldown");
  if (def.id === "carbon_bond") {
    const carbonCooldownScale = [1, 0.83, 0.69, 0.56, 0.42][clamp(level, 1, 5) - 1] || 1;
    scale *= carbonCooldownScale;
  }
  if (def.id === "vaccine" && level >= 4) scale *= 0.66;
  else if (def.id === "vaccine" && level >= 2) scale *= 0.8;
  return def.baseCooldown * scale;
}


const weaponUpgradeDescriptions = {
  ruler: { 2: "피해가 증가해 한 줄 베기의 처치력이 올라갑니다.", 3: "베기 길이가 늘어나 더 먼 적까지 닿습니다.", 4: "한 번 더 휘둘러 같은 방향 압박이 강해집니다.", 5: "쿨다운이 줄어 더 자주 베어냅니다." },
  ball: { 2: "속도와 피해가 증가해 튕김 압박이 강해집니다.", 3: "반사 횟수가 늘어나 더 오래 전장을 돌아다닙니다.", 4: "투사체가 1개 추가되어 여러 방향을 커버합니다.", 5: "속도가 크게 증가해 연속 충돌 빈도가 올라갑니다." },
  chalk: { 2: "피해가 증가해 단일 목표 처치력이 올라갑니다.", 3: "스플래시 반경이 넓어져 주변 적까지 맞춥니다.", 4: "관통이 추가되어 일직선 적을 더 많이 맞춥니다.", 5: "쿨다운이 줄어 분필을 더 자주 발사합니다." },
  ammonia: { 2: "오라 범위가 넓어져 접근하는 적을 더 일찍 녹입니다.", 3: "틱당 피해가 증가합니다.", 4: "오라 범위가 한 번 더 넓어집니다.", 5: "틱 간격이 짧아져 지속 피해가 더 촘촘해집니다." },
  notebook: { 2: "회전 노트가 1개 추가되어 빈틈이 줄어듭니다.", 3: "회전 궤도가 넓어져 더 먼 적을 맞춥니다.", 4: "타격 간격이 줄어 닿은 적에게 더 자주 피해를 줍니다.", 5: "회전 노트가 1개 더 추가됩니다." },
  flask: { 2: "장판 피해가 소폭 증가합니다.", 3: "장판 반경이 36에서 46으로 넓어집니다.", 4: "투척 수가 증가하고 캐릭터 기준 여러 방향에 장판을 만듭니다.", 5: "장판 지속시간이 늘어 공간 장악력이 올라갑니다." },
  apple: { 2: "낙하 피해가 증가합니다.", 3: "충돌 범위가 넓어져 더 많은 적을 맞춥니다.", 4: "사과 개수가 증가해 여러 방향에 떨어집니다.", 5: "충돌 시 약한 넉백이 추가됩니다." },
  laser: { 2: "레이저 피해가 소폭 증가합니다.", 3: "레이저가 2줄로 늘어 방향 압박이 강해집니다.", 4: "잔광이 남아 짧은 추가 피해를 줍니다.", 5: "레이저가 3줄로 늘어 넓은 각도를 커버합니다." },
  alcohol_lamp: { 2: "화상 지속시간이 증가합니다.", 3: "화염 범위가 넓어집니다.", 4: "화염 개수가 늘어 전방 커버가 좋아집니다.", 5: "연소가 강화되어 화상 운영이 강해집니다." },
  oxygen_tank: { 2: "산소 구름의 회복량이 증가합니다.", 3: "구름 범위가 넓어져 안전 구역이 커집니다.", 4: "구름 지속시간이 증가합니다.", 5: "산소 구름이 2개 생성됩니다." },
  pea: { 2: "완두콩 피해가 증가합니다.", 3: "확률 분열이 터졌을 때 조각 피해 효율이 좋아집니다.", 4: "투사체 속도가 증가합니다.", 5: "첫 분열이 1회 보장되고 최대 3단 확률 분열이 가능해집니다." },
  planting: { 2: "식물이 사라질 때 체력 회복 열매를 남깁니다.", 3: "식물 성장시간이 3초에서 2초로 줄어듭니다.", 4: "동시에 유지 가능한 화분 수가 증가합니다.", 5: "완성 식물이 2연발로 완두콩을 발사합니다." },
  fault_shift: { 2: "균열 피해가 증가하고 지층 불안정을 쌓습니다.", 3: "균열 길이가 늘어 더 먼 적까지 닿습니다.", 4: "균열 폭과 군집 이동 범위가 넓어집니다.", 5: "균열이 2갈래로 발생하고 여진 확률이 증가합니다." },
  continental_shift: { 2: "충격파 범위가 증가하고 지층 불안정을 붕괴시킵니다.", 3: "넉백 거리가 증가해 판게아 군집화가 쉬워집니다.", 4: "쿨다운이 감소합니다.", 5: "충격파가 2단으로 발생해 붕괴 기회가 늘어납니다." },
  current: { 2: "전류 피해가 증가합니다.", 3: "연쇄 범위가 증가하고 연쇄가 3회로 늘어납니다.", 4: "연쇄 안정성이 좋아집니다.", 5: "연쇄가 4회로 늘고 연쇄 피해 비율이 증가합니다." },
  magnet: { 2: "자기장 범위가 증가합니다.", 3: "적을 중앙선으로 정렬시키는 힘이 조금 강해집니다.", 4: "쿨다운이 감소합니다.", 5: "자기장 지속시간이 증가합니다." },
  germ: { 2: "감염 지속시간이 증가합니다.", 3: "전염 범위가 증가합니다.", 4: "감염 피해가 증가합니다.", 5: "감염 중첩이 가능해집니다." },
  vaccine: { 2: "방어막 재생 속도가 증가합니다.", 3: "막아내는 피해량이 15로 증가합니다.", 4: "방어막 재생 속도가 한 번 더 증가합니다.", 5: "막아내는 피해량이 20으로 증가합니다." },
  planet: { 2: "두 번째 궤도가 추가됩니다.", 3: "세 번째 궤도가 추가됩니다.", 4: "네 번째 궤도가 추가됩니다.", 5: "다섯 번째 궤도가 추가됩니다." },
  telescope: { 2: "관측선이 두꺼워지고 확대 범위가 증가합니다.", 3: "탄환 길이가 화면 끝까지 증가하고 더 많은 적을 확대합니다.", 4: "피해와 관측선 폭이 증가합니다.", 5: "광선 폭이 크게 증가해 대포 레이저처럼 길을 뚫습니다." },
  wave: { 2: "파동 마루의 피해가 소폭 증가합니다.", 3: "파동 폭이 넓어집니다.", 4: "파동 길이가 늘어 화면 끝 반사까지 이어지기 쉬워집니다.", 5: "파동 유지력이 증가해 공명 준비가 쉬워집니다." },
  schrodinger_cat: { 2: "접촉 피해와 물기 피해가 증가합니다.", 3: "죽은 고양이의 방사능 범위와 물기 피해가 증가합니다.", 4: "상태 전환이 안정되고 물기 피해가 증가합니다.", 5: "접촉 피해와 물기 피해가 크게 증가하고 슈뢰딩거의 고양이 진화가 가능해집니다." },
  xray: { 2: "촬영 사거리가 증가합니다.", 3: "촬영 각도가 넓어집니다.", 4: "피해와 방향 이상 효과가 증가합니다.", 5: "쿨다운이 줄고 붕괴 진화가 가능해집니다." },
  radioactive_material: { 2: "폭발 피해가 증가합니다.", 3: "폭발 반경이 넓어집니다.", 4: "투척 수가 증가해 여러 방향에 떨어집니다.", 5: "오염 구역이 방사능 단계를 확률적으로 추가 상승시키며 피폭 진화가 가능해집니다." },
  bell_sound: { 2: "쿨다운이 감소합니다.", 3: "원형 파동 반지름이 증가합니다.", 4: "피해량이 소폭 증가합니다.", 5: "2중 원형 파동이 발생하고 최면 진화가 가능해집니다." },
  dog: { 2: "짖기 범위가 증가합니다.", 3: "영역표시 지속시간이 증가합니다.", 4: "짖기 쿨다운이 감소합니다.", 5: "영역표시 회복과 피해가 증가하고 파블로프의 개 진화가 가능해집니다." },
  photoelectric_effect: { 2: "빛 탄환 피해가 증가합니다.", 3: "명중 시 미니 과학력 조각을 2개 떨어뜨립니다.", 4: "빛 탄환이 2발 발사됩니다.", 5: "명중 시 미니 과학력 조각을 3개 떨어뜨리고 태양전지 진화가 가능해집니다." },
  mass_conversion: { 2: "질량체 피해가 증가합니다.", 3: "한 번에 변환 가능한 조각 수가 증가합니다.", 4: "일반 과학력 조각도 질량 변환 재료로 사용할 수 있습니다.", 5: "충돌 시 큰 에너지 파동이 발생하고 E=mc² 진화가 가능해집니다." },
  fossil_hammer: { 2: "기본 피해가 증가하고 타격 반경이 44로 증가합니다.", 3: "타격 반경이 56으로 증가합니다.", 4: "타격 반경이 68로 증가하고 넉백이 강해집니다.", 5: "타격 반경이 80으로 증가하고 2연속 내려찍기가 발생합니다. 발굴 시 화석 조각을 2개 얻습니다." },
  ammonite: { 2: "암모나이트 피해가 증가합니다.", 3: "비행 반경과 지속시간이 증가합니다.", 4: "암모나이트가 2개 발사됩니다.", 5: "화석 지점 힌트 강화가 좋아지고 고대 바다 진화가 가능해집니다." },
  coding: { 2: "중간 코드 등장 확률이 증가합니다.", 3: "심화 코드 등장 확률이 증가합니다.", 4: "알고리즘 추천에 따라 상황 대응 코드가 더 자주 나옵니다.", 5: "기본·중간·심화 코드가 거의 균등하게 등장하고 프로그램 진화가 가능해집니다." },
  debugging: { 2: "동시 버그 대상이 3명으로 늘고 오류 피해가 증가합니다.", 3: "동시 버그 대상이 4명으로 늘며 짧은 정지와 이동 오류가 추가됩니다.", 4: "동시 버그 대상이 5명으로 늘고 10% 확률 해킹과 피해 전송이 추가됩니다.", 5: "동시 버그 대상이 6명으로 늘고 처치 시 더 큰 오류 파편이 폭발합니다." },
};