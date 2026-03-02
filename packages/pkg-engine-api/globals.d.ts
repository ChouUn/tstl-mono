/** @noSelfInFile */

export {};

declare global {
	function engineGlobalPrint(message: string): void;
	function engineGlobalGetBuild(): string;
}
