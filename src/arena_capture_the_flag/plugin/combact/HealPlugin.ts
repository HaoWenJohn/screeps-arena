import { findInRange, findPath } from "game/utils";

import { healable } from "./common";
import { CTX } from "../../common";
import { searchPath } from "game/path-finder";


export const heal_plugin=
   {
    init(ctx: CTX): void {
    },
    name: "heal_plugin",

    run: (ctx: CTX) => {
      let healers = ctx.my_creeps!.filter(creep => healable(creep));
      healers.forEach(healer => {

        let concentrate_target = healer.concentrate_heal;


        if (concentrate_target){
          let dis = findPath(healer,concentrate_target).length
          if (dis<=1)
            healer.heal(concentrate_target);
          else if (dis<=3){
            healer.rangedHeal(concentrate_target)
          }
          return;
        }


        let adjacent_creeps = findInRange(healer, ctx.my_creeps!, 1).sort((c1,c2)=>c1.hits/c1.hitsMax-c2.hits/c2.hitsMax);
        if (adjacent_creeps.length > 0) {
          healer.heal(adjacent_creeps[0]);
        } else {
          let three_dis_creeps = findInRange(healer, ctx.my_creeps!, 3).sort((c1,c2)=>c1.hits/c1.hitsMax-c2.hits/c2.hitsMax);
          if (three_dis_creeps.length > 0) {
            healer.rangedHeal(three_dis_creeps[0]);
          }
        }
      });
    }

  };

