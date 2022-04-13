import { Creep, RoomPosition, StructureTower } from "game/prototypes";

import { combact_plugin } from "./plugin/combact/CombactPlugin";

import { resource_plugin } from "./plugin/ReourcePlugin";
import { situation_plugin } from "./plugin/SituationPlugin";

import { group_plugin } from "./plugin/GroupPlugin";
import { DirectionConstant, TERRAIN_WALL } from "game/constants";
import { smq } from "./message/MQ";
import { CTX, Plugin } from "./common";
import { findPath, getDirection, getTerrainAt } from "game/utils";
// @ts-ignore
import { Visual } from "game/visual";





declare module "game/prototypes" {
  interface Creep {
    initialPos: RoomPosition;
    group: number,
    role: string,
    move_target?: RoomPosition,
    next_move_pos:RoomPosition|null,
    concentrate_attack:Creep|StructureTower
    concentrate_heal:Creep,
    leader:boolean
  }
}


let plugin_list: Plugin[] = [
  resource_plugin,situation_plugin,group_plugin,combact_plugin
];

let ctx: CTX = { my_creeps: [], enemy_flag: null, nearest_enemy: null };
let need_initial = true;


export const loop= //ErrorMapper.wrapLoop(
    ()=>{
      //-------init----------
      if (need_initial){
        plugin_list.forEach(plugin => {

          plugin.init(ctx)
        });
        need_initial=false;
      }

      //-----run-----------
      smq.run()

      plugin_list.forEach(plugin => {
        console.log(`-----${plugin.name}----\n`);
        plugin.run(ctx);
      });
    }//)











