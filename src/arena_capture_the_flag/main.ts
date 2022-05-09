import { Creep, RoomPosition, StructureTower } from "game/prototypes";

import { attackable, healable, in_bound, ranged_attackable, Vector } from "./common";
import { findInRange, getObjectById, getObjectsByPrototype, getRange, getTerrainAt } from "game/utils";
import { BodyPart, Flag } from "arena/prototypes";
import { CostMatrix } from "game/path-finder";
import { ATTACK, HEAL, RANGED_ATTACK } from "game/constants";
import { Group } from "./group/Group";
import { Ra_h } from "./group/Ra_h";
import { A } from "./group/A";
import { group_manager } from "./group/group_manager";
// @ts-ignore
import{Visual} from 'game/visual';


declare module "game/prototypes" {
  interface Creep {
    initialPos: RoomPosition;
    group: number,
    role: string,
    move_target?: RoomPosition,
    next_move_pos: RoomPosition | null,
    concentrate_attack: Creep | StructureTower
    concentrate_heal: Creep,
    leader: boolean,
    plan_dir: Vector,
    adjusted_dir: Vector,
    force: Vector,
    bp: BodyPart | null,
    obscale_cause_no_move_time:number;
    pre_pos:RoomPosition
  }

}
declare module "arena/prototypes" {
  interface BodyPart {
    picker: Creep | null
  }
}
let my_creeps: Creep[];
let enemy_creeps: Creep[];
let my_flag: Flag;
let enemy_flag: Flag;
let body_parts: { [key: string]: BodyPart };
let threaten_field: number[][];
let threaten_cost: CostMatrix;
let heal_field: number[][];
let next_map: string[][];
let current_map: string[][];
let my_tower : StructureTower[];
function refresh_creeps() {
  my_creeps = getObjectsByPrototype(Creep).filter(c => c.my);
  enemy_creeps = getObjectsByPrototype(Creep).filter(c => !c.my);
}

function refresh_map() {
  next_map = [...Array(100)].map(e => [...Array(100).fill("")]);
  current_map = [...Array(100)].map(e => [...Array(100).fill("")]);
  my_creeps.forEach(c => {
    current_map[c.y][c.x] = c.id;
  });
}

function refresh_field() {
  threaten_field = [...Array(100)].map(e => [...Array(100).fill(0)]);
  heal_field = [...Array(100)].map(e => [...Array(100).fill(0)]);
  my_creeps.forEach(c => {
    let heal = c.body.reduce((sum, b) => sum + (b.type == HEAL ? 1 : 0), 0);
    for (let i = -3; i <= 3; i++) {
      for (let j = -3; j <= 3; j++) {
        let x = c.x + i;
        let y = c.y + j;
        if (in_bound({ x, y })) {
          if (getRange(c, { x, y }) <= 1)
            heal_field[y][x] += heal * 12;
          else heal_field[y][x] += heal * 4;
        }
      }
    }
  });
  enemy_creeps.forEach(c => {
    let attack = c.body.reduce((sum, b) => sum + (b.type == ATTACK ? 1 : 0), 0);
    let ra = c.body.reduce((sum, b) => sum + (b.type == RANGED_ATTACK ? 1 : 0), 0);

    for (let i = -2; i <= 2; i++) {
      for (let j = -2; j <= 2; j++) {
        let x = c.x + i;
        let y = c.y + j;
        if (in_bound({ x, y })) {
          threaten_field[y][x] += attack * 30;

        }
      }
    }
    for (let i = -3; i <= 3; i++) {
      for (let j = -3; j <= 3; j++) {

        let x = c.x + i;
        let y = c.y + j;

        if (in_bound({ x, y })) {
          threaten_field[y][x] += ra * 10;
        }
      }
    }

  });
  threaten_cost = new CostMatrix;
  for (let i = 0; i < 100; i++) {
    for (let j = 0; j < 100; j++) {

      let ext_cost = threaten_field[j][i] - heal_field[j][i];
      if (ext_cost <= 0) ext_cost = 0;
      threaten_cost.set(i, j, ext_cost);

    }
  }
}


let init: boolean = false;
let gm :group_manager;
let terran_cost:CostMatrix;
let ext_terran = [[0,0],[-1,-1],[-1,0],[0,-1]];

export const loop = //ErrorMapper.wrapLoop(
  () => {
    my_tower = getObjectsByPrototype(StructureTower).filter(t=>t.my);
    refresh_creeps()

    refresh_field()
    if (!init) {
      terran_cost = init_terran_cost(ext_terran)
      my_flag = getObjectsByPrototype(Flag).filter(f => f.my)[0];
      enemy_flag = getObjectsByPrototype(Flag).filter(f => !f.my)[0];
      gm = new group_manager(enemy_creeps,my_creeps);
      init = true;
    }

    gm.run(enemy_creeps,terran_cost.clone(),threaten_cost)
    ra();
    heal();
    attack();
    tower_ra();
  };

function init_terran_cost(ext_terran:number[][]){
  let terran_cost = new CostMatrix
  for (let  i = 0 ;i<100;i++){
    for (let j = 0 ; j<100; j++){
      switch (getTerrainAt({x:i,y:j})){
        case 1:
          ext_terran.map(e=>{
            return {x:e[0]+i,y:e[1]+j}
          }).filter(p=>in_bound(p))
            .forEach(p=>terran_cost.set(p.x,p.y,255))
          break;
        case 2:
          ext_terran.map(e=>{
            return {x:e[0]+i,y:e[1]+j}
          }).filter(p=>in_bound(p) && getTerrainAt({x:p.x,y:p.y})==0)
            .forEach(p=>terran_cost.set(p.x,p.y,10))
          break;
      }
    }
  }
  getObjectsByPrototype(StructureTower).map(t=>ext_terran.map(e=>{return{x:e[0]+t.x,y:e[1]+t.y}})).flat().filter(p=>in_bound(p)).forEach(t=>terran_cost.set(t.x,t.y,255))
  return terran_cost
}
function ra() {
  let ra_register: { [id: string]: number } = {};

  my_creeps.filter(c => ranged_attackable(c)).forEach(c => {
    let can_ranged_attack = findInRange(c, enemy_creeps, 3);
    can_ranged_attack.forEach(e => ra_register[e.id] = ra_register[e.id] ? ra_register[e.id] + 1 : 1);
  });

  let sorted_ra_targets = Object.entries(ra_register)
    .sort((first, second) => second[1] - first[1] );

  my_creeps.filter(c => ranged_attackable(c)).forEach((c => {

    // @ts-ignore
    let ra_target = sorted_ra_targets.find((t) => findInRange(c, [getObjectById(t[0])!], 3).length > 0);


    if (ra_target) {
      // @ts-ignore
      if (findInRange(c, [getObjectById(ra_target[0])], 1).length > 0) {
        c.rangedMassAttack();
        // @ts-ignore
      } else c.rangedAttack(getObjectById(ra_target[0]));
    }
  }));
}

function heal() {
  my_creeps.filter(c => healable(c))
    .forEach(c => {
      let three_dis_creeps = findInRange(c, my_creeps, 3).sort((c1, c2) => c1.hits / c1.hitsMax - c2.hits / c2.hitsMax);
      if (three_dis_creeps.length > 0) {
        let heal_tar = three_dis_creeps[0];
        if (findInRange(c, [heal_tar], 1).length > 0) {
          c.heal(heal_tar);
        } else {
          c.rangedHeal(heal_tar);
        }
      }
    });
}

function attack() {
  my_creeps.filter(c => attackable(c))
    .forEach(c => {
      let adjacent_creeps = findInRange(c, enemy_creeps, 1).sort((c1, c2) => c1.hits - c2.hits);
      if (adjacent_creeps.length > 0) {
        c.attack(adjacent_creeps[0]);
      }
    });
}
function tower_ra(){
  let attack_map:{[key:string]:number} = {}
  my_tower.forEach(t=>{
    let ranged_enemys = findInRange(t,enemy_creeps,5);
    if (ranged_enemys.length>0){
      ranged_enemys.forEach(e=>{
        if (!attack_map[e.id]){
          attack_map[e.id]=1;
        }else{
          attack_map[e.id]+=1;
        }
      })
    }

  })
  let sorted_ra_targets =Object.entries(attack_map).sort((first, second) => second[1] - first[1] );
  if (sorted_ra_targets.length>0){


    // @ts-ignore
    my_tower.forEach(t=>t.attack(getObjectById(sorted_ra_targets[0][0])))
  }
}
