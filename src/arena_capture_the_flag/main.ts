import { Creep, RoomPosition, StructureTower } from "game/prototypes";

import { Global_State, Group_State, in_bound, Vector } from "./common";
import { findClosestByPath, findInRange, getObjectById, getObjectsByPrototype, getRange } from "game/utils";
import { attackable, healable, ranged_attackable } from "./plugin/combact/common";
import { BodyPart, Flag } from "arena/prototypes";
import { CostMatrix, searchPath } from "game/path-finder";
import { ATTACK, HEAL, RANGED_ATTACK } from "game/constants";


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
    bp:BodyPart|null
  }

}
declare module "arena/prototypes"{
  interface BodyPart{
    picker:Creep|null
  }
}
let my_creeps :Creep[];
let enemy_creeps :Creep[];
let my_flag:Flag;
let body_parts:{[key:string]:BodyPart}  ;
let threaten:number[][];
let threaten_cost:CostMatrix;
function refresh_creeps (){
  my_creeps = getObjectsByPrototype(Creep).filter(c=>c.my);
  enemy_creeps = getObjectsByPrototype(Creep).filter(c=>!c.my);
}

function refresh_threaten(){
  threaten = [...Array(100)].map(e => [...Array(100).fill(0)]);
  enemy_creeps.forEach(c=>{
    let attack = c.body.reduce((sum,b)=>sum+ b.type==ATTACK?1:0,0);
    let ra = c.body.reduce((sum,b)=>sum+ b.type==RANGED_ATTACK?1:0,0);

    for (let i = -1 ; i<=1;i++){
      for (let j = -1 ; j<=1;j++){
        let x = c.x+i;
        let y = c.y+j;
        if(in_bound({x,y})){
          threaten[y][x]+= attack*30;
        }
      }
    }
    for (let i = -3 ; i<=3;i++){
      for (let j = -3 ; j<=3;j++){

        let x = c.x+i;
        let y = c.y+j;

        if(in_bound({x,y})){
          let range =  getRange({x,y},{x:c.x,y:c.y});
          let damage:number;
          if (range==1)
            damage=10;
          if (range==2)
            damage=4;
          if (range==3)
            damage=1;
          threaten[y][x]+= ra * damage!;
        }
      }
    }
  })
  threaten_cost =new CostMatrix
  for (let i=0;i<100;i++){
    for (let j=0;j<100;j++){
      if (threaten[j][i]!=0){
        threaten_cost.set(i,j,255)
      }
    }
  }
}
function refresh_bodyparts(){
  let pre_body_parts = body_parts;
  body_parts= {};
  getObjectsByPrototype(BodyPart).forEach(bp=>{
    if (pre_body_parts[bp.id])
      body_parts[bp.id]=pre_body_parts[bp.id]
    else body_parts[bp.id]=bp;
    if (bp.picker&&!getObjectById(bp.picker.id)){
      bp.picker = null;
    }
  })
}
export const loop = //ErrorMapper.wrapLoop(
  () => {
    my_flag= getObjectsByPrototype(Flag).filter(f=>f.my)[0]
    refresh_creeps();
    refresh_bodyparts();
    refresh_threaten();
    run_group(Global_State.FARM);
    ra();
    heal();

    attack();
  };

function run_global():Global_State{
  return Global_State.FARM
}

function run_group(global_state:Global_State){
  switch (global_state){
    case Global_State.FARM:
      my_creeps.forEach(c=>run_creep(Group_State.FARM,c))
      break;
  }
}
function run_creep(group_state:Group_State,creep:Creep){
  switch (group_state){
    case Group_State.FARM:
      free_farm(creep)
      break;
  }
}
function free_farm(creep:Creep){
  if (findInRange(creep,enemy_creeps,4).length>0){
    let closest_enemy = findClosestByPath(creep,enemy_creeps,)
    if (closest_enemy){
      let flee_range;
      if (creep.body.some(b=>b.type==RANGED_ATTACK))
        flee_range=3;
      else if (creep.body.some(b=>b.type==HEAL))
        flee_range=4
      else flee_range =3;
      let flee_path = searchPath(creep,{pos:closest_enemy,range:flee_range},{flee:true,costMatrix:threaten_cost});
      if (flee_path.path.length>0)
        creep.moveTo(flee_path.path[0])
      else creep.moveTo(my_flag)
      return;
    }
  }


  let surround_bp = findInRange(creep,Object.values(body_parts),5);
  if (surround_bp.length>0){
    if (creep.bp && creep.bp.id != surround_bp[0].id){
      creep.bp.picker=null;
    }
    creep.bp = surround_bp[0];
    creep.moveTo(creep.bp );
    return;
  }


  if (!creep.bp||!creep.bp.exists){
    let bp = findClosestByPath(creep,Object.values(body_parts));//.filter(bp=>!bp.picker)
    if (bp){
      body_parts[bp.id].picker = creep;
      creep.bp= bp;
    }else{
      creep.bp = null;
    }
  }
  if (creep.bp){
    creep.moveTo(creep.bp);
    return;
  }

  if (creep.body.some(b=>b.type==RANGED_ATTACK)){
    let closest_enemy = findClosestByPath(creep,enemy_creeps,)
    if (closest_enemy){
      let flee_path = searchPath(creep,{pos:closest_enemy,range:3},{costMatrix:threaten_cost});
      if (flee_path.path.length>0)
        creep.moveTo(flee_path.path[0])
      return;
    }
  }


}

function ra() {
  let ra_register: { [id: string]: number } = {};

  my_creeps.filter(c => ranged_attackable(c)).forEach(c => {
    let can_ranged_attack = findInRange(c, enemy_creeps, 3);
    can_ranged_attack.forEach(e => ra_register[e.id] = ra_register[e.id] ? ra_register[e.id] + 1 : 1);
  });

  let sorted_ra_targets = Object.entries(ra_register)
    .sort((first, second) => first[1] - second[1])
    .reverse();

  my_creeps.filter(c => ranged_attackable(c)).forEach((c => {

    // @ts-ignore
    let ra_target = sorted_ra_targets.find((t) => findInRange(c, [getObjectById(t[0])!], 3).length > 0);

    // @ts-ignore
    if (ra_target) c.rangedAttack(getObjectById(ra_target[0]));
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
