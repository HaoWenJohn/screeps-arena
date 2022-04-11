
import { Creep, StructureTower } from "game/prototypes";
import { Flag } from "arena/prototypes";

export interface Plugin {
  name: string,
  init: (ctx: CTX) => void,
  run: (ctx: CTX) => void,
}
export enum Situation {
  ATTACK = "ATTACK",
  PICK = "PICK",
  BLOCK = "BLOCK",
  DEFENSE = "DEFENSE"
}
export interface CTX {
  my_creeps: Creep[],
  hero0?: Creep,
  hero1?: Creep,
  my_flag?: Flag,
  enemy_flag: Flag|null,
  situation?: Situation,
  nearest_enemy: Creep|null,
  tower?: StructureTower[]
}
