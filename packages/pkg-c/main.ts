import { vec2, distance, log, formatPercent } from "pkg-a";
import { createHero, gainXp, heroStatus, heroDistance } from "pkg-b";

const arthas = createHero("Arthas", 0, 0);
const jaina = createHero("Jaina", 3, 4);

log(heroStatus(arthas));
log(heroStatus(jaina));

const dist = heroDistance(arthas, jaina);
log(`Distance: ${dist}`);

gainXp(arthas, 150);
log(heroStatus(arthas));
log(`Arthas HP: ${formatPercent(arthas.hp / arthas.maxHp)}`);
