import { findClosestByPath, findPath, getObjectsByPrototype, getTicks } from "game/utils";
import { Creep } from "game/prototypes";
import { circle, text } from "game/visual";

import { CTX, Situation } from "../common";


export const situation_plugin =
  {
    init(ctx: CTX): void {

    },
    name: "situation_plugin",
    run(ctx: CTX): void {
      if (getTicks() > 1500) {
        ctx.situation = Situation.ATTACK;
        return;
      }
      let nearest_enemy = findClosestByPath(ctx.my_flag!, getObjectsByPrototype(Creep).filter(creep => !creep.my));

      if (nearest_enemy) {

        ctx.nearest_enemy = nearest_enemy;


        circle(ctx.nearest_enemy, { radius: 0.5 });

        let dis = findPath(ctx.my_flag!, ctx.nearest_enemy).length;

        if (dis > 70) {

          ctx.situation = Situation.PICK;

        } else if (dis > 50 && dis <= 70) {
          ctx.situation = Situation.BLOCK;
        } else {
          ctx.situation = Situation.DEFENSE;
        }

        text(`${ctx.situation}`, { x: 50, y: 50 });

      }else ctx.nearest_enemy=null;


    }

  };

