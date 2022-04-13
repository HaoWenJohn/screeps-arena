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
      ctx.my_creeps!.filter(creep => attackable(creep)).forEach(creep => {



        let targetsInRange = findInRange(creep, target_creeps, 1);
        if (targetsInRange.length > 0) {
          creep.attack(targetsInRange[0]);
        }
      });
      ctx.my_creeps!.filter(creep => ranged_attackable(creep)).forEach(creep => {


        let concentrate_target = creep.concentrate_attack;
        if (concentrate_target&&findInRange(creep,[concentrate_target],3)){
          creep.rangedAttack(concentrate_target);
          return;
        }

        let targetsInRange = findInRange(creep, target_creeps, 3);
        if (targetsInRange.length >= 3) {
          creep.rangedMassAttack();
        } else if (targetsInRange.length > 0) {
          creep.rangedAttack(targetsInRange[0]);
        }
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
