import { findInRange, findPath, getObjectsByPrototype } from "game/utils";

import { Creep ,StructureTower} from "game/prototypes";
import { attackable, ranged_attackable } from "./common";
import { CTX } from "../../common";
import { searchPath } from "game/path-finder";



export const attack_plugin=
   {
    name: "attack_plugin",
    init: (ctx: CTX) => {

    },


    run: (ctx: CTX) => {
      let target_creeps = enemy_creeps();

      //attack
      ctx.my_creeps!.filter(creep => attackable(creep)).forEach(creep => {
        let target;
        if (creep.concentrate_attack&&findInRange(creep,[creep.concentrate_attack],1).length>0){
          target = creep.concentrate_attack;
        }else {
          let targetsInRange = findInRange(creep, target_creeps, 1);
          if (targetsInRange.length > 0) {
            target = targetsInRange[0]

          }
        }
        if (target)
          creep.attack(target);
      });

      //ra
      ctx.my_creeps!.filter(creep => ranged_attackable(creep)).forEach(creep => {

        let concentrate_target = creep.concentrate_attack;

        if (concentrate_target&&findInRange(creep,[concentrate_target],3).length>0){

          console.log(creep.rangedAttack(concentrate_target));
          return;
        }

        creep.rangedMassAttack();
      });

      if (ctx.tower){
        if (ctx.nearest_enemy){

          console.log(findPath(ctx.tower[0],ctx.nearest_enemy).length)

          let path = findPath(ctx.tower[0],ctx.nearest_enemy);
          if (path.length<8){
            ctx.tower.forEach(tower => tower.attack(ctx.nearest_enemy!));
          }
        }
      }
      // if (ctx.tower&&ctx.nearest_enemy&&.length<8) {
      //
      // }

    }
  };

function enemy_creeps() {
  return getObjectsByPrototype(Creep).filter(creep => !creep.my);
}
