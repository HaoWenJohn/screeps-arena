import { CTX, Plugin } from "../..";

export const move_plugin=
   {
    name: "move_plugin",
    init: (ctx: CTX) => {

    },


    run: (ctx: CTX) => {
      ctx.my_creeps!.forEach(creep => creep.moveTo(creep.next_move_pos!));
    }


  };

