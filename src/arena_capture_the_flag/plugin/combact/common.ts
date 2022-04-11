import { Creep } from "game/prototypes";
import { ATTACK, BodyPartConstant, HEAL, MOVE, RANGED_ATTACK } from "game/constants";

export function attackable(creep: Creep) {
  return workable(creep, ATTACK);
}

export function ranged_attackable(creep: Creep) {
  return workable(creep, RANGED_ATTACK);
}
export function workable(creep: Creep, BODY_PART: BodyPartConstant) {
  return creep.body.some(body_part => body_part.type == BODY_PART && body_part.hits >= 0);
}
export function healable(creep: Creep) {
  return workable(creep, HEAL);
}



export function moveable(creep: Creep) {
  return workable(creep, MOVE);

}
