import { Creep, RoomPosition } from "game/prototypes";
import { CTX, Situation } from "../common";
import { findClosestByPath, getObjectsByPrototype, getTerrainAt } from "game/utils";
import { BodyPart } from "arena/prototypes";
import { ATTACK, HEAL, RANGED_ATTACK, TERRAIN_WALL } from "game/constants";
import { searchPath } from "game/path-finder";


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

  constructor(members: SimpleGroupMember) {
    this.members = members;
    this.leader = this.elect();
    this.task = {
      situation: Situation.PICK,
      target: null
    };
  }

  all(): Creep[] {
    return Object.values(this.members).flat();
  }

  elect(): Creep | null {
    this.members.tanks = this.members.tanks.filter(creep => creep.exists);
    this.members.archers = this.members.archers.filter(creep => creep.exists);
    this.members.healers = this.members.healers.filter(creep => creep.exists);
    if (this.members.tanks.length > 0) return this.members.tanks[0];
    else if (this.members.archers.length > 0) return this.members.archers[0];
    //merge to other group
    else return null;
  }

  merge(other: Group): Group {
    this.members.tanks=this.members.tanks.concat(other.members.tanks);
    this.members.archers=this.members.archers.concat(other.members.archers);
    this.members.healers=this.members.healers.concat(other.members.healers);
    return this;
  }

  run(ctx: CTX): void {

    if (!this.leader?.exists) {
      this.leader = this.elect();
      if (!this.leader) return;
    }

    if (!ctx.situation) return;
    let target;
    switch (ctx.situation) {
      case Situation.PICK:
        let body_parts = getObjectsByPrototype(BodyPart);

        if (body_parts.length > 0) {
          target = findClosestByPath(this.leader, body_parts);

        }else {
          target = null
        }
        break;
      case Situation.DEFENSE:
        target = ctx.nearest_enemy;

        break;
      case Situation.BLOCK:
        target = ctx.nearest_enemy;
        break;
      case Situation.ATTACK:
        target = ctx.enemy_flag;

    }

    this.leader.next_move_pos = this.next_step(target);
    this.group_move(this.leader)

  }

  group_move(leader:Creep){
    let current_members = this.all()
    let formation_idx = 0;
    for (let idx in current_members){
      let creep = current_members[idx];
      if (creep == leader)continue;
      let pos_mask = formation[formation_idx++];

      let leader_next_move_pos = leader.next_move_pos;

      let next_move_pos = leader.next_move_pos !=null? {x:leader_next_move_pos!.x+pos_mask[0],y:leader_next_move_pos!.y+pos_mask[1]}:null;
      if (next_move_pos){
        if (TERRAIN_WALL!=getTerrainAt(next_move_pos)){
          creep.next_move_pos = next_move_pos
        }
      }
    }

  }
  next_step(target:RoomPosition|null):RoomPosition|null{
    if (!target)return null;
    let search_res = searchPath(this.leader!,target);
    if (search_res.path.length>0){

      return search_res.path[0];

    }else{
      return  null;
    }
  }

}
const formation =[[1,-1],[1,0],[1,1],[2,-1],[2,0],[2,1]];

export const group_plugin = (

  function(){
    let group:SimpleGroup[] = [];
    return {
      name: "group_plugin",
      init(ctx: CTX): void {

        let tanks: Creep[] = ctx.my_creeps.filter(creep => creep.body.some(body_part => body_part.type === ATTACK));
        let healers: Creep[] = ctx.my_creeps.filter(creep => creep.body.some(body_part => body_part.type === HEAL));
        let archers: Creep[] = ctx.my_creeps.filter(creep => creep.body.some(body_part => body_part.type === RANGED_ATTACK));

        group = group.concat([new SimpleGroup({tanks:tanks.slice(0,1),archers:archers.slice(0,3),healers:healers.slice(0,3)}),
          new SimpleGroup({tanks:tanks.slice(1,2),archers:archers.slice(3,6),healers:healers.slice(3,6)})])
      },
      run(ctx: CTX): void {
        group.forEach(group=>group.run(ctx))
      }
    }
  }()
)




