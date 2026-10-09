const LABELS = { japanese: "Japan", chinese: "China" };
const FLAG = { japanese: "#flag-jp", chinese: "#flag-cn" };
const REVEAL_MS = 450;
const SWIPE_PX = 90;

const $ = (id) => document.getElementById(id);
const screens = { start: $("screen-start"), play: $("screen-play"), drink: $("screen-drink") };

let pool = [];       // [{src, label}]
let deck = [];
let index = 0;
let pot = 0;         // +1 per correct answer; the next wrong guess drinks it all
let locked = false;

function show(name) {
  for (const [k, el] of Object.entries(screens)) el.hidden = k !== name;
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function loadPool() {
  const btn = $("btn-start");
  try {
    const res = await fetch("photos/manifest.json", { cache: "no-cache" });
    const manifest = await res.json();
    pool = Object.entries(manifest).flatMap(([label, srcs]) => srcs.map((src) => ({ src, label })));
  } catch (e) {
    console.error(e);
  }
  if (pool.length) {
    btn.disabled = false;
    btn.textContent = "Start";
  } else {
    btn.textContent = "No photos found";
  }
}

// Endless deck: reshuffle once every photo has been seen.
function current() {
  if (index >= deck.length) {
    deck = shuffle(pool.slice());
    index = 0;
  }
  return deck[index];
}

function preload() {
  for (const p of deck.slice(index + 1, index + 4)) new Image().src = p.src;
}

function setPot(n) {
  pot = n;
  $("pot").textContent = n;
}

function start() {
  deck = [];
  index = 0;
  setPot(1);
  show("play");
  showCard();
}

function showCard() {
  $("photo").src = current().src;
  $("verdict").hidden = true;
  resetCard();
  preload();
  locked = false;
}

function guess(label) {
  if (locked) return;
  locked = true;
  const p = current();
  index++;
  if (p.label !== label) return drink(p);
  setPot(pot + 1);
  const v = $("verdict");
  v.className = "verdict right";
  v.textContent = "✓";
  v.hidden = false;
  setTimeout(showCard, REVEAL_MS);
}

function drink(p) {
  navigator.vibrate?.(200);
  $("answer").textContent = LABELS[p.label];
  $("missed-photo").src = p.src;
  $("missed-flag").setAttribute("href", FLAG[p.label]);
  $("sips-total").textContent = pot;
  $("sips-word").textContent = pot === 1 ? "sip" : "sips";
  show("drink");
}

function nextPlayer() {
  setPot(1);
  show("play");
  showCard();
}

// Swipe: left = Japan, right = China.
const card = $("card");
let dragX = null;
function resetCard() {
  card.classList.remove("dragging");
  card.style.transform = "";
}
card.addEventListener("pointerdown", (e) => {
  if (locked) return;
  dragX = e.clientX;
  card.classList.add("dragging");
  card.setPointerCapture(e.pointerId);
});
card.addEventListener("pointermove", (e) => {
  if (dragX === null) return;
  const dx = e.clientX - dragX;
  card.style.transform = `translateX(${dx}px) rotate(${dx / 20}deg)`;
});
function endDrag(e) {
  if (dragX === null) return;
  const dx = e.clientX - dragX;
  dragX = null;
  resetCard();
  if (Math.abs(dx) >= SWIPE_PX) guess(dx < 0 ? "japanese" : "chinese");
}
card.addEventListener("pointerup", endDrag);
card.addEventListener("pointercancel", endDrag);

document.querySelectorAll(".flag-btn").forEach((b) => b.addEventListener("click", () => guess(b.dataset.guess)));
document.addEventListener("keydown", (e) => {
  if (screens.play.hidden) return;
  if (e.key === "ArrowLeft") guess("japanese");
  if (e.key === "ArrowRight") guess("chinese");
});

$("btn-start").addEventListener("click", start);
$("btn-next").addEventListener("click", nextPlayer);

loadPool();
