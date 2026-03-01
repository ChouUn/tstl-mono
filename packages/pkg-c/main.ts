import { vec2, distance, log, formatPercent } from "pkg-a";
import { createHero, gainXp, heroStatus, heroDistance } from "pkg-b";
import * as engineModule from "pkg-engine-api";

const arthas = createHero("Arthas", 0, 0);
const jaina = createHero("Jaina", 3, 4);

log(heroStatus(arthas));
log(heroStatus(jaina));

const dist = heroDistance(arthas, jaina);
log(`Distance: ${dist}`);

gainXp(arthas, 150);
log(heroStatus(arthas));
log(`Arthas HP: ${formatPercent(arthas.hp / arthas.maxHp)}`);

engineModule.engineModulePrint("Hello from module API");
log(`Module Build: ${engineModule.engineModuleGetBuild()}`);

engineGlobalPrint("Hello from global API");
log(`Global Build: ${engineGlobalGetBuild()}`);
