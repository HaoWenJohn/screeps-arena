import { RoomPosition } from "game/prototypes";
import { getTerrainAt } from "game/utils";
import { TERRAIN_WALL } from "game/constants";
import { in_bound, square } from "../common";



export function bfs(origin_poses:{x:number,y:number}[]):number[][]{
  let register_map = [...Array(100)].map(e=>[...Array(100).fill(false)])

  let queue:{x:number,y:number,dis:number}[] = [];

  let res = [...Array(100)].map(e=>[...Array(100).fill(255)])

  origin_poses.forEach(p=>{
    queue.push({...p,dis:0});
    register_map[p.y][p.x]=true;
  });

  while (queue.length>0){
    let pos = queue.shift()!;
    res[pos.y][pos.x]=pos.dis
    square.map(s=>{
      return {x:s[0]+pos.x,y:s[1]+pos.y,dis:pos.dis+1}
    }).filter(s=>in_bound(s) && register_map[s.y][s.x] == false && getTerrainAt(s)!=TERRAIN_WALL)
      .forEach(s=>{
        queue.push(s)
        register_map[s.y][s.x] =true;
      })
  }
  return res;
}
