import { Creep, RoomPosition, StructureTower } from "game/prototypes";
import { DirectionConstant, TERRAIN_WALL ,TOP,TOP_RIGHT,RIGHT,BOTTOM_RIGHT,BOTTOM,BOTTOM_LEFT,LEFT,TOP_LEFT} from "game/constants";

import { findPath, getDirection, getTerrainAt } from "game/utils";
// @ts-ignore
import { Visual } from "game/visual";
import { getObjectsByPrototype ,findInRange} from "game/utils";
import { Vector } from "../common";


const _COHESIONFORCE = 2;
const _ALIGNMENTFORCE = 0.3;
const _SEPARATIONFORCE =0.4;
const GROUPRANGE = 4;


export function flocking_move(creeps:Creep[],target:RoomPosition){
  creeps.forEach(c=>{
    c.plan_dir =findPath(c,target,{ignore:creeps})[0];
    c.adjusted_dir = {x:0,y:0}
  });
  creeps.forEach(c=>{
    let neighbours = findInRange(c,creeps.filter(s=>s!==c),GROUPRANGE);

    let force1 = cohesion(c,neighbours);
    let force2 = alignment(c,neighbours);
    let force3 = separation(c,neighbours);

    c.adjusted_dir.x = c.plan_dir.x-c.x+force1.x+force2.x+force3.x;
    c.adjusted_dir.y = c.plan_dir.y-c.y+force1.y+force2.y+force3.y;
    let d =c.adjusted_dir;
    let next_pos;
    let next_dir = getDirection(d.x,d.y);

    switch (next_dir){
      case TOP:
        next_pos = {x:c.x,y:c.y-1};
        break;
      case TOP_RIGHT:
        next_pos = {x:c.x+1,y:c.y-1};
        break;
      case TOP_LEFT:
        next_pos = {x:c.x-1,y:c.y-1};
        break;
      case LEFT:
        next_pos = {x:c.x-1,y:c.y};
        break;
      case RIGHT:
        next_pos = {x:c.x+1,y:c.y};
        break;
      case BOTTOM_RIGHT:
        next_pos = {x:c.x+1,y:c.y+1};
        break;case BOTTOM_LEFT:
        next_pos = {x:c.x-1,y:c.y+1};
        break;
      case BOTTOM:
        next_pos = {x:c.x,y:c.y+1};
        break;
    }
    //如果调整的方向出界或者撞墙就按原计划执行
    if (!next_pos || next_pos.x<0||next_pos.y>=100||next_pos.y<0||next_pos.y>=100 || getTerrainAt(next_pos)==TERRAIN_WALL ){

      c.move(getDirection(c.plan_dir.x-c.x,c.plan_dir.y-c.y));
    }
    else{
      c.move(next_dir);
    }
  })
}




export function norm(v:Vector):Vector{
  let m =magnitude(v);
  if (m===1 || m ===0)return v;
  return {
    x:v.x/m,
    y:v.y/m
  }
}
export function magnitude(v:Vector):number{
  return  Math.sqrt(v.x * v.x +v.y * v.y);
}


export function cohesion(c:Creep,neighbours:Creep []):Vector{
  if (neighbours.length==0)return {x:0,y:0};

  let pos_sum = neighbours.reduce((pre,cur)=>{
    return {x:pre.x+cur.x,y:pre.y+cur.y}
  },{x:0,y:0});

  let center = {x:pos_sum.x/neighbours.length,y:pos_sum.y/neighbours.length};


  let to_center_vec =norm({x:center.x-c.x,y:center.y-c.y});

  let dir = norm(c.plan_dir);

  let vec_dot = to_center_vec.x * dir.x +to_center_vec.y * dir.y;
  let m_x= to_center_vec.x>0?1:to_center_vec.x==0?0:-1;
  let m_y= to_center_vec.y>0?1:to_center_vec.y==0?0:-1;

  if (Math.abs(vec_dot)>1)return {x:0,y:0};

  let impact_rate = Math.acos(vec_dot) / Math.PI;

  return {x:m_x * impact_rate * _COHESIONFORCE,y:m_y * impact_rate *_COHESIONFORCE}
}

export function alignment(c:Creep,neighbours:Creep[]):Vector{
  if (neighbours.length==0)return {x:0,y:0};

  let dir_sum = neighbours.reduce((pre,cur)=>{
    return {x:pre.x+cur.plan_dir.x,y:pre.y+cur.plan_dir.y}
  },{x:0,y:0});

  let avg_dir = norm({x:dir_sum.x/neighbours.length,y:dir_sum.y/neighbours.length});

  let dir = norm(c.plan_dir);

  let vec_dot = avg_dir.x * dir.x +avg_dir.y * dir.y;
  if (Math.abs(vec_dot)>1)return {x:0,y:0};
  let impact_rate = Math.acos(vec_dot) / Math.PI;

  let m_x= avg_dir.x>0?1:avg_dir.x==0?0:-1;
  let m_y= avg_dir.y>0?1:avg_dir.y==0?0:-1;

  return {x:m_x * impact_rate * _ALIGNMENTFORCE,y:m_y * impact_rate *_ALIGNMENTFORCE}

}

export function  separation(c:Creep,neighbours:Creep[]):Vector{
  return neighbours.map(n=>{
    let force_dir = {x:c.x-n.x,y:c.y-n.y};
    let mag = magnitude(force_dir);
    let m_x= force_dir.x>0?1:force_dir.x==0?0:-1;
    let m_y= force_dir.y>0?1:force_dir.y==0?0:-1;
    return {x:m_x * _SEPARATIONFORCE /mag,y:m_y * _SEPARATIONFORCE /mag}
  }).reduce((pre,cur)=>{return {x:pre.x+cur.x,y:pre.y+cur.y}},{x:0,y:0})
}
