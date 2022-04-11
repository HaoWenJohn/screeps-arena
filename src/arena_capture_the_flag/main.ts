import { Creep, RoomPosition, StructureTower } from "game/prototypes";
import { ErrorMapper } from "../utils/ErrorMapper";
import { combact_plugin } from "./plugin/combact/CombactPlugin";
import { CTX, Plugin } from ".";
import { resource_plugin } from "./plugin/ReourcePlugin";
import { situation_plugin } from "./plugin/SituationPlugin";

import { group_plugin } from "./plugin/GroupPlugin";
import { DirectionConstant } from "game/constants";




declare module "game/prototypes" {
  interface Creep {
    initialPos: RoomPosition;
    group: number,
    role: string,
    move_target?: RoomPosition,
    next_move_pos:RoomPosition|null,

  }
}


let plugin_list: Plugin[] = [
  resource_plugin,situation_plugin,group_plugin,combact_plugin
];

let ctx: CTX = { my_creeps: [], enemy_flag: null, nearest_enemy: null };
let need_initial = true;
export const loop= ErrorMapper.wrapLoop(
    ()=>{
      if (need_initial){
        plugin_list.forEach(plugin => {

          plugin.init(ctx)
        });
        need_initial=false;
      }
      plugin_list.forEach(plugin => {
        console.log(`-----${plugin.name}----\n`);
        plugin.run(ctx);
      });
    })




