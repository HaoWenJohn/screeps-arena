import { Creep, RoomPosition, StructureTower } from "game/prototypes";
import { Flag } from "arena/prototypes";

export interface Plugin {
  name: string,
  init: (ctx: CTX) => void,
  run: (ctx: CTX) => void,
}
export enum Global_State {
  ATTACK = "ATTACK",
  FARM = "FARM",
  DEFEND = "DEFEND"
}
export enum Group_State{
  FARM = "FARM",
  PATROL = "PATROL",
  SNIPE = "SNIPE",
  ATTACK = "ATTACK",
  DEFEND = "DEFEND",

}
export enum Creep_State{
  FARM = "FARM",
  HOCK="HOCK",
  DEFEND = "DEFEND",
  ATTACK = "ATTACK",
}
 export interface CTX {
  my_creeps: Creep[],
  hero0?: Creep,
  hero1?: Creep,
  my_flag?: Flag,
  enemy_flag: Flag|null,
  situation?: Global_State,
  nearest_enemy: Creep|null,
  tower?: StructureTower[]
}
export type Vector = RoomPosition;
export const square = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]
export function in_bound(pos:{x:number,y:number}):boolean{
  return pos.x>=0 && pos.x <100 && pos.y>=0 && pos.y<100;
}
export function vec_add(v1:Vector,v2:Vector){
  return {
    x:v1.x+v2.x,
    y:v1.y+v2.y
  }
}
export function vec_sub(v1:Vector,v2:Vector){
  return {
    x:v1.x-v2.x,
    y:v1.y-v2.y
  }
}
export function vec_mul_num(v:Vector,n:number){
  return {
    x:v.x*n,
    y:v.y*n
  }
}

