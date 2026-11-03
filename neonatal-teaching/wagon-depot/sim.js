/*
 * The Wagon Depot - town simulation.
 *
 * Each CO2 wagon carries exactly one outlaw (H+) and one sheriff (HCO3-).
 * After a dwell inside the wagon the pair unloads: the outlaw runs deep into
 * town, the sheriff chases for a normally distributed time, catches it, and
 * both walk back to their own wagon, where they stay for a while before the
 * next run (H+ + HCO3- <-> H2CO3 <-> CO2 + H2O, back and forth).
 *
 * The town is driven toward target counts from the model:
 *   wagons   ~ PaCO2
 *   outlaws  ~ free H+ (pH)        (fraction of wagon pairs that are out)
 *   sheriffs ~ HCO3-
 *   held     ~ outlaws locked up by bunkhouse deputies (acute buffering)
 *
 * When a wagon is removed by the Marshal's patrol it recalls its pair first
 * and the three leave together. Posse outlaws have no wagon: when a sheriff
 * from the office catches one, the two walk to the depot and are gone
 * (acid + bicarbonate -> CO2, blown off).
 */
(function () {
  "use strict";

  const WAGON_W = 72;
  const WAGON_H = 44;
  const ACTOR_W = 26;
  const ACTOR_H = 34;

  const SPEED = {
    wagon: 160,
    outlawFree: 64,
    outlawTired: 22,
    sheriffChase: 92,
    returnPair: 80,
    walker: 70,
    posseRide: 220,
  };

  /* mean length of one wagon cycle (dwell + chase), seconds */
  const CYCLE_SECONDS = 11;
  const RETURN_SECONDS = 1.6;
  const MAX_ACTORS = 90;

  function clamp(v, lo, hi) {
    return Math.min(hi, Math.max(lo, v));
  }

  function randn() {
    let u = 0;
    let v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function normal(mean, sd, lo, hi) {
    return clamp(mean + sd * randn(), lo, hi);
  }

  function rand(lo, hi) {
    return lo + Math.random() * (hi - lo);
  }

  const SVG_NS = "http://www.w3.org/2000/svg";
  const XLINK_NS = "http://www.w3.org/1999/xlink";

  function makeUse(symbolId, className) {
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("class", className);
    svg.setAttribute("aria-hidden", "true");
    const use = document.createElementNS(SVG_NS, "use");
    use.setAttribute("href", `#${symbolId}`);
    use.setAttributeNS(XLINK_NS, "xlink:href", `#${symbolId}`);
    svg.appendChild(use);
    return svg;
  }

  let nextId = 1;

  class Town {
    constructor(els, options) {
      this.els = els;
      this.reducedMotion = Boolean(options && options.reducedMotion);
      this.speedScale = this.reducedMotion ? 0.55 : 1;

      this.targets = { wagons: 8, sheriffs: 12, outlaws: 8, held: 0 };
      this.wagons = [];
      this.actors = [];
      this.sheriffShown = 12;
      this.heldShown = 0;
      this.idleRendered = -1;

      this.running = false;
      this.paused = false;
      this.rafId = 0;
      this.lastTs = 0;
      this.clock = 0;
      this.nextWagonSpawn = 0;
      this.nextSheriffStep = 0;
      this.nextHeldStep = 0;
      this.nextDispatch = 0;
      this.onCounts = null;

      this.geom = {
        depotW: 600, depotH: 90, streetW: 600, streetH: 300,
        roam: { x0: 140, x1: 460, y0: 20, y1: 270 },
        bunkhouse: { x: 60, y: 120 }, office: { x: 540, y: 120 }, recruit: { x: 540, y: 40 },
      };
      this.resize();
    }

    /* ---------- geometry ---------- */
    resize() {
      const depot = this.els.depot;
      const street = this.els.street;
      const sRect = street.getBoundingClientRect();
      const bRect = this.els.bunkhouse.getBoundingClientRect();
      const oRect = this.els.office.getBoundingClientRect();
      const rRect = this.els.recruit.getBoundingClientRect();
      const depotW = depot.clientWidth || 600;
      const depotH = depot.clientHeight || 90;
      const streetW = street.clientWidth || 600;
      const streetH = street.clientHeight || 300;
      const rel = (rect) => ({
        x: rect.left - sRect.left + rect.width / 2,
        y: rect.top - sRect.top + rect.height - 6,
        left: rect.left - sRect.left,
        right: rect.right - sRect.left,
      });
      const bunk = rel(bRect);
      const office = rel(oRect);
      const recruit = rel(rRect);
      const x0 = clamp(bunk.right + 16, 20, streetW * 0.4);
      const x1 = clamp(office.left - 16 - ACTOR_W, streetW * 0.6, streetW - ACTOR_W - 8);
      this.geom = {
        depotW,
        depotH,
        streetW,
        streetH,
        roam: { x0, x1, y0: 12, y1: Math.max(60, streetH - ACTOR_H - 8) },
        bunkhouse: bunk,
        office,
        recruit,
      };
      this.layoutWagons();
    }

    layoutWagons() {
      const parked = this.wagons.filter((w) => w.state !== "leaving");
      const n = Math.max(1, parked.length);
      const pad = 16;
      const usable = this.geom.depotW - pad * 2 - WAGON_W;
      const step = n > 1 ? Math.min(WAGON_W + 14, usable / (n - 1)) : 0;
      const startX = n > 1 ? pad + (usable - step * (n - 1)) / 2 : (this.geom.depotW - WAGON_W) / 2;
      parked.forEach((w, i) => {
        w.slotX = startX + i * step;
      });
    }

    /* ---------- public ---------- */
    setTargets(t) {
      this.targets = {
        wagons: clamp(Math.round(t.wagons), 1, 30),
        sheriffs: clamp(Math.round(t.sheriffs), 0, 40),
        outlaws: clamp(Math.round(t.outlaws), 0, 60),
        held: clamp(Math.round(t.held), 0, 20),
      };
    }

    start() {
      if (this.running) return;
      this.running = true;
      this.lastTs = 0;
      this.rafId = requestAnimationFrame((ts) => this.frame(ts));
    }

    stop() {
      this.running = false;
      if (this.rafId) cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }

    setPaused(flag) {
      this.paused = Boolean(flag);
      this.els.street.classList.toggle("is-paused", this.paused);
      this.els.depot.classList.toggle("is-paused", this.paused);
    }

    /** A gang of outlaws rides in from the right: a metabolic acid load. */
    posse(n) {
      const count = clamp(Math.round(n), 1, 12);
      for (let i = 0; i < count; i += 1) {
        if (this.actors.length >= MAX_ACTORS) break;
        const y = rand(this.geom.roam.y0 + 20, this.geom.roam.y1 - 10);
        const a = this.spawnActor("outlaw", this.geom.streetW + 30 + i * 28, y);
        a.state = "posseRide";
        a.destX = rand(this.geom.roam.x0 + 20, this.geom.roam.x1 - 20);
        a.el.classList.add("is-riding");
      }
      this.flashBanner("Outlaw posse rides in!", "bad");
    }

    /** Extra sheriffs arrive by train: a metabolic alkali load. */
    sheriffTrain(n) {
      const count = clamp(Math.round(n), 1, 10);
      for (let i = 0; i < count; i += 1) {
        if (this.actors.length >= MAX_ACTORS) break;
        const a = this.spawnActor("sheriff", this.geom.recruit.x + rand(-20, 20), -20 - i * 22);
        a.state = "recruit";
        a.el.classList.add("is-riding");
      }
      this.flashBanner("Sheriff train pulls in!", "good");
    }

    counts() {
      let free = 0;
      let chasing = 0;
      this.actors.forEach((a) => {
        if (a.kind === "outlaw" && (a.state === "free" || a.state === "escape")) free += 1;
        if (a.kind === "sheriff" && (a.state === "chase" || a.state === "return")) chasing += 1;
      });
      const idle = Math.max(0, this.sheriffShown - chasing);
      return {
        wagons: this.wagons.filter((w) => w.state !== "leaving").length,
        freeOutlaws: free,
        chasingSheriffs: chasing,
        idleSheriffs: idle,
        sheriffs: idle + chasing,
        held: this.heldShown,
      };
    }

    flashBanner(text, kind) {
      const b = this.els.banner;
      if (!b) return;
      b.textContent = text;
      b.className = "town-banner";
      void b.offsetWidth;
      b.className = `town-banner show ${kind || ""}`;
    }

    /* ---------- timing ---------- */
    /** Fraction of wagon pairs that should be out of their wagon. */
    outFraction() {
      const wagons = Math.max(1, this.wagons.filter((w) => w.state === "parked" || w.state === "arriving").length);
      return clamp(this.targets.outlaws / wagons, 0.1, 0.95);
    }

    /** Time a pair rests inside the wagon before the next run. */
    dwellDuration() {
      const f = this.outFraction();
      const mean = Math.max(1.0, (1 - f) * CYCLE_SECONDS - RETURN_SECONDS);
      return normal(mean, 0.3 * mean, 0.7, 14);
    }

    /** Time the sheriff spends chasing before the catch. More sheriffs in town (a
     *  higher target for free outlaws relative to wagons) shortens this. */
    chaseDuration() {
      const f = this.outFraction();
      const mean = Math.max(1.8, f * CYCLE_SECONDS);
      return normal(mean, 0.35 * mean, 1.2, 16);
    }

    /* ---------- spawning ---------- */
    spawnWagon() {
      const el = document.createElement("div");
      el.className = "wagon is-arriving";
      el.appendChild(makeUse("px-wagon", "wagon-art"));
      const tag = document.createElement("span");
      tag.className = "wagon-tag";
      tag.textContent = "CO₂";
      el.appendChild(tag);
      this.els.wagonLayer.appendChild(el);
      const w = {
        id: nextId++,
        el,
        x: -WAGON_W - 10,
        y: Math.max(4, (this.geom.depotH - WAGON_H) / 2),
        slotX: 0,
        state: "arriving",
        occupied: true,
        pair: null,
        unloadAt: 0,
      };
      this.wagons.push(w);
      this.layoutWagons();
      return w;
    }

    /** The Marshal's patrol takes a wagon. Prefer one whose pair is aboard;
     *  otherwise recall the pair and wait for them. */
    retireWagon() {
      const parked = this.wagons.filter((w) => w.state === "parked");
      if (!parked.length) return;
      let w = null;
      for (let i = parked.length - 1; i >= 0; i -= 1) {
        if (parked[i].occupied) {
          w = parked[i];
          break;
        }
      }
      if (w) {
        this.departWagon(w);
        return;
      }
      w = parked[parked.length - 1];
      w.state = "boarding";
      w.el.classList.add("is-boarding");
      if (w.pair) {
        const s = w.pair.sheriff;
        if (s && s.state === "chase") s.catchAt = Math.min(s.catchAt, this.clock);
      }
    }

    departWagon(w) {
      w.state = "leaving";
      w.el.classList.remove("is-arriving", "is-boarding");
      w.el.classList.add("is-leaving");
      this.layoutWagons();
    }

    spawnActor(kind, x, y) {
      const el = makeUse(kind === "outlaw" ? "px-outlaw" : "px-sheriff", `actor ${kind}`);
      this.els.actorLayer.appendChild(el);
      const a = {
        id: nextId++,
        kind,
        el,
        x,
        y,
        dir: 1,
        state: "free",
        partner: null,
        wagon: null,
        catchAt: 0,
        retarget: 0,
        destX: x,
        destY: y,
      };
      this.actors.push(a);
      return a;
    }

    removeActor(a) {
      a.el.remove();
      const i = this.actors.indexOf(a);
      if (i >= 0) this.actors.splice(i, 1);
    }

    wagonExists(w) {
      return Boolean(w) && this.wagons.indexOf(w) >= 0;
    }

    /** Pick a roaming waypoint, biased away from the depot edge. */
    pickWaypoint(a) {
      const r = this.geom.roam;
      const depth = r.y1 - r.y0;
      a.destX = rand(r.x0, r.x1);
      a.destY = rand(r.y0 + depth * 0.3, r.y1);
    }

    /** A wagon unloads its outlaw and sheriff. */
    unload(w) {
      const sx = w.x + WAGON_W / 2 - ACTOR_W / 2;
      const outlaw = this.spawnActor("outlaw", sx - 10, -ACTOR_H + 6);
      outlaw.state = "escape";
      outlaw.wagon = w;
      this.pickWaypoint(outlaw);
      outlaw.retarget = this.clock + rand(2.5, 4.5);

      const sheriff = this.spawnActor("sheriff", sx + 10, -ACTOR_H + 2);
      sheriff.state = "chase";
      sheriff.wagon = w;
      sheriff.partner = outlaw;
      sheriff.catchAt = this.clock + this.chaseDuration();
      outlaw.partner = sheriff;

      w.pair = { outlaw, sheriff };
      w.occupied = false;
      w.el.classList.remove("is-flash");
      void w.el.offsetWidth;
      w.el.classList.add("is-unload");
      setTimeout(() => w.el.classList.remove("is-unload"), 350);
    }

    /** An idle sheriff leaves the office to chase a posse outlaw. */
    dispatch(outlaw) {
      const sheriff = this.spawnActor("sheriff", this.geom.office.x - ACTOR_W / 2, this.geom.office.y - ACTOR_H);
      sheriff.state = "chase";
      sheriff.partner = outlaw;
      sheriff.catchAt = this.clock + this.chaseDuration() * 0.7;
      outlaw.partner = sheriff;
    }

    nearestWagon(x) {
      let best = null;
      let bestD = Infinity;
      this.wagons.forEach((w) => {
        if (w.state === "leaving") return;
        const d = Math.abs(w.x + WAGON_W / 2 - x);
        if (d < bestD) {
          bestD = d;
          best = w;
        }
      });
      return best;
    }

    /** A pair has walked back into a wagon (or into the depot if they have none). */
    pairArrived(sheriff) {
      const w = sheriff.wagon;
      const outlaw = sheriff.partner;
      if (this.wagonExists(w)) {
        w.occupied = true;
        w.pair = null;
        w.unloadAt = this.clock + this.dwellDuration();
        w.el.classList.remove("is-flash");
        void w.el.offsetWidth;
        w.el.classList.add("is-flash");
        if (w.state === "boarding") this.departWagon(w);
      } else {
        const near = this.nearestWagon(sheriff.x);
        if (near) {
          near.el.classList.remove("is-flash");
          void near.el.offsetWidth;
          near.el.classList.add("is-flash");
        }
      }
      if (outlaw) this.removeActor(outlaw);
      this.removeActor(sheriff);
    }

    /* ---------- frame ---------- */
    frame(ts) {
      if (!this.running) return;
      if (!this.lastTs) this.lastTs = ts;
      const dt = Math.min(0.05, (ts - this.lastTs) / 1000);
      this.lastTs = ts;
      if (!this.paused) {
        this.clock += dt;
        this.tick(dt);
      }
      this.render();
      this.rafId = requestAnimationFrame((t) => this.frame(t));
    }

    tick(dt) {
      const sc = this.speedScale;
      const counts = this.counts();
      const free = counts.freeOutlaws;
      const g = this.geom;

      /* wagons: arrive and leave to match PaCO2 (boarding wagons count as gone) */
      const present = this.wagons.filter((w) => w.state === "arriving" || w.state === "parked").length;
      if (present < this.targets.wagons && this.clock >= this.nextWagonSpawn) {
        this.spawnWagon();
        this.nextWagonSpawn = this.clock + 0.35;
      } else if (present > this.targets.wagons && this.clock >= this.nextWagonSpawn) {
        this.retireWagon();
        this.nextWagonSpawn = this.clock + 0.35;
      }

      for (let i = this.wagons.length - 1; i >= 0; i -= 1) {
        const w = this.wagons[i];
        if (w.state === "leaving") {
          w.x += SPEED.wagon * sc * dt;
          if (w.x > g.depotW + WAGON_W) {
            if (w.pair) {
              if (w.pair.outlaw) this.removeActor(w.pair.outlaw);
              if (w.pair.sheriff) this.removeActor(w.pair.sheriff);
            }
            w.el.remove();
            this.wagons.splice(i, 1);
          }
          continue;
        }
        const dx = w.slotX - w.x;
        if (Math.abs(dx) > 1) {
          const step = Math.sign(dx) * Math.min(Math.abs(dx), SPEED.wagon * sc * dt);
          w.x += step;
        } else if (w.state === "arriving") {
          w.state = "parked";
          w.el.classList.remove("is-arriving");
          w.unloadAt = this.clock + this.dwellDuration() * rand(0.2, 1);
        }
        if (w.state === "parked" && w.occupied && this.clock >= w.unloadAt) {
          const allow = free < this.targets.outlaws + 2 && this.actors.length < MAX_ACTORS;
          if (allow) this.unload(w);
          else w.unloadAt = this.clock + 0.5;
        }
      }

      /* sheriff pool steps toward HCO3 target, with a walker for each change */
      if (this.clock >= this.nextSheriffStep && this.sheriffShown !== this.targets.sheriffs) {
        const up = this.targets.sheriffs > this.sheriffShown;
        this.sheriffShown += up ? 1 : -1;
        this.nextSheriffStep = this.clock + 0.35;
        if (this.actors.length < MAX_ACTORS) {
          if (up) {
            const a = this.spawnActor("sheriff", g.recruit.x - ACTOR_W / 2, g.recruit.y - ACTOR_H);
            a.state = "recruit";
          } else {
            const a = this.spawnActor("sheriff", g.office.x - ACTOR_W / 2, g.office.y - ACTOR_H);
            a.state = "leave";
          }
        }
      }

      /* bunkhouse deputies lock up outlaws during an acute surge */
      if (this.clock >= this.nextHeldStep && this.heldShown !== this.targets.held) {
        const up = this.targets.held > this.heldShown;
        this.heldShown += up ? 1 : -1;
        this.nextHeldStep = this.clock + 0.3;
        if (up && this.actors.length < MAX_ACTORS) {
          const w = this.nearestWagon(g.bunkhouse.x) || { x: g.depotW / 2 };
          const a = this.spawnActor("outlaw", w.x + WAGON_W / 2 - ACTOR_W / 2, -ACTOR_H + 6);
          a.state = "toBunkhouse";
        }
      }

      /* sheriffs from the office go after posse outlaws (the ones with no wagon) */
      if (this.clock >= this.nextDispatch) {
        this.nextDispatch = this.clock + 0.6;
        if ((counts.idleSheriffs > 0 || free > this.targets.outlaws) && this.actors.length < MAX_ACTORS) {
          const loose = this.actors.find((a) => a.kind === "outlaw" && a.state === "free" && !a.partner);
          if (loose) this.dispatch(loose);
        }
      }

      /* too many outlaws for the pH: chases wrap up sooner */
      const surplus = free - this.targets.outlaws;
      const hurry = surplus > 1 ? 1 + Math.min(3, (surplus - 1) * 0.5) : 1;

      for (let i = this.actors.length - 1; i >= 0; i -= 1) {
        const a = this.actors[i];
        if (a.kind === "outlaw") this.tickOutlaw(a, dt, sc);
        else this.tickSheriff(a, dt, sc, hurry);
      }

      if (this.onCounts) this.onCounts(this.counts());
    }

    tickOutlaw(a, dt, sc) {
      const g = this.geom;
      const late = a.partner && a.partner.state === "chase" && this.clock >= a.partner.catchAt;
      const speed = (late ? SPEED.outlawTired : SPEED.outlawFree) * sc * dt;

      if (a.state === "escape") {
        /* first dash: straight from the wagon to a spot deep in town */
        if (this.moveToward(a, a.destX, a.destY, speed)) {
          a.state = "free";
          a.retarget = 0;
        }
        return;
      }
      if (a.state === "free") {
        const arrived = Math.hypot(a.destX - a.x, a.destY - a.y) < 4;
        if (arrived || this.clock >= a.retarget) {
          this.pickWaypoint(a);
          a.retarget = this.clock + rand(2.5, 5);
        }
        this.moveToward(a, a.destX, a.destY, speed);
        return;
      }
      if (a.state === "posseRide") {
        a.x -= SPEED.posseRide * sc * dt;
        a.dir = -1;
        if (a.x <= a.destX) {
          a.state = "free";
          a.el.classList.remove("is-riding");
          this.pickWaypoint(a);
          a.retarget = this.clock + rand(2.5, 5);
        }
        return;
      }
      if (a.state === "toBunkhouse") {
        const tx = g.bunkhouse.x - ACTOR_W / 2;
        const ty = g.bunkhouse.y - ACTOR_H;
        if (this.moveToward(a, tx, ty, SPEED.sheriffChase * sc * dt)) {
          this.removeActor(a);
        }
        return;
      }
      if (a.state === "caught") {
        if (!a.partner || this.actors.indexOf(a.partner) < 0) {
          this.removeActor(a);
          return;
        }
        a.x = a.partner.x - 14 * a.partner.dir;
        a.y = a.partner.y + 2;
        a.dir = a.partner.dir;
      }
    }

    tickSheriff(a, dt, sc, hurry) {
      const g = this.geom;
      if (a.state === "chase") {
        const o = a.partner;
        if (!o || this.actors.indexOf(o) < 0) {
          a.partner = null;
          if (this.wagonExists(a.wagon)) {
            a.state = "return";
            a.destY = -ACTOR_H + 8;
          } else {
            a.state = "leave";
          }
          return;
        }
        const late = this.clock - a.catchAt;
        if (hurry > 1 && late < 0) a.catchAt -= dt * (hurry - 1);
        const speed = SPEED.sheriffChase * sc * (late > 0 ? 1.6 : 1) * (hurry > 1 ? 1.25 : 1);
        const dist = Math.hypot(o.x - a.x, o.y - a.y);
        if (dist < 34 && late >= 0) {
          a.state = "return";
          o.state = "caught";
          a.destY = -ACTOR_H + 8;
          a.el.classList.add("is-escorting");
          return;
        }
        /* trail the outlaw at a short distance until the catch is due */
        const keep = late < 0 ? 30 : 0;
        const ang = Math.atan2(o.y - a.y, o.x - a.x);
        const want = Math.max(0, dist - keep);
        const step = Math.min(want, speed * dt);
        a.x += Math.cos(ang) * step;
        a.y += Math.sin(ang) * step;
        if (step > 0.05) a.dir = Math.cos(ang) >= 0 ? 1 : -1;
        return;
      }
      if (a.state === "return") {
        let tx;
        if (this.wagonExists(a.wagon)) {
          tx = a.wagon.x + WAGON_W / 2 - ACTOR_W / 2;
        } else {
          const near = this.nearestWagon(a.x);
          tx = near ? near.x + WAGON_W / 2 - ACTOR_W / 2 : g.depotW / 2;
        }
        if (this.moveToward(a, tx, a.destY, SPEED.returnPair * sc * dt)) {
          this.pairArrived(a);
        }
        return;
      }
      if (a.state === "recruit") {
        const tx = g.office.x - ACTOR_W / 2;
        const ty = g.office.y - ACTOR_H;
        if (this.moveToward(a, tx, ty, SPEED.walker * sc * dt)) {
          this.removeActor(a);
        }
        return;
      }
      if (a.state === "leave") {
        const tx = g.recruit.x - ACTOR_W / 2;
        const ty = g.recruit.y - ACTOR_H;
        if (this.moveToward(a, tx, ty, SPEED.walker * sc * dt)) {
          this.removeActor(a);
        }
      }
    }

    moveToward(a, tx, ty, step) {
      const dx = tx - a.x;
      const dy = ty - a.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= step || dist < 1) {
        a.x = tx;
        a.y = ty;
        return true;
      }
      a.x += (dx / dist) * step;
      a.y += (dy / dist) * step;
      a.dir = dx >= 0 ? 1 : -1;
      return false;
    }

    /* ---------- render ---------- */
    render() {
      this.wagons.forEach((w) => {
        w.el.style.transform = `translate(${w.x.toFixed(1)}px, ${w.y.toFixed(1)}px)`;
        if (w.occupied !== w._occupied) {
          w._occupied = w.occupied;
          w.el.classList.toggle("is-occupied", w.occupied);
        }
      });
      this.actors.forEach((a) => {
        a.el.style.transform = `translate(${a.x.toFixed(1)}px, ${a.y.toFixed(1)}px) scaleX(${a.dir})`;
        const moving = a.state !== "caught";
        if (moving !== a._moving) {
          a._moving = moving;
          a.el.classList.toggle("is-moving", moving);
        }
      });
      const c = this.counts();
      if (c.idleSheriffs !== this.idleRendered) {
        this.idleRendered = c.idleSheriffs;
        const grid = this.els.officeGrid;
        let html = "";
        const shown = Math.min(c.idleSheriffs, 30);
        for (let i = 0; i < shown; i += 1) {
          html += '<svg class="actor sheriff idle" aria-hidden="true"><use href="#px-sheriff"/></svg>';
        }
        grid.innerHTML = html;
        if (this.els.officeCount) this.els.officeCount.textContent = String(c.idleSheriffs);
      }
      if (this.els.bunkhouseCount) {
        const txt = String(this.heldShown);
        if (this.els.bunkhouseCount.textContent !== txt) this.els.bunkhouseCount.textContent = txt;
      }
    }
  }

  window.WagonDepotTown = Town;
})();
