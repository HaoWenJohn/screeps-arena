import { CTX } from "../../common";
import { move_plugin } from "./MovePlugin";
import { attack_plugin } from "./AttackPlugin";
import { heal_plugin } from "./HealPlugin";

export const combact_plugin = (function(){

  return {
    init():void{},
    name:"CombactPlugin",
    run(ctx:CTX){
      [move_plugin,attack_plugin,heal_plugin].forEach(plugin=>plugin.run(ctx))
    }
  }

}())
