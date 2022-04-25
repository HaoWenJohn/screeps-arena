import { Creep, RoomPosition, StructureTower } from "game/prototypes";
import {
  DirectionConstant,
  TERRAIN_WALL,
  TOP,
  TOP_RIGHT,
  RIGHT,
  BOTTOM_RIGHT,
  BOTTOM,
  BOTTOM_LEFT,
  LEFT,
  TOP_LEFT, ATTACK
} from "game/constants";

import { findClosestByPath, findPath, getDirection, getObjectById, getRange, getTerrainAt } from "game/utils";
// @ts-ignore
import { Visual } from "game/visual";
import { getObjectsByPrototype, findInRange } from "game/utils";
import { in_bound, square, vec_add, vec_mul_num, vec_sub, Vector } from "../common";
import { searchPath } from "game/path-finder";
import { healable } from "./combact/common";
import { BodyPart } from "arena/prototypes";
import { bfs } from "./bfs_map";


const _COHESIONFORCE = 0;
const _ALIGNMENTFORCE = 0;
const _SEPARATIONFORCE = 1;
const GROUPRANGE = 4;
const _ENEMYFORCE = 1;

function run(){
  let my_Creeps = getObjectsByPrototype(Creep).filter(c => c.my);

  let targets = getObjectsByPrototype(BodyPart);
  let leader = my_Creeps.filter(c => c.body.some(b => b.type == ATTACK))[0];
  my_Creeps = my_Creeps.filter(c=>c!=leader)
  if (leader && targets.length > 0) {


    let res: number[][];


    let fleet = [leader]
      .map(c => {
        return { x: c.x, y: c.y };
      })
      .map(c => square.map(s => {
        return { x: s[0] + c.x, y: s[1] + c.y };
      }).filter(s => in_bound(s)))
      .flat();
    res = bfs(fleet);


    leader.moveTo(targets[0]);

    getObjectsByPrototype(Creep)
      .filter(c => c.my )
      .map(c => {
          return {
            creep: c, poses: square.map(s => {
              return {
                x: s[0] + c.x
                , y: s[1] + c.y
              };
            }).filter(s => in_bound(s))
          };
        }
      ).forEach(c => {
      let next_poses;
      if (c.poses.length == 1) next_poses = [c.poses[0]];
      else next_poses = c.poses.sort((first, second) => res[second.y][second.x] - res[first.y][first.x]);
      next_poses = next_poses.filter(p => res[p.y][p.x] < res[c.creep.y][c.creep.x]);

      if (next_poses.length > 0) {
        let next_pos = next_poses[0];
        c.creep.plan_dir = { x: next_pos.x, y: next_pos.y };

      } else {
        c.creep.plan_dir = { x: c.creep.x, y: c.creep.y };

      }
    });
    group_move(my_Creeps);
  }
}
function flee(creep: Creep, enemy_creeps: Creep[]) {
  let force_from_enemy = enemy_creeps.reduce((force_sum, enemy) => {
    let u = { x: creep.x - enemy.x, y: creep.y - enemy.y };
    let u_n = norm(u);
    let force = _ENEMYFORCE / magnitude(u);
    let force_n = { x: u_n.x * force, y: u_n.y * force };
    return { x: force_sum.x + force_n.x, y: force_sum.y + force_n.y };
  }, { x: 0, y: 0 });
  let next_dir = getDirection(force_from_enemy.x, force_from_enemy.y);
  let next_pos = direction_to_pos(creep, next_dir);
  if (next_pos) {
    if (getTerrainAt(next_pos) != TERRAIN_WALL) {
      creep.move(next_dir);
      return;
    }
  }

  let target = findClosestByPath(creep, enemy_creeps);
  if (target) {
    // @ts-ignore
    next_pos = searchPath(creep, { pos: target, range: 5 }, {
      flee: true,
      ignore: getObjectsByPrototype(Creep).filter(c => c.my)
    }).path[0];
    if (next_pos)
      creep.move(getDirection(next_pos.x - creep.x, next_pos.y - creep.y));
  }
}


function leader_move(leader: Creep, creeps: Creep[], enemy_creeps: Creep[], target: RoomPosition) {
  if (creeps.length == 0) return;

  if (leader.hitsMax - leader.hits >= 800) {
    flee(leader, enemy_creeps);
    return;
  }
  if (creeps.reduce((dis_sum, c) => dis_sum + getRange(leader, c), 0) / creeps.length >= 5) {
    return;
  }

  leader.moveTo(target);


}

export function group_move(creeps: Creep[]) {

  let map = [...Array(100)].map(e => [...Array(100).fill("")]);

  creeps.forEach(c => {
    c.adjusted_dir = { x: 0, y: 0 };
    map[c.y][c.x] = c.id;
    c.force = { x: 0, y: 0 };
  });

  creeps.forEach(c => {
    //let force1 = cohesion(c, creeps.filter(cr => cr.id !== c.id));
    //let force2 = alignment(c, creeps.filter(cr => cr.id !== c.id));
    //let force3 = separation(c, creeps.filter(cr => cr.id !== c.id));

    let creep: Creep | null = getObjectById(map[c.plan_dir.y][c.plan_dir.x]);
    if (creep) {

      let dir = norm(vec_sub(c.plan_dir, c));
      creep.force = vec_add(creep.force, vec_mul_num(dir, _SEPARATIONFORCE));
    }
  });

  creeps.forEach(c => {
    c.adjusted_dir = vec_add(vec_sub(c.plan_dir, c), c.force);
    let d = c.adjusted_dir;
    let next_dirs = get_directions(d.x, d.y);

    let dir_pos_pair = next_dirs.map(
      d=>{return {
        dir:d,
        pos:direction_to_pos({ x: c.x, y: c.y }, d)
      }}
    ).find(p=>p.pos && p.pos!.x >= 0 && p.pos!.y <100 && p.pos!.y >= 0 && p.pos!.y < 100 && getTerrainAt(p.pos!) != TERRAIN_WALL );

    if (dir_pos_pair){

      c.move(dir_pos_pair.dir);
    }
  });

}

function get_directions(dx: number, dy: number):DirectionConstant[]{
  let adx = Math.abs(dx), ady = Math.abs(dy);
  if (dx == 0 && dy ==0)return [];
  if (dx==0 && dy<0)return [TOP];
  if (dx==0 && dy>0)return [BOTTOM];
  if (dy==0 && dx<0)return [LEFT];
  if (dy==0 && dx>0)return [RIGHT];
  let res = [];
  let d = ady/adx;
  //左右优先
  if (d<=0.577){
    if (dx>0){
      if (dy>0)return [RIGHT,BOTTOM_RIGHT,BOTTOM]
      else return [RIGHT,TOP_RIGHT,TOP]
    }else {
      if (dy>0)return [LEFT,BOTTOM_LEFT,BOTTOM]
      else return [LEFT,TOP_LEFT,TOP]
    }
  }
  //斜向优先
  if (d>0.577 && d <= 1.732){
    if (dx>0){
      if (dy>0)return [BOTTOM_RIGHT,RIGHT,BOTTOM]
      else return [TOP_RIGHT,RIGHT,TOP]
    }else {
      if (dy>0)return[BOTTOM_LEFT,LEFT,BOTTOM]
      else return [TOP_LEFT,LEFT,TOP]
    }
  }
  //上下优先
  if (dx>0){
    if (dy>0){
      return [BOTTOM,BOTTOM_RIGHT,RIGHT]
    }else return [TOP,TOP_RIGHT,RIGHT]
  }else {
    if (dy>0)return [BOTTOM,BOTTOM_LEFT,LEFT]
    else return [TOP,TOP_LEFT,LEFT]
  }

}

export function flocking_move(leader: Creep, creeps: Creep[], target: RoomPosition) {
  let enemy_creeps = getObjectsByPrototype(Creep).filter(c => !c.my);
  leader_move(leader, creeps, enemy_creeps, target);
  group_move(creeps);
}


export function norm(v: Vector): Vector {
  let m = magnitude(v);
  if (m === 1 || m === 0) return v;
  return {
    x: v.x / m,
    y: v.y / m
  };
}

//chebyshev distance
export function magnitude(v: Vector): number {
  return Math.max(Math.abs(v.x), Math.abs(v.y));
}


export function cohesion(c: Creep, neighbours: Creep []): Vector {
  if (neighbours.length == 0) return { x: 0, y: 0 };

  let pos_sum = neighbours.reduce((pre, cur) => {
    return { x: pre.x + cur.x, y: pre.y + cur.y };
  }, { x: 0, y: 0 });

  let center = { x: pos_sum.x / neighbours.length, y: pos_sum.y / neighbours.length };


  let to_center_vec = norm({ x: center.x - c.x, y: center.y - c.y });

  let dir = norm(c.plan_dir);

  let vec_dot = to_center_vec.x * dir.x + to_center_vec.y * dir.y;
  let m_x = to_center_vec.x > 0 ? 1 : to_center_vec.x == 0 ? 0 : -1;
  let m_y = to_center_vec.y > 0 ? 1 : to_center_vec.y == 0 ? 0 : -1;

  if (Math.abs(vec_dot) > 1) return { x: 0, y: 0 };

  let impact_rate = Math.acos(vec_dot) / Math.PI;

  return { x: m_x * impact_rate * _COHESIONFORCE, y: m_y * impact_rate * _COHESIONFORCE };
}

export function alignment(c: Creep, neighbours: Creep[]): Vector {
  if (neighbours.length == 0) return { x: 0, y: 0 };

  let dir_sum = neighbours.reduce((pre, cur) => {
    return { x: pre.x + cur.plan_dir.x, y: pre.y + cur.plan_dir.y };
  }, { x: 0, y: 0 });

  let avg_dir = norm({ x: dir_sum.x / neighbours.length, y: dir_sum.y / neighbours.length });

  let dir = norm(c.plan_dir);

  let vec_dot = avg_dir.x * dir.x + avg_dir.y * dir.y;
  if (Math.abs(vec_dot) > 1) return { x: 0, y: 0 };
  let impact_rate = Math.acos(vec_dot) / Math.PI;

  let m_x = avg_dir.x > 0 ? 1 : avg_dir.x == 0 ? 0 : -1;
  let m_y = avg_dir.y > 0 ? 1 : avg_dir.y == 0 ? 0 : -1;

  return { x: m_x * impact_rate * _ALIGNMENTFORCE, y: m_y * impact_rate * _ALIGNMENTFORCE };

}

export function separation(c: Creep, neighbours: Creep[]): Vector {
  return neighbours.map(n => {
    let force_dir = { x: c.x - n.x, y: c.y - n.y };
    let mag = magnitude(force_dir);
    let m_x = force_dir.x > 0 ? 1 : force_dir.x == 0 ? 0 : -1;
    let m_y = force_dir.y > 0 ? 1 : force_dir.y == 0 ? 0 : -1;
    return { x: m_x * _SEPARATIONFORCE / mag, y: m_y * _SEPARATIONFORCE / mag };
  }).reduce((pre, cur) => {
    return { x: pre.x + cur.x, y: pre.y + cur.y };
  }, { x: 0, y: 0 });
}

function direction_to_pos(c: RoomPosition, next_dir: DirectionConstant): RoomPosition | undefined {
  let next_pos;
  switch (next_dir) {
    case TOP:
      next_pos = { x: c.x, y: c.y - 1 };
      break;
    case TOP_RIGHT:
      next_pos = { x: c.x + 1, y: c.y - 1 };
      break;
    case TOP_LEFT:
      next_pos = { x: c.x - 1, y: c.y - 1 };
      break;
    case LEFT:
      next_pos = { x: c.x - 1, y: c.y };
      break;
    case RIGHT:
      next_pos = { x: c.x + 1, y: c.y };
      break;
    case BOTTOM_RIGHT:
      next_pos = { x: c.x + 1, y: c.y + 1 };
      break;
    case BOTTOM_LEFT:
      next_pos = { x: c.x - 1, y: c.y + 1 };
      break;
    case BOTTOM:
      next_pos = { x: c.x, y: c.y + 1 };
      break;
  }
  return next_pos;
}
