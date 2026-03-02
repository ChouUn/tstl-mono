export function formatHp(current: number, max: number): string {
	return `${math.floor(current)}/${math.floor(max)}`;
}

export function formatPercent(value: number): string {
	return `${math.floor(value * 100)}%`;
}
