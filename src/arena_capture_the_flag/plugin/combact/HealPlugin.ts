import { findInRange } from "game/utils";
import { CTX, Plugin } from "../..";
import { healable } from "./common";


export const heal_plugin=
   {
    init(ctx: CTX): void {
    },
    name: "heal_plugin",

    run: (ctx: CTX) => {
      let healers = ctx.my_creeps!.filter(creep => healable(creep));
      healers.forEach(healer => {
        let adjacent_creeps = findInRange(healer, ctx.my_creeps!, 1);
        if (adjacent_creeps.length > 0) {
          healer.heal(adjacent_creeps[0]);
        } else {
          let three_dis_creeps = findInRange(healer, ctx.my_creeps!, 3);
          if (three_dis_creeps.length > 0) {
            healer.rangedHeal(three_dis_creeps[0]);
          }
        }
      });
    }

  };

