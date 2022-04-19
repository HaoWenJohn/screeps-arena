import { Creep, RoomPosition, StructureTower } from "game/prototypes";
import { DirectionConstant, TERRAIN_WALL ,TOP,TOP_RIGHT,RIGHT,BOTTOM_RIGHT,BOTTOM,BOTTOM_LEFT,LEFT,TOP_LEFT} from "game/constants";

import { findPath, getDirection, getTerrainAt } from "game/utils";
// @ts-ignore
import { Visual } from "game/visual";
import { getObjectsByPrototype ,findInRange} from "game/utils";

import {Flag} from "arena"
import { Vector } from "../common";



export function test() {
  let enemy_flag = getObjectsByPrototype(Flag).filter(f=>!f.my)[0];
  let my_creeps = getObjectsByPrototype(Creep).filter(c=>c.my);

  let v = new Visual();




  my_creeps.forEach(c=>{
    c.dir =findPath(c,enemy_flag,{ignore:my_creeps})[0];
  });

  my_creeps.forEach(c=>{
    let force1 = cohesion(c,findInRange(c,my_creeps.filter(s=>s!==c),2));
    let force2 = alignment(c,findInRange(c,my_creeps.filter(s=>s!==c),2));

    if (!c.next_dir)c.next_dir={x:0,y:0};
    c.next_dir.x = c.dir.x-c.x+force1.x+force2.x;
    c.next_dir.y = c.dir.y-c.y+force1.y+force2.y;
    let d =c.next_dir;
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
      default:
        next_pos = c;
        break;
    }
    if (next_pos.x<0||next_pos.y>=100||next_pos.y<0||next_pos.y>=100 || getTerrainAt(next_pos)==TERRAIN_WALL)
      c.move(getDirection(c.dir.x-c.x,c.dir.y-c.y));
    else
      c.move(next_dir);
  })

}


export function norm(v:Vector):Vector{
  let m = Math.sqrt(v.x * v.x +v.y * v.y);
  if (m===1)return v;
  return {
    x:v.x/m,
    y:v.y/m
  }
}


const _COHESIONFORCE = 0.8;
const _ALIGNMENTFORCE = 0.7;
export function cohesion(c:Creep,neighbours:Creep []):Vector{
  let pos_sum = neighbours.reduce((pre,cur)=>{
    return {x:pre.x+cur.x,y:pre.y+cur.y}
  },{x:0,y:0});

  //let center = {x:pos_sum.x/neighbours.length,y:pos_sum.y/neighbours.length};

  //new Visual().circle(center,{radius:0.3});

  let to_center_vec = norm({x:pos_sum.x/neighbours.length-c.x,y:pos_sum.y/neighbours.length-c.y});

  let dir = norm(c.dir);

  let vec_dot = to_center_vec.x * dir.x +to_center_vec.y * dir.y;

  let impact_rate = Math.acos(vec_dot) / Math.PI;

  let m_x= to_center_vec.x>0?1:to_center_vec.x==0?0:-1;
  let m_y= to_center_vec.y>0?1:to_center_vec.y==0?0:-1;

  return {x:m_x * impact_rate * _COHESIONFORCE,y:m_y * impact_rate *_COHESIONFORCE}
}

export function alignment(c:Creep,neighbours:Creep[]):Vector{

  let dir_sum = neighbours.reduce((pre,cur)=>{
    return {x:pre.x+cur.dir.x,y:pre.y+cur.dir.y}
  },{x:0,y:0});

  let avg_dir = norm({x:dir_sum.x/neighbours.length,y:dir_sum.y/neighbours.length});

  let dir = norm(c.dir);

  let vec_dot = avg_dir.x * dir.x +avg_dir.y * dir.y;

  let impact_rate = Math.acos(vec_dot) / Math.PI;

  let m_x= avg_dir.x>0?1:avg_dir.x==0?0:-1;
  let m_y= avg_dir.y>0?1:avg_dir.y==0?0:-1;

  return {x:m_x * impact_rate * _ALIGNMENTFORCE,y:m_y * impact_rate *_ALIGNMENTFORCE}

}
