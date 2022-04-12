import { CTX } from "../../common";
import { getDirection } from "game/utils";


export const move_plugin=
   {
    name: "move_plugin",
    init: (ctx: CTX) => {

    },


    run: (ctx: CTX) => {

      ctx.my_creeps!.filter(creep=>creep.next_move_pos).forEach(creep => {
        if (creep.leader){
          let direction = getDirection(creep.next_move_pos!.x-creep.x,creep.next_move_pos!.y-creep.y);
          creep.move(direction)
        }else{
          creep.moveTo(creep.next_move_pos!)
        }

      });
    }


  };

