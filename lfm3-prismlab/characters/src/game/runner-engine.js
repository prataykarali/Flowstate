import { Obstacle, OBSTACLE_TYPES } from './obstacles.js';
import { playJumpSfx, playDodgeSfx, playMilestoneSfx, playGameOverSfx } from '../audio/music.js';

export class RunnerEngine {
  constructor(options) {
    this.character = options.character;
    this.container = options.container;
    this.sceneSvg = options.sceneSvg;
    this.mascotGroup = options.mascotGroup;
    this.obstaclesGroup = options.obstaclesGroup;
    this.groundGroup = options.groundGroup;
    this.cloudsGroup = options.cloudsGroup;
    this.hillsGroup = options.hillsGroup;
    this.onScoreUpdate = options.onScoreUpdate;
    this.onMilestone = options.onMilestone;
    this.onGameOver = options.onGameOver;
    this.onJumpSuccess = options.onJumpSuccess;
    this.onNewBest = options.onNewBest;

    // Viewport dimensions
    this.width = options.width || 760;
    this.height = options.height || 280;
    this.groundY = 220;

    // Mascot Physics
    this.mascotX = 68;
    this.mascotScale = 0.52;
    this.mascotOrbBottom = 144;
    this.baseMascotY = this.groundY - this.mascotOrbBottom * this.mascotScale;
    this.mascotY = this.baseMascotY;
    this.mascotWidth = 96 * this.mascotScale;
    this.mascotHeight = 96 * this.mascotScale;
    this.vy = 0;
    this.gravity = 980; // px / s^2
    this.jumpForce = -460; // px / s
    this.isGrounded = true;
    this.isJumping = false;
    this.isDodging = false;
    this.isDead = false;
    this.isPaused = false;
    this.hasStarted = false;
    this.landSquash = 0;
    this.demoMode = Boolean(options.demoMode || false);

    // Running stride loop animation timer
    this.runCycleTime = 0;

    // Game loop & Speed
    this.baseSpeed = 205;
    this.currentSpeed = this.baseSpeed;
    this.score = 0;
    this.bestScore = this.loadBestScore();
    this.lastMilestone = 0;

    // Obstacles
    this.obstacles = [];
    this.nextSpawnTime = 1.3;
    this.spawnTimer = 0;

    // Dino-style Ground Terrain details (pebbles, terrain marks)
    this.terrainElements = [];
    this.initTerrain();
    this.groundOffset = 0;
    this.hillsOffset = 0;
    this.tileWidth = this.width;

    // Parallax Clouds / Ambient Dust
    this.clouds = [];
    this.initClouds();
    this.setupSceneLayers();

    // Timing
    this.lastTime = 0;
    this.animFrameId = null;
    this.stateTimers = new Set();

    // Setup initial pose
    this.updateMascotTransform();
    this.character.setLocomotion('idle');

    if (this.demoMode) {
      this.start();
    }
  }

  setDemoMode(enabled) {
    this.demoMode = Boolean(enabled);
    if (this.demoMode) {
      if (this.isDead) {
        this.restart();
      } else if (!this.hasStarted) {
        this.start();
      } else if (this.isPaused) {
        this.resume();
      }
    }
  }

  loadBestScore() {
    try {
      const stored = localStorage.getItem(`prismlab_best_${this.character.id}`);
      return stored ? parseInt(stored, 10) : 0;
    } catch (e) {
      return 0;
    }
  }

  saveBestScore() {
    const score = Math.floor(this.score);
    if (score <= this.bestScore) return;
    this.bestScore = score;
    try { localStorage.setItem(`prismlab_best_${this.character.id}`, String(score)); } catch (e) {}
  }

  initTerrain() {
    // Generate scattered pebbles and terrain dashes similar to Dino
    for (let x = 0; x < this.width + 60; x += 35 + Math.random() * 40) {
      this.terrainElements.push({
        x: x,
        y: this.groundY + 4 + Math.random() * 12,
        width: 3 + Math.random() * 6,
        type: Math.random() > 0.4 ? 'dash' : 'dot'
      });
    }
  }

  initClouds() {
    // Generate 3 faint distant floating clouds / nebula clusters
    for (let i = 0; i < 3; i++) {
      this.clouds.push({
        x: 60 + i * 260 + Math.random() * 60,
        y: 40 + Math.random() * 50,
        speedFactor: 0.15 + Math.random() * 0.1,
        width: 48 + Math.random() * 24
      });
    }
  }

  setupSceneLayers() {
    if (this.groundGroup) {
      this.groundGroup.innerHTML = `
        <rect x="0" y="${this.groundY}" width="${this.width}" height="60" fill="#24143d" />
        <g class="terrain-tiles">
          <image href="/assets/runner-ground-bricks.png" x="0" y="${this.groundY}" width="${this.tileWidth}" height="60" preserveAspectRatio="none" />
          <image href="/assets/runner-ground-bricks.png" x="${this.tileWidth}" y="${this.groundY}" width="${this.tileWidth}" height="60" preserveAspectRatio="none" />
        </g>
        <line x1="0" y1="${this.groundY}" x2="${this.width}" y2="${this.groundY}" stroke="#e9d5ff" stroke-width="2" opacity=".9" />
        <g class="terrain-details"></g>`;
      this.tileGroup = this.groundGroup.querySelector('.terrain-tiles');
      const details = this.groundGroup.querySelector('.terrain-details');
      this.terrainNodes = this.terrainElements.map(item => {
        const node = document.createElementNS('http://www.w3.org/2000/svg', item.type === 'dash' ? 'line' : 'circle');
        if (item.type === 'dash') {
          node.setAttribute('stroke', '#f0abfc');
          node.setAttribute('stroke-width', '1.6');
          node.setAttribute('stroke-linecap', 'round');
        } else {
          node.setAttribute('r', '1.4');
          node.setAttribute('fill', '#ffffff');
        }
        node.setAttribute('opacity', item.type === 'dash' ? '.75' : '.85');
        details.appendChild(node);
        return node;
      });
      this.updateTerrain(0);
    }
    if (this.cloudsGroup) {
      this.cloudsGroup.innerHTML = this.clouds.map(() => `
        <g opacity=".35">
          <ellipse cx="20" cy="12" rx="18" ry="8" fill="#7c3aed" />
          <ellipse cx="32" cy="10" rx="14" ry="7" fill="#a855f7" />
          <ellipse cx="24" cy="11" rx="12" ry="5" fill="#f0abfc" />
        </g>`).join('');
      this.cloudNodes = [...this.cloudsGroup.children];
      this.updateClouds(0);
    }
  }

  start() {
    this.isPaused = false;
    this.isDead = false;
    this.hasStarted = true;
    this.character.setLocomotion('run');
    this.lastTime = performance.now();
    this.animFrameId = requestAnimationFrame(this.loop.bind(this));
  }

  scheduleState(callback, delay) {
    const timer = setTimeout(() => {
      this.stateTimers.delete(timer);
      if (this.hasStarted && !this.isDead) callback();
    }, delay);
    this.stateTimers.add(timer);
  }

  clearStateTimers() {
    this.stateTimers.forEach(clearTimeout);
    this.stateTimers.clear();
  }

  dodge(isDodging = true) {
    if (this.isDead || this.isPaused) return;

    if (isDodging) {
      if (!this.isDodging) {
        this.isDodging = true;
        playDodgeSfx();
        // If mid-air, fast fall downwards!
        if (!this.isGrounded) {
          this.vy += 850;
        }
        this.character.setLocomotion('dodge');
      }
    } else {
      if (this.isDodging) {
        this.isDodging = false;
        if (this.isGrounded && !this.isDead) {
          this.character.setLocomotion('run');
        }
      }
    }
  }

  jump() {
    if (this.isDead || this.isPaused) return;

    if (this.isGrounded) {
      this.isGrounded = false;
      this.isJumping = true;
      this.isDodging = false;
      this.vy = this.jumpForce;
      playJumpSfx();
      this.character.setLocomotion('jump');
    }
  }

  loop(timestamp) {
    if (this.isPaused) return;

    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
    this.lastTime = timestamp;

    if (!this.isDead) {
      this.update(dt);
    }

    if (!this.isDead) {
      this.animFrameId = requestAnimationFrame(this.loop.bind(this));
    }
  }

  update(dt) {
    // 1. Difficulty progression
    this.currentSpeed = this.baseSpeed + Math.min(Math.floor(this.score / 80) * 10, 180);

    // 2. Score
    this.score += dt * 18 * (this.currentSpeed / this.baseSpeed);
    const displayScore = Math.floor(this.score);
    if (this.onScoreUpdate) {
      this.onScoreUpdate(displayScore, Math.max(displayScore, this.bestScore));
    }

    // 3. Score tracking without frequent popup interruptions
    const currentMilestone = Math.floor(this.score / 100);
    if (currentMilestone > this.lastMilestone) {
      this.lastMilestone = currentMilestone;
    }

    // 4. Running Stride & Bobbing Loop or Dodge Flat Slide
    if (this.isGrounded) {
      if (this.isDodging) {
        // Flat dodge slide along the ground
        this.mascotGroup?.setAttribute(
          'transform',
          `translate(${this.mascotX}, ${this.mascotY + 12}) scale(${this.mascotScale * 1.34}, ${this.mascotScale * 0.65})`
        );
      } else {
        this.runCycleTime += dt * (this.currentSpeed / 50);
        const bobY = Math.sin(this.runCycleTime * 4) * 3;
        const squashScale = 1 + Math.sin(this.runCycleTime * 4) * 0.03;
        const scaleX = this.mascotScale * squashScale * (1 + (this.landSquash || 0) * 0.15);
        const scaleY = (this.mascotScale / squashScale) * (1 - (this.landSquash || 0) * 0.1);
        if (this.mascotGroup) {
          this.mascotGroup.setAttribute(
            'transform',
            `translate(${this.mascotX}, ${this.mascotY + bobY}) scale(${scaleX}, ${scaleY})`
          );
        }
        this.landSquash = Math.max(0, (this.landSquash || 0) * 0.88);
      }
    } else {
      // 5. Airborne Mascot Physics
      this.vy += this.gravity * dt;
      this.mascotY += this.vy * dt;

      // Airborne rotation tilt
      const tiltDeg = Math.max(-15, Math.min(15, this.vy * 0.018));

      // Landing check
      if (this.mascotY >= this.baseMascotY) {
        this.mascotY = this.baseMascotY;
        this.vy = 0;
        this.isGrounded = true;
        this.isJumping = false;
        this.landSquash = 0.2;

        // Ground landing squash
        if (this.isDodging) {
          this.character.setLocomotion('dodge');
        } else {
          this.character.setLocomotion('land');
          this.scheduleState(() => {
            if (!this.isDead && this.isGrounded && !this.isDodging) {
              this.character.setLocomotion('run');
            }
          }, 90);
        }
        this.updateMascotTransform();
      } else {
        if (this.mascotGroup) {
          this.mascotGroup.setAttribute(
            'transform',
            `translate(${this.mascotX}, ${this.mascotY}) rotate(${tiltDeg} ${this.mascotX + 45} ${this.mascotY + 40}) scale(${this.mascotScale})`
          );
        }
      }
    }

    // 6. Update Terrain & Parallax Clouds
    this.updateTerrain(dt);
    this.updateHills(dt);
    this.updateClouds(dt);

    // 7. Obstacles management
    this.spawnTimer += dt;
    if (this.spawnTimer >= this.nextSpawnTime) {
      this.spawnObstacle();
      this.spawnTimer = 0;
      const speedFactor = this.baseSpeed / this.currentSpeed;
      this.nextSpawnTime = (1.1 + Math.random() * 1.1) * speedFactor;
    }

    // Demo mode AI look-ahead
    if (this.demoMode && !this.isDead) {
      for (const obs of this.obstacles) {
        const dist = obs.x - this.mascotX;
        if (dist > 0 && dist < 120) {
          if (obs.type === 'floating-cube') {
            if (this.isGrounded && !this.isDodging) this.dodge(true);
          } else {
            if (this.isGrounded && !this.isJumping) this.jump();
          }
          break;
        }
        if (dist > 0 && dist > 140 && this.isDodging) {
          this.dodge(false);
        }
      }
    }

    // Move & collide obstacles
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.update(dt, this.currentSpeed);

      const el = this.obstaclesGroup?.querySelector(`#${obs.id}`);
      if (el) {
        el.setAttribute('transform', `translate(${obs.x}, ${obs.y})`);
      }

      if (this.checkCollision(obs)) {
        this.handleGameOver();
        return;
      }

      if (obs.x < -60) {
        if (el) el.remove();
        this.obstacles.splice(i, 1);
      }
      if (!obs.passed && obs.getBounds().right < this.mascotX + 42 * this.mascotScale) {
        obs.passed = true;
        if (this.isJumping) {
          this.character.setEmotion?.('happy');
          this.onJumpSuccess?.();
        }
      }
    }
  }

  updateMascotTransform(tiltDeg = 0) {
    if (this.mascotGroup) {
      const rot = tiltDeg ? ` rotate(${tiltDeg} ${this.mascotX + 45} ${this.mascotY + 40})` : '';
      this.mascotGroup.setAttribute('transform', `translate(${this.mascotX}, ${this.mascotY})${rot} scale(${this.mascotScale})`);
    }
  }

  updateTerrain(dt) {
    if (!this.groundGroup) return;

    this.groundOffset = (this.groundOffset + this.currentSpeed * dt) % this.tileWidth;

    // Move pebbles and terrain dashes
    for (let i = 0; i < this.terrainElements.length; i++) {
      const item = this.terrainElements[i];
      item.x -= this.currentSpeed * dt;
      if (item.x < -20) {
        item.x = this.width + 10 + Math.random() * 30;
        item.y = this.groundY + 4 + Math.random() * 14;
      }
    }

    this.tileGroup?.setAttribute('transform', `translate(${-this.groundOffset}, 0)`);
    this.terrainElements.forEach((item, index) => {
      const node = this.terrainNodes[index];
      if (!node) return;
      if (item.type === 'dash') {
        node.setAttribute('x1', item.x);
        node.setAttribute('x2', item.x + item.width);
        node.setAttribute('y1', item.y);
        node.setAttribute('y2', item.y);
      } else {
        node.setAttribute('cx', item.x);
        node.setAttribute('cy', item.y);
      }
    });
  }

  updateClouds(dt) {
    if (!this.cloudsGroup) return;

    for (const [index, cloud] of this.clouds.entries()) {
      cloud.x -= this.currentSpeed * cloud.speedFactor * dt;
      if (cloud.x < -60) {
        cloud.x = this.width + 40;
        cloud.y = 35 + Math.random() * 55;
      }

      this.cloudNodes[index]?.setAttribute('transform', `translate(${cloud.x}, ${cloud.y})`);
    }
  }

  updateHills(dt) {
    if (!this.hillsGroup) return;
    this.hillsOffset = (this.hillsOffset + this.currentSpeed * dt * .06) % this.width;
    this.hillsGroup.setAttribute('transform', `translate(${-this.hillsOffset}, 0)`);
  }

  spawnObstacle() {
    const type = OBSTACLE_TYPES[Math.floor(Math.random() * OBSTACLE_TYPES.length)];
    const obs = new Obstacle(type, this.width + 20, this.groundY, this.currentSpeed);
    this.obstacles.push(obs);

    const svgNode = obs.renderSvg();
    this.obstaclesGroup?.appendChild(svgNode);
  }

  checkCollision(obs) {
    const oBounds = obs.getBounds();
    const pad = 10;
    // When dodging, mascot height drops so it ducks safely under hovering logic cubes
    const effectiveHeight = this.isDodging ? (20 * this.mascotScale) : (68 * this.mascotScale);
    const mTop = this.isDodging ? this.groundY - effectiveHeight : this.mascotY + 52 * this.mascotScale;
    const mLeft = this.mascotX + 42 * this.mascotScale + pad;
    const mRight = this.mascotX + 138 * this.mascotScale - pad;
    const mBottom = this.isDodging ? this.groundY - 2 : this.mascotY + 139 * this.mascotScale;

    return !(
      mRight < oBounds.left ||
      mLeft > oBounds.right ||
      mBottom < oBounds.top ||
      mTop > oBounds.bottom
    );
  }

  handleGameOver() {
    this.isDead = true;
    playGameOverSfx();
    const newBest = Math.floor(this.score) > this.bestScore;
    this.saveBestScore();
    this.character.setLocomotion('hurt');
    if (newBest) this.onNewBest?.(this.bestScore);

    if (this.onGameOver) {
      this.onGameOver(Math.floor(this.score), this.bestScore);
    }
  }

  pause() {
    this.isPaused = true;
    this.clearStateTimers();
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  resume() {
    if (!this.hasStarted || !this.isPaused || this.isDead) return;
    this.isPaused = false;
    if (this.isGrounded && !this.isDodging) this.character.setLocomotion('run');
    this.lastTime = performance.now();
    this.animFrameId = requestAnimationFrame(this.loop.bind(this));
  }

  restart() {
    this.pause();
    this.clearStateTimers();
    this.obstacles.forEach(obs => {
      const el = this.obstaclesGroup?.querySelector(`#${obs.id}`);
      if (el) el.remove();
    });
    this.obstacles = [];
    this.score = 0;
    this.lastMilestone = 0;
    this.spawnTimer = 0;
    this.isDodging = false;
    this.mascotY = this.baseMascotY;
    this.vy = 0;
    this.isGrounded = true;
    this.isJumping = false;
    this.isDead = false;
    this.landSquash = 0;
    this.currentSpeed = this.baseSpeed;
    this.hillsOffset = 0;

    this.character.setLocomotion('run');
    this.updateMascotTransform();
    this.start();
  }

  destroy() {
    this.pause();
    this.clearStateTimers();
    this.hasStarted = false;
    this.obstacles.forEach(obs => {
      const el = this.obstaclesGroup?.querySelector(`#${obs.id}`);
      if (el) el.remove();
    });
    this.obstacles = [];
  }
}
