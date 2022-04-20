import { Creep, RoomPosition } from "game/prototypes";

import {
  findClosestByPath,
  findInRange,
  findPath, getCpuTime,
  getDirection,
  getObjectsByPrototype,
  getTerrainAt, getTicks
} from "game/utils";
import { BodyPart } from "arena/prototypes";
import { ATTACK, DirectionConstant, HEAL, RANGED_ATTACK, TERRAIN_WALL } from "game/constants";
import { searchPath } from "game/path-finder";

import { smq } from "../message/MQ";

import { CTX, Situation } from "../common";
import { Msg, MsgType } from "../message/common";
import { MESSAGE_TYPE_SITUATION } from "./SituationPlugin";
import { guid } from "../../utils/uuid";
import { create } from "domain";



import { Visual } from "game/visual";
import { arenaInfo } from "game";


interface Group {
  merge(other: Group): Group

  run(ctx: CTX): void

  members: SimpleGroupMember
}

interface SimpleGroupMember {
  tanks: Creep[],
  archers: Creep[]
  healers: Creep[],

}

interface TargetDescriptor {
  situation: Situation,
  target: RoomPosition | null,

}

class SimpleGroup implements Group {
  members: SimpleGroupMember;
  leader: Creep | null;
  task: TargetDescriptor;
  id: string;

  constructor(members: SimpleGroupMember) {
    this.members = members;
    this.leader = this.elect();
    this.task = {
      situation: Situation.PICK,
      target: null
    };
    this.id = guid();

    smq.register("situation", {
      on_message: (msg: Msg) => {


      }
    });

  }

  all(): Creep[] {
    return Object.values(this.members).flat();
  }

  elect(): Creep | null {
    console.log(Object.values(this.members).map(t=>t.length).reduce((pre,cur)=>pre+cur,0))
    this.members.tanks = this.members.tanks.filter(creep => creep.exists);
    this.members.archers = this.members.archers.filter(creep => creep.exists);
    this.members.healers = this.members.healers.filter(creep => creep.exists);

    if (this.members.healers.length > 0)
      return this.members.healers[0];
    if (this.members.archers.length > 0)
      return this.members.archers[0];
    if (this.members.tanks.length > 0)
      return this.members.tanks[0];


    //merge to other group
    return null;
  }

  merge(other: Group): Group {
    this.members.tanks = this.members.tanks.concat(other.members.tanks);
    this.members.archers = this.members.archers.concat(other.members.archers);
    this.members.healers = this.members.healers.concat(other.members.healers);
    return this;
  }

  run(ctx: CTX): void {

    if (!this.leader || !this.leader.exists) {
      console.log("leader no exists!");
      this.leader = this.elect();
      if (!this.leader) {
        console.log("cannot elect new leader!");
        return;
      }
      console.log(` elect a new leader:${this.leader}`);
    }
    this.leader.leader = true;

    let alert_range = 7;

    let keep_range = 4;

    let sorted_alert_enemys = findInRange(this.leader, getObjectsByPrototype(Creep).filter(creep => !creep.my), alert_range)
      .map(creep=>{
        return { c:creep,p:findPath(this.leader!,creep).length }})
      .sort((p1, p2) => p1.p -p2.p);

    if (sorted_alert_enemys.length==0){
      let bp = findClosestByPath( this.leader,getObjectsByPrototype(BodyPart),{ignore:this.all()})
      console.log(bp)
      if (bp)
        this.leader.next_move_pos = this.next_step(bp);

      //pick body part
    }else{
      let neareast_enemy = sorted_alert_enemys[0].c;
      new Visual().line(this.leader, neareast_enemy, { color: "#ff0000" });
      this.all().forEach(creep => creep.concentrate_attack = neareast_enemy);

      //c1.hits / c1.hitsMax - c2.hits / c2.hitsMax

      let sorted_ranged_hits_creeps = this.all().filter(creep=>creep.hits!=creep.hitsMax).sort((c1, c2) => c1.hits / c1.hitsMax - c2.hits / c2.hitsMax);
      if (sorted_ranged_hits_creeps.length > 0) this.all().forEach(creep => creep.concentrate_heal = sorted_ranged_hits_creeps[0]);


      let next_move_pos = keep_distance(this.leader, neareast_enemy, alert_range, keep_range);
      if (next_move_pos)
        this.leader.next_move_pos = next_move_pos;
    }




    this.group_move(this.leader);

  }

  group_move(leader: Creep) {
    let leader_next_move_pos;
    if (!leader.next_move_pos) {
      leader_next_move_pos = leader;
    } else {
      leader_next_move_pos = leader.next_move_pos;
    }

    let current_members = this.all();
    //let member_idx = 0;

    let current_creep_count = current_members.length;

    //let square_w = Math.sqrt(current_creep_count) + 1;


    let next_pos_square = this._available_pos(leader_next_move_pos, current_creep_count);
    next_pos_square = next_pos_square.slice(1,next_pos_square.length).reverse()
    current_members = current_members.filter(creep=>!creep.leader)

    for (let i = 0; i < current_creep_count-1; i++) {

      new Visual().text("=", next_pos_square[i], { font: "15px" });
      current_members[i].next_move_pos = next_pos_square[i];
    }

    // for (let i = 0; i < square_w; i++) {
    //   for (let j = 0; j < square_w; j++) {
    //
    //     if (member_idx >= current_creep_count) return;
    //
    //     let creep = current_members[member_idx++];
    //
    //     if (creep == this.leader) continue;
    //
    //     let next_move_pos = { x: leader_next_move_pos.x + j, y: leader_next_move_pos.y + i };
    //     if (TERRAIN_WALL != getTerrainAt(next_move_pos)) {
    //       creep.next_move_pos = next_move_pos;
    //     } else {
    //       creep.next_move_pos = this.leader;
    //     }
    //
    //   }
    // }
  }

  _available_pos(center: RoomPosition, pos_count: number): RoomPosition[] {
    let res = [];
    let queue = [center];
    let map: boolean[][] = new Array(100).fill(new Array(100).fill(false));

    while (queue.length != 0 && pos_count != 0) {
      let pos = queue.shift()!;


      res.push(pos);
      pos_count--;



      square.map(offset => {
          return { x: offset[0] + pos.x, y: offset[1] + pos.y };
        }
      ).filter(pos => {
        return in_bound(pos.x, 0, 100)
          && in_bound(pos.y, 0, 100)
          && getTerrainAt(pos) != TERRAIN_WALL
          && !map[pos.y][pos.x];
      }).forEach(pos => {
        map[pos.y][pos.x]=true;
        queue.push(pos)
      });

    }
    return res;

  }

  next_step(target: RoomPosition | null): RoomPosition | null {

    if (!target) return null;

    let search_res = findPath(this.leader!, target, { ignore: this.all() });

    if (search_res.length > 0) {

      return search_res[0];

    } else {
      return null;
    }
  }
}



export const group_plugin = (

  function() {
    let group: SimpleGroup[] = [];
    return {
      name: "group_plugin",
      init(ctx: CTX): void {

        let tanks: Creep[] = ctx.my_creeps.filter(creep => creep.body.some(body_part => body_part.type === ATTACK));
        let healers: Creep[] = ctx.my_creeps.filter(creep => creep.body.some(body_part => body_part.type === HEAL));
        let archers: Creep[] = ctx.my_creeps.filter(creep => creep.body.some(body_part => body_part.type === RANGED_ATTACK));
        console.log(healers.length)
        group = group.concat([

          // new SimpleGroup({ tanks:[], archers:archers.slice(0,2), healers:healers.slice(0,2) }),
          // new SimpleGroup({ tanks:[], archers:archers.slice(2,4), healers:healers.slice(2,4) }),
          // new SimpleGroup({ tanks:[], archers:archers.slice(4,6), healers:healers.slice(4,6) }),
          new SimpleGroup({ tanks, archers, healers})
        ]);
      },
      //new SimpleGroup({tanks:tanks.slice(1,2),archers:archers.slice(3,6),healers:healers.slice(3,6)})
      run(ctx: CTX): void {
        group.forEach(group => group.run(ctx));
      }
    };
  }()
);


const square = [
  [-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1] ,[-1, 1], [-1, 0],
];

function in_bound(num: number, min: number, max: number): boolean {
  return num >= min && num < max;
}

/**
 * multi-flee implements by BFS
 * simple than a* but may walk into a dead end
 */
function keep_distance(my: RoomPosition, target: RoomPosition, bfs_dis: number, distance: number): RoomPosition | null {
  if (distance > bfs_dis) {
    console.log(`error: distance:${distance} can not greater than bfs_dis:${bfs_dis}`);
    return null;
  }
  if (bfs_dis >= 50) {
    console.log(`error:  bfs_dis:${bfs_dis} cannot greater than 50`);
    return null;
  }


  let path = findPath(my, target);
  if (path.length > distance) {
    return path[0];//getDirection(path[0].x - my.x,path[0].y-my.y)
  }
  if (path.length == distance) return null;

  let dis_map = bfs(target, bfs_dis);

  let offset = { x: my.x - target.x, y: my.y - target.y };

  let sorted_dis = square.map(pos => {
      return { x: pos[0] + offset.x + bfs_dis, y: pos[1] + offset.y + bfs_dis };
    }
  ).filter(pos => pos.x >= 0 && pos.x < bfs_dis * 2 + 1 && pos.y >= 0 && pos.y < bfs_dis * 2 + 1)
    .sort((p1, p2) => dis_map[p2.y][p2.x] - dis_map[p1.y][p1.x]);

  if (sorted_dis.length > 0 && findPath(sorted_dis[0],target).length>path.length) {
    let next_pos_offset = sorted_dis[0];
    return { x: next_pos_offset.x + target.x - bfs_dis, y: next_pos_offset.y + target.y - bfs_dis };
    //let dir = getDirection(next_pos_offset.x-offset.x-bfs_dis,next_pos_offset.y-offset.y-bfs_dis);
    //return dir;
  }
  return null;


}

function bfs(center: RoomPosition, bfs_dis: number): number[][] {
  let queue = [{ pos: center, offset: [bfs_dis, bfs_dis], dis: 0 }];
  let map: boolean[][] = [];
  let res: number[][] = [];
  for (let i = 0; i < 2 * bfs_dis + 1; i++) {
    let col = [];
    let res_col = [];
    for (let j = 0; j < 2 * bfs_dis + 1; j++) {
      col.push(false);
      res_col.push(-1);
    }
    map.push(col);
    res.push(res_col);
  }

  while (queue.length > 0) {
    let pos = queue.shift()!;
    let off_x = pos.offset[0];
    let off_y = pos.offset[1];

    if (!map[off_y][off_x]) {

      //new Visual().text(pos.dis, pos.pos, { font: "15px" });

      map[off_y][off_x] = true;
      res[off_y][off_x] = pos.dis;

      let pos_x = pos.pos.x;
      let pos_y = pos.pos.y;

      square.map(off => {
        return {
          pos: { x: pos_x + off[0], y: pos_y + off[1] },
          offset: [off_x + off[0], off_y + off[1]],
          dis: pos.dis + 1
        };
      }).filter(pos => in_bound(pos.pos.x, 0, 100)
        && in_bound(pos.pos.y, 0, 100)
        && in_bound(pos.offset[0], 0, 2 * bfs_dis + 1)
        && in_bound(pos.offset[1], 0, 2 * bfs_dis + 1)
        && !map[pos.offset[1]][pos.offset[0]]
        && getTerrainAt(pos.pos) != TERRAIN_WALL)
        // &&
        //.forEach(pos=>console.log(`x:${pos.offset[0]},y:${pos.offset[1]},:row:${map[pos.offset[1]]},tile:${map[pos.offset[1]][pos.offset[0]]}`))
        .forEach(pos => queue.push(pos));
    }
  }
  return res;

}




