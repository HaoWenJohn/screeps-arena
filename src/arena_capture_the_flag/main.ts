import { Creep, RoomPosition, StructureTower } from "game/prototypes";

import { combact_plugin } from "./plugin/combact/CombactPlugin";

import { resource_plugin } from "./plugin/ReourcePlugin";
import { situation_plugin } from "./plugin/SituationPlugin";

import { group_plugin } from "./plugin/GroupPlugin";

import { CTX, Plugin, Vector } from "./common";
import {
  findClosestByPath,
  findInRange,

  getObjectById,
  getObjectsByPrototype,

} from "game/utils";


import { flocking_move, } from "./plugin/flocking";
import { Flag } from "arena/prototypes";
import { attackable, healable, ranged_attackable } from "./plugin/combact/common";



declare module "game/prototypes" {
  interface Creep {
    initialPos: RoomPosition;
    group: number,
    role: string,
    move_target?: RoomPosition,
    next_move_pos:RoomPosition|null,
    concentrate_attack:Creep|StructureTower
    concentrate_heal:Creep,
    leader:boolean,
    plan_dir:Vector,
    adjusted_dir:Vector
  }
}


let plugin_list: Plugin[] = [
  resource_plugin,situation_plugin,group_plugin,combact_plugin
];

let ctx: CTX = { my_creeps: [], enemy_flag: null, nearest_enemy: null };
let need_initial = true;


export const loop= //ErrorMapper.wrapLoop(
    ()=>{
      let my_creeps= getObjectsByPrototype(Creep).filter(c=>c.my);
      let enemy_creeps  = getObjectsByPrototype(Creep).filter(c=>!c.my);
      let move_target = findClosestByPath(getObjectsByPrototype(Flag).filter(f=>f.my)[0],enemy_creeps)

      flocking_move(my_creeps,move_target);
      attack(my_creeps,enemy_creeps)
      ra(my_creeps,enemy_creeps);
      heal(my_creeps)
    }//)

function ra(my_creeps:Creep[],enemy_creep:Creep[]){
  let ra_register:{[id:string]:number} = {}

  my_creeps.filter(c=>ranged_attackable(c)).forEach(c=>{
    let can_ranged_attack = findInRange(c,enemy_creep,3)
    can_ranged_attack.forEach(e=>ra_register[e.id] = ra_register[e.id]?ra_register[e.id]+1:1)
  })

  let sorted_ra_targets = Object.entries(ra_register)
    .sort((first,second)=>first[1]-second[1])
    .reverse();

  my_creeps.filter(c=>ranged_attackable(c)).forEach((c=>{

    // @ts-ignore
    let ra_target= sorted_ra_targets.find((t)=>findInRange(c,[getObjectById(t[0])!],3).length>0);

    // @ts-ignore
    if (ra_target)c.rangedAttack(getObjectById(ra_target[0]))
  }))
}

function heal(my_creeps:Creep[]){
  my_creeps.filter(c=>healable(c))
    .forEach(c=>{
      let three_dis_creeps = findInRange(c, my_creeps, 3).sort((c1,c2)=>c1.hits/c1.hitsMax-c2.hits/c2.hitsMax);
      if (three_dis_creeps.length > 0) {
        let heal_tar = three_dis_creeps[0];
        if (findInRange(c,[heal_tar],1).length>0){
          c.heal(heal_tar);
        }else{
          c.rangedHeal(heal_tar);
        }
      }
    })
}

function attack(my_creeps:Creep[],enemy_creep:Creep[]){
  my_creeps.filter(c=>attackable(c))
    .forEach(c=>{
      let adjacent_creeps = findInRange(c, enemy_creep, 1).sort((c1,c2)=>c1.hits-c2.hits);
      if (adjacent_creeps.length > 0) {
        c.attack(adjacent_creeps[0]);
      }
    })
}
