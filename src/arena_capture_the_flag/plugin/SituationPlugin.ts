import { findClosestByPath, findPath, getObjectsByPrototype, getTicks } from "game/utils";
import { Creep } from "game/prototypes";



import { smq } from "../message/MQ";

import { CTX, Situation } from "../common";
import { MsgType } from "../message/common";


export const MESSAGE_TYPE_SITUATION = "MESSAGE_TYPE_SITUATION"
declare module "../message/common"{

  export interface MsgBody {
    MESSAGE_TYPE_SITUATION:Situation
  }


}

export const situation_plugin =
  {
    init(ctx: CTX): void {

    },
    name: "situation_plugin",
    run(ctx: CTX): void {

      let nearest_enemy = findClosestByPath(ctx.my_flag!, getObjectsByPrototype(Creep).filter(creep => !creep.my),{ignore:ctx.my_creeps});

      if (nearest_enemy) {

        ctx.nearest_enemy = nearest_enemy;




        let dis = findPath(ctx.my_flag!, ctx.nearest_enemy).length;

        if (dis > 70) {
          if (getTicks() > 1000)
            ctx.situation = Situation.ATTACK;
          else
           ctx.situation = Situation.PICK;

        } else if (dis > 50 && dis <= 70) {
          ctx.situation = Situation.BLOCK;
        } else {
          ctx.situation = Situation.DEFENSE;
        }


        //smq.publish("situation",MESSAGE_TYPE_SITUATION,{ MESSAGE_TYPE_SITUATION: ctx.situation})





      }else ctx.nearest_enemy=null;

      console.log(`situation:${ctx.situation}`)
    }

  };

