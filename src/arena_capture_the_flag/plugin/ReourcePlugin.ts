import { getObjectsByPrototype } from "game/utils";
import { Flag } from "arena/prototypes";
import { Creep, StructureTower } from "game/prototypes";
import { ATTACK, HEAL, RANGED_ATTACK } from "game/constants";
import { CTX, Plugin } from "..";

export const resource_plugin=function(){
  return {
    name: "resource_plugin",
    init: (ctx: CTX) => {
      ctx.my_flag = getObjectsByPrototype(Flag).filter(flag => flag.my)[0];
      ctx.enemy_flag = getObjectsByPrototype(Flag).filter(flag => !flag.my)[0];
      ctx.my_creeps = my_creeps();
    },


    run: (ctx: CTX) => {
      ctx.my_creeps = my_creeps();
      ctx.tower = getObjectsByPrototype(StructureTower).filter(tower => tower.my);
    }
  };
}()

function my_creeps() {
  return getObjectsByPrototype(Creep).filter(creep => creep.my);
}


