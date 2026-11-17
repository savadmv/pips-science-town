// Pip's Daily Discovery + daily experiment. Pure data and date maths (no Three.js), so the
// daily job can read today's item from Node too:
//   node -e "import('./town/discovery.js').then(m => console.log(m.today()))"

// Every fact is a well-known, simple science fact (checked against two sources before adding new ones).
export const ITEMS = [
  { id: "ammonite", e: "🐚", n: "Ammonite fossil", f: "Ammonites were sea animals with spiral shells. They lived at the same time as the dinosaurs!" },
  { id: "quartz", e: "💎", n: "Quartz crystal", f: "Crystals grow in neat, repeating shapes. Quartz is one of the most common minerals on Earth." },
  { id: "meteorite", e: "☄️", n: "Meteorite", f: "A meteorite is a space rock that fell all the way to the ground. Most are older than any rock on Earth!" },
  { id: "feather", e: "🪶", n: "Feather", f: "Birds are the only animals alive today that have feathers." },
  { id: "magnet", e: "🧲", n: "Magnet", f: "Every magnet has a north and a south end. Opposite ends pull together!" },
  { id: "tooth", e: "🦷", n: "Shark tooth", f: "Sharks lose and regrow teeth all their lives. Some grow thousands!" },
  { id: "snowflake", e: "❄️", n: "Snowflake", f: "Snowflakes have six sides because of the way water freezes into ice." },
  { id: "ladybird", e: "🐞", n: "Ladybird", f: "Ladybirds eat tiny bugs called aphids that hurt plants. Gardeners love them!" },
  { id: "mushroom", e: "🍄", n: "Mushroom", f: "Mushrooms are not plants. They are fungi, a group all of their own!" },
  { id: "butterfly", e: "🦋", n: "Butterfly", f: "Butterflies taste with their feet!" },
  { id: "acorn", e: "🌰", n: "Acorn", f: "A tiny acorn can grow into a giant oak tree." },
  { id: "leaf", e: "🍁", n: "Autumn leaf", f: "Leaves turn yellow and orange in autumn when their green colour breaks down." },
  { id: "moonrock", e: "🌑", n: "Moon rock", f: "The Moon has no wind, so astronauts' footprints can stay there for a very long time." },
  { id: "compass", e: "🧭", n: "Compass", f: "A compass needle is a tiny magnet. It points north because Earth is like a giant magnet!" },
  { id: "dinoegg", e: "🥚", n: "Dinosaur egg", f: "Baby dinosaurs hatched from eggs, just like baby birds do today." },
  { id: "honeycomb", e: "🍯", n: "Honeycomb", f: "Bees build honeycomb out of wax, with six-sided cells." },
  { id: "pumice", e: "🪨", n: "Pumice stone", f: "Pumice is a volcano rock so full of air bubbles that it can float on water!" },
  { id: "prism", e: "🌈", n: "Prism", f: "A prism splits white light into all the colours of the rainbow." },
  { id: "snail", e: "🐌", n: "Snail shell", f: "A snail's shell grows with it. A snail never moves out of its shell!" },
  { id: "bone", e: "🦴", n: "Dinosaur bone", f: "Fossil bones slowly turned to stone over millions of years." },
  { id: "ice", e: "🧊", n: "Ice cube", f: "Ice floats because water gets a little bigger when it freezes." },
  { id: "seastar", e: "⭐", n: "Sea star", f: "A sea star can grow back a lost arm!" },
  { id: "lemon", e: "🍋", n: "Lemon battery", f: "A lemon can make a tiny bit of electricity with two different metals pushed into it!" },
  { id: "saturn", e: "🪐", n: "Mini Saturn", f: "Saturn's rings are made of chunks of ice and rock." },
];

// 5-minute experiments for "My Lab" (one per day). Simple, cheap, grown-up helps.
export const EXPERIMENTS = [
  { n: "Walking water", e: "🌈", s: "Put 3 cups in a row. Fill the 2 outside cups with coloured water. Fold paper towels into bridges between the cups. Watch the water walk up and mix!" },
  { n: "Dancing raisins", e: "🍇", s: "Drop a few raisins into a glass of fizzy water. Bubbles stick to them, lift them up, pop, and down they go again!" },
  { n: "Magic balloon", e: "🎈", s: "Rub a balloon on your hair, then hold it over tiny bits of paper. Static electricity makes them jump up!" },
  { n: "Ice melt race", e: "🧊", s: "Put two ice cubes on plates. Sprinkle salt on one. Which melts faster? (Salt makes ice melt faster!)" },
  { n: "Shadow tracker", e: "☀️", s: "Stand a toy in the sun on paper and trace its shadow in the morning. Trace it again after lunch. Did it move?" },
  { n: "Paper helicopter", e: "🚁", s: "Cut a strip of paper, split the top into two wings and fold them opposite ways. Drop it from up high and watch it spin!" },
  { n: "Colour-changing celery", e: "🥬", s: "Stand a celery stick in water with food colouring. Check tomorrow: the leaves change colour as the plant drinks!" },
  { n: "Magnet hunt", e: "🧲", s: "Take a fridge magnet around the house. Guess first: will it stick to a spoon? A door? A coin? Then test!" },
  { n: "Fizzy volcano", e: "🌋", s: "Put 2 spoons of baking soda and a squirt of dish soap in a cup, then pour in vinegar. Whoosh! (A grown-up helps.)" },
  { n: "Sink or float?", e: "🍋", s: "Guess first, then drop a lemon, a coin, an apple and a plastic toy into a bowl of water." },
  { n: "Torch rainbow", e: "🔦", s: "In a dark room, shine a torch through a glass of water onto white paper. Can you find the rainbow?" },
  { n: "Moon diary", e: "🌙", s: "Draw the Moon's shape every night for a week. Is it growing or shrinking?" },
  { n: "Fossil maker", e: "🦕", s: "Press a toy dinosaur's foot into play dough. That's how footprint fossils form!" },
  { n: "Balloon rocket", e: "🚀", s: "Thread a string through a straw and tie it across a room. Tape a blown-up balloon to the straw and let go!" },
];

// Where today's item hides: next to one of the science spots (fixed places, so a Story can give the hint).
export const SPOT_NAMES = { pip: "Pip's Lab", volcano: "Volcano Lab", aquarium: "Aquarium", weather: "Weather Tower", planetarium: "Planetarium", dino: "Dino Museum", rocket: "Rocket Launch Pad" };
export const CORNERS = [[-1, -1], [1, -1], [-1, 1], [1, 1]];

// Days are counted in India time, so the item changes at midnight IST for everyone.
export const dayNumber = (d = new Date()) => Math.floor((d.getTime() + 5.5 * 3600e3) / 86400e3);
export const dayKey = (n = dayNumber()) => new Date(n * 86400e3).toISOString().slice(0, 10);

function mix(n) { let x = (n * 2654435761) >>> 0; x ^= x >>> 15; x = Math.imul(x, 2246822519) >>> 0; x ^= x >>> 13; return x >>> 0; }

export function today(n = dayNumber()) {
  const r = mix(n);
  const spots = Object.keys(SPOT_NAMES);
  const spot = spots[r % spots.length];
  return {
    day: dayKey(n),
    item: ITEMS[n % ITEMS.length],
    spot,
    near: SPOT_NAMES[spot],
    corner: CORNERS[(r >>> 8) % 4],
    experiment: EXPERIMENTS[n % EXPERIMENTS.length],
    fact: ITEMS[(n + 7) % ITEMS.length],
  };
}
