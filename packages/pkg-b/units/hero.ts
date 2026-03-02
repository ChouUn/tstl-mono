import { distance, log } from "pkg-a";
import { createUnit, statusText, type Unit } from "./unit";

export interface Hero extends Unit {
	level: number;
	xp: number;
}

export function createHero(name: string, x: number, y: number): Hero {
	const base = createUnit(name, x, y, 500);
	return { ...base, level: 1, xp: 0 };
}

export function gainXp(hero: Hero, amount: number): void {
	hero.xp += amount;
	if (hero.xp >= hero.level * 100) {
		hero.xp -= hero.level * 100;
		hero.level++;
		hero.maxHp += 50;
		hero.hp = hero.maxHp;
		log(`${hero.name} leveled up to ${hero.level}!`);
	}
}

export function heroStatus(hero: Hero): string {
	return `[Lv${hero.level}] ${statusText(hero)}`;
}

export function heroDistance(a: Hero, b: Hero): number {
	return distance(a.pos, b.pos);
}
