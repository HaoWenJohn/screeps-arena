import { Creep } from "game/prototypes";
import { findClosestByPath, findInRange, getObjectsByPrototype } from "game/utils";
import { ATTACK, BodyPartConstant, HEAL, MOVE, RANGED_ATTACK } from "game/constants";
import { BodyPart, Flag } from "arena/prototypes";
import {visual} from "game";

declare module "game/prototypes" {
  interface Creep {
    initialPos: RoomPosition;
    group: number,
    role: string,
    move_target?:RoomPosition
  }
}

interface Plugin {
  name: string,
  init: (ctx: CTX) => void,
  run: (ctx: CTX) => void,
}

let plugin_list: (() => Plugin)[] = [
  resource_plugin, heal_plugin, attack_plugin,target_plugin,move_plugin
];

interface CTX {
  my_creeps?: Creep[],
  hero0?: Creep,
  hero1?: Creep
}

let ctx: CTX = {};

plugin_list.forEach(plugin => plugin().init(ctx));

export function loop() {
  plugin_list.forEach(plugin => plugin().run(ctx));
}

function resource_plugin(): Plugin {
  return {
    name: "resource_plugin",
    init: (ctx: CTX) => {
    },


    run: (ctx: CTX) => {
      ctx.my_creeps = my_creeps();
      let heros: Creep[] = ctx.my_creeps.filter(creep => creep.body.some(body_part => body_part.type === ATTACK));
      let healers: Creep[] = ctx.my_creeps.filter(creep => creep.body.some(body_part => body_part.type === HEAL));
      let archers: Creep[] = ctx.my_creeps.filter(creep => creep.body.some(body_part => body_part.type === RANGED_ATTACK));
      heros[0].group = 0;
      heros[0].role = "hero";
      heros[1].group = 1;
      heros[1].role = "hero";
      for (let index in healers) {
        let idx = Number(index);
        if (idx < 3) {
          healers[idx].group = 0;
        } else {
          healers[idx].group = 1;
        }
        healers[idx].role = "healer";
      }
      for (let index in archers) {
        let idx = Number(index);
        if (idx < 3) {
          archers[idx].group = 0;
        } else {
          archers[idx].group = 1;
        }
        archers[idx].role = "archer";
      }
      ctx.hero0 = heros[0];
      ctx.hero1 = heros[1];
    }
  };
}


function heal_plugin(): Plugin {
  return {
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
            healer.heal(three_dis_creeps[0]);
          }
        }
      });
    }

  };
}


function attack_plugin(): Plugin {
  return {
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
        let targetsInRange = findInRange(creep, target_creeps, 2);
        if (targetsInRange.length >= 3) {
          creep.rangedMassAttack();
        } else if (targetsInRange.length > 0) {
          creep.rangedAttack(targetsInRange[0]);
        }

      });

    }
  };
}


function target_plugin(): Plugin {
  return {
    name: "target_plugin",
    init: (ctx: CTX) => {

    },


    run: (ctx: CTX) => {
      if (ctx.hero0){
        ctx.hero0.move_target = getObjectsByPrototype(Flag).filter(flag => flag.my)[0];

      }
      if (ctx.hero1){
        let pickable_body_part = findClosestByPath(ctx.hero1, getObjectsByPrototype(BodyPart));
        if (pickable_body_part) {
          ctx.hero1.move_target = pickable_body_part;
        }
        if (ctx.hero1.move_target)
          visual.line(ctx.hero1, ctx.hero1.move_target);
      }





      let other_creeps = ctx.my_creeps!.filter(creep => creep.role !== "hero");

      other_creeps.forEach(creep => creep.move_target = creep.group === 0 ? ctx.hero0 : ctx.hero1);

    }
  };
}

//
//
function move_plugin():Plugin {return {
  name: "move_plugin",
  init: (ctx:CTX) => {

  },



  run: (ctx:CTX) => {
    ctx.my_creeps!.forEach(creep=>creep.moveTo(creep.move_target!))
  },


}}
//
function workable(creep: Creep, BODY_PART: BodyPartConstant) {
  return creep.body.some(body_part => body_part.type == BODY_PART && body_part.hits >= 0);
}


function healable(creep: Creep) {
  return workable(creep, HEAL);
}

function attackable(creep: Creep) {
  return workable(creep, ATTACK);
}

function ranged_attackable(creep: Creep) {
  return workable(creep, RANGED_ATTACK);
}

function moveable(creep: Creep) {
  return workable(creep, MOVE);

}

function my_creeps() {
  return getObjectsByPrototype(Creep).filter(creep => creep.my);
}


function enemy_creeps() {
  return getObjectsByPrototype(Creep).filter(creep => !creep.my);
}

// [resource_plugin, target_plugin, move_plugin, attack_plugin, heal_plugin].forEach(plugin => plugin_manager.add_plugin(plugin));

