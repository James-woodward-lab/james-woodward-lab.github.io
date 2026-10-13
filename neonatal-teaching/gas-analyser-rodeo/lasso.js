(function () {
  "use strict";

  const CLOSE_PX = 28;
  const MIN_POINTS = 8;
  const MIN_PERIMETER = 80;

  function dist(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.hypot(dx, dy);
  }

  function perimeter(points) {
    let p = 0;
    for (let i = 1; i < points.length; i += 1) {
      p += dist(points[i - 1], points[i]);
    }
    return p;
  }

  function pointInPolygon(point, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
      const xi = polygon[i].x;
      const yi = polygon[i].y;
      const xj = polygon[j].x;
      const yj = polygon[j].y;
      const intersect =
        yi > point.y !== yj > point.y &&
        point.x < ((xj - xi) * (point.y - yi)) / (yj - yi + 0.00001) + xi;
      if (intersect) {
        inside = !inside;
      }
    }
    return inside;
  }

  function createLasso(playfield, svgOverlay, onComplete) {
    let drawing = false;
    let points = [];

    function clientToLocal(clientX, clientY) {
      const rect = playfield.getBoundingClientRect();
      return {
        x: clientX - rect.left,
        y: clientY - rect.top,
      };
    }

    function renderPath() {
      if (points.length < 2) {
        svgOverlay.innerHTML = "";
        return;
      }
      const d = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
      const start = points[0];
      const last = points[points.length - 1];
      const nearClose = points.length >= MIN_POINTS && dist(start, last) < CLOSE_PX * 2.5;
      svgOverlay.innerHTML = `
        <path d="${d}" fill="none" stroke="#1b0f08" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="${d}" fill="none" stroke="#9a6233" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="${d}" fill="none" stroke="#e7b871" stroke-width="2.5" stroke-dasharray="7 6" stroke-linecap="square" stroke-linejoin="round"/>
        <rect x="${(start.x - 7).toFixed(1)}" y="${(start.y - 7).toFixed(1)}" width="14" height="14"
          fill="${nearClose ? "#f2c14e" : "#1b0f08"}" stroke="#f2c14e" stroke-width="2"/>`;
    }

    function finishLasso() {
      drawing = false;
      playfield.classList.remove("is-lassoing");
      let closed =
        points.length >= MIN_POINTS &&
        perimeter(points) >= MIN_PERIMETER &&
        dist(points[0], points[points.length - 1]) < CLOSE_PX;
      if (
        !closed &&
        points.length >= MIN_POINTS &&
        perimeter(points) >= MIN_PERIMETER &&
        dist(points[0], points[points.length - 1]) < CLOSE_PX * 2.5
      ) {
        points.push({ x: points[0].x, y: points[0].y });
        closed = true;
      }
      const poly = closed ? points.slice() : [];
      svgOverlay.innerHTML = "";
      points = [];
      if (closed && onComplete) {
        onComplete(poly);
      }
    }

    function onPointerDown(e) {
      if (e.button !== 0 && e.pointerType === "mouse") {
        return;
      }
      playfield.setPointerCapture(e.pointerId);
      drawing = true;
      points = [clientToLocal(e.clientX, e.clientY)];
      playfield.classList.add("is-lassoing");
      renderPath();
      e.preventDefault();
    }

    function onPointerMove(e) {
      if (!drawing) {
        return;
      }
      const pt = clientToLocal(e.clientX, e.clientY);
      const last = points[points.length - 1];
      if (dist(last, pt) >= 4) {
        points.push(pt);
        renderPath();
      }
    }

    function onPointerUp(e) {
      if (!drawing) {
        return;
      }
      try {
        playfield.releasePointerCapture(e.pointerId);
      } catch (_err) {
        /* ignore */
      }
      finishLasso();
    }

    playfield.addEventListener("pointerdown", onPointerDown);
    playfield.addEventListener("pointermove", onPointerMove);
    playfield.addEventListener("pointerup", onPointerUp);
    playfield.addEventListener("pointercancel", onPointerUp);

    function hitTestCards(poly, cardElements) {
      const hits = [];
      cardElements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const pf = playfield.getBoundingClientRect();
        const cx = rect.left + rect.width / 2 - pf.left;
        const cy = rect.top + rect.height / 2 - pf.top;
        if (pointInPolygon({ x: cx, y: cy }, poly)) {
          hits.push({
            el,
            id: el.dataset.entityId,
            z: Number.parseInt(el.style.zIndex || "0", 10),
          });
        }
      });
      hits.sort((a, b) => b.z - a.z);
      return hits[0] || null;
    }

    return { hitTestCards, pointInPolygon };
  }

  window.GasRodeoLasso = {
    createLasso,
    pointInPolygon,
  };
})();
