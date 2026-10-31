/** Agent scope boundary: memory-engine.md §8 / C10. Only verified server credentials supply grants. */
import type { SpaceKey } from "./types";
export class ScopeAccessError extends Error {
 readonly code="SPACE_ACCESS_DENIED";
 constructor(){super("Memory space access denied");}
}
/** Undefined preserves normal UI access; an explicit invalid/empty grant never widens it. */
export function effectiveSpaceKeys(requested:SpaceKey[]|undefined,allowed:SpaceKey[]|undefined):SpaceKey[]|undefined {
 if(allowed===undefined)return requested===undefined?undefined:[...new Set(requested)];
 if(!Array.isArray(allowed)||!allowed.length||allowed.some(s=>typeof s!=="string"||!s.length||s.trim()!==s))throw new ScopeAccessError();
 const result=[...new Set(requested===undefined?allowed:requested.filter(s=>allowed.includes(s)))];
 if(!result.length)throw new ScopeAccessError();
 return result;
}
export function spaceAllowed(spaceKey:SpaceKey,allowed:SpaceKey[]|undefined):boolean {
 const scopes=effectiveSpaceKeys(undefined,allowed);
 return scopes===undefined||scopes.includes(spaceKey);
}
export function assertSpaceAllowed(spaceKey:SpaceKey,allowed:SpaceKey[]|undefined):void {
 if(!spaceAllowed(spaceKey,allowed))throw new ScopeAccessError();
}
export function spaceFilter(spaces:SpaceKey[]|undefined):{spaceKey:{$in:SpaceKey[]}}|Record<string,never> {
 return spaces===undefined?{}:{spaceKey:{$in:spaces}};
}
