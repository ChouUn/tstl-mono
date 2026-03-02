import { formatHp, type Vec2, vec2 } from "pkg-a";

export interface Unit {
	name: string;
	pos: Vec2;
	hp: number;
	maxHp: number;
}

export function createUnit(
	name: string,
	x: number,
	y: number,
	maxHp: number,
): Unit {
	return { name, pos: vec2(x, y), hp: maxHp, maxHp };
}

export function statusText(u: Unit): string {
	return `${u.name} HP:${formatHp(u.hp, u.maxHp)}`;
}
