import { findInRange, findPath, getObjectsByPrototype } from "game/utils";
import { CTX, Plugin } from "../../common";
import { Creep } from "game/prototypes";

import { attackable, ranged_attackable } from "./common";

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
        let targetsInRange = findInRange(creep, target_creeps, 3);
        if (targetsInRange.length >= 3) {
          creep.rangedMassAttack();
        } else if (targetsInRange.length > 0) {
          creep.rangedAttack(targetsInRange[0]);
        }
      });

      if (ctx.tower&&ctx.nearest_enemy&&findPath(ctx.tower[0],ctx.nearest_enemy).length<8) {
        ctx.tower.forEach(tower => tower.attack(ctx.nearest_enemy!));
      }

    }
  };

function enemy_creeps() {
  return getObjectsByPrototype(Creep).filter(creep => !creep.my);
}
