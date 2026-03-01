import { clamp } from "./clamp";

export interface Vec2 {
  x: number;
  y: number;
}

export function vec2(x: number, y: number): Vec2 {
  return { x, y };
}

export function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function scale(v: Vec2, s: number): Vec2 {
  return { x: v.x * s, y: v.y * s };
}

export function length(v: Vec2): number {
  return math.sqrt(v.x * v.x + v.y * v.y);
}

export function distance(a: Vec2, b: Vec2): number {
  return length({ x: b.x - a.x, y: b.y - a.y });
}

export function clampLength(v: Vec2, maxLen: number): Vec2 {
  const len = length(v);
  if (len <= maxLen) return v;
  const ratio = clamp(maxLen / len, 0, 1);
  return scale(v, ratio);
}
