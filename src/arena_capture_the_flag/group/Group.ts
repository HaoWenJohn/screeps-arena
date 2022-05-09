import { Creep, RoomPosition } from "game/prototypes";
import { CostMatrix, FindPathOpts, searchPath } from "game/path-finder";
import {
  findClosestByPath,
  findInRange,
  getDirection,
  getObjectsByPrototype,
  getRange,
  getTerrainAt
} from "game/utils";
import { in_bound, ranged_attackable } from "../common";
// @ts-ignore
import{Visual} from 'game/visual';
import { Flag } from "arena/prototypes";
import {
  BOTTOM,
  BOTTOM_LEFT,
  BOTTOM_RIGHT,
  DirectionConstant,
  LEFT,
  RIGHT,
  TOP,
  TOP_LEFT,
  TOP_RIGHT
} from "game/constants";
import { ifError } from "assert";

export abstract class Group{
  creeps:Creep[];
  enemy_creeps:Creep[]

  ext_terran = [[0,0],[-1,-1],[-1,0],[0,-1]];
  format = [[0,0],[1,0],[0,1],[1,1]];
  area:Area;
  center:RoomPosition;
  enemy_flag:Flag;
  my_flag:Flag;
  leader :Creep|undefined;
  enemy_group_to_enemy_flag_shortest_dis:number
  v:Visual= new Visual()
  dynamic_cost:CostMatrix
  terran_cost:CostMatrix
  constructor(creeps:Creep[],enemy_creeps:Creep[],area:Area) {

    this.creeps=  creeps;
    this.leader = this.creeps.find(c=>c.body.some(bp=>bp.type=="attack"));
    this.enemy_creeps= enemy_creeps;

    this.my_flag = getObjectsByPrototype(Flag).filter(f => f.my)[0];
    this.area = area;
    this.center = this.get_center(this.area);
    this.enemy_flag = getObjectsByPrototype(Flag).filter(f => !f.my)[0];
    this.terran_cost  =new CostMatrix
    this.dynamic_cost = new CostMatrix
    this.enemy_group_to_enemy_flag_shortest_dis = 100;
  }
  get_center(area:Area){
    let center:RoomPosition;
    switch (area) {
      case Area.top:
        center = { x: 75, y: 25 }
        break;
      case Area.bottom:
        center = { x: 25, y: 75 }
        break;
      case Area.flag:
        center = this.my_flag.x > 50 ? { x: 91, y: 91 } : { x: 8, y: 8 }
        break;
    }
    return center;
  }
  matrix_add(dynamic_cost:CostMatrix,static_cost:CostMatrix){
    let res = static_cost.clone()
    for (let i = 0 ;i<100;i++){
      for (let j = 0;j<100;j++){
        if (res.get(i,j)!=255)
          res.set(i,j,dynamic_cost.get(i,j)+res.get(i,j))
      }
    }
    return res;
  }
  set_cost(terran_cost:CostMatrix,dynamic_cost:CostMatrix){
    this.terran_cost = terran_cost;
    this.dynamic_cost = dynamic_cost
  }
  abstract combact():void;
  run(terran_cost:CostMatrix,dynamic_cost:CostMatrix,enemy_group_to_enemy_flag_shortest_dis:number){
    this.v = new Visual()
    this.enemy_group_to_enemy_flag_shortest_dis = enemy_group_to_enemy_flag_shortest_dis;
    this.creeps  =  this.creeps.filter(c=>c.exists);
    if (this.creeps.length>0){
      this.set_cost(terran_cost,dynamic_cost)
      this.combact()
    }

  }
  reformat(next_dir:DirectionConstant){
    switch (next_dir){
      case 7:
      case 8:
      case 1:
      case 2:
      case 3:
        if (ranged_attackable(this.creeps[0])){this.creeps=this.creeps.reverse()}
        break;
      default:
        if (!ranged_attackable(this.creeps[0])){this.creeps=this.creeps.reverse()}

        break;
    }
  }
  flee(enemys:Creep[],flee_dis:number){
    let flee_tar = enemys.map(e=>{return{pos:e,range:flee_dis}});

    let flee_pos = searchPath(this.creeps[0],flee_tar,{flee:true,costMatrix:this.terran_cost}).path;
    if (flee_pos.length>0){
      //this.reformat(getDirection(flee_pos[0].x - this.creeps[0].x,flee_pos[0].y - this.creeps[0].y))
      for (let i = 0 ;i<this.creeps.length;i++){
        this.creeps[i].moveTo({x:flee_pos[0].x+this.format[i][0],y:flee_pos[0].y+this.format[i][1]})
      }
    }else {
      this.move_to(this.creeps[0])
      console.log("no flee path")
    }
  }
  _change_pos(f:number,s:number){
    let tmp = this.creeps[f];
    this.creeps[f] = this.creeps[s];
    this.creeps[s]  =tmp;
  }

  change_leader_pos(target:RoomPosition){
    let tar_dir;

    tar_dir= getDirection(target.x-this.leader!.x,target.y-this.leader!.y);


    let idx = this.creeps.indexOf(this.leader!);
    let len = this.creeps.length;

    if (tar_dir == LEFT ){
      if (idx ==1){
        this._change_pos(0,1)
      }else if (idx ==3){
        this._change_pos(2,3)
      }
    }
    if (tar_dir == RIGHT){
      if (idx == 0 && len>1){
        this._change_pos(0,1);
      }else if (idx==2){
        if (len==3)
          this._change_pos(1,2)
        else this._change_pos(2,3)
      }
    }
    if (tar_dir == TOP){
      if (idx==2){
        this._change_pos(0,2);
      }else if (idx==3){
        this._change_pos(1,3)
      }
    }
    if (tar_dir==BOTTOM){
      if (idx==0){
        if (len>2){
          this._change_pos(0,2)
        }
      }else if (idx==1){
        if (len==3){
          this._change_pos(1,2)
        }else if (len==4){
          this._change_pos(1,3)
        }
      }
    }
    if (tar_dir == TOP_LEFT){
      if (idx==1){
        this._change_pos(0,1)
      }
      if (idx==2){
        this._change_pos(0,2)
      }
      if (idx==3){
        this._change_pos(0,3)
      }
    }
    if (tar_dir == TOP_RIGHT){
      if (idx==0 && len>1){
        this._change_pos(0,1)
      }
      if (idx==2){
        this._change_pos(1,2)
      }
      if (idx==3){
        this._change_pos(1,3)
      }
    }
    if (tar_dir == BOTTOM_RIGHT){
      if (idx==0&&len==4){
        this._change_pos(0,3)
      }
      if (idx==1 && len==4){
        this._change_pos(1,3)
      }
      if (idx==2 && len==4){
        this._change_pos(2,3)
      }

    }
    if (tar_dir == BOTTOM_LEFT){
      if (idx==0 && len>2){
        this._change_pos(0,2)
      }
      if (idx==1 && len>2){
        this._change_pos(1,2)
      }
      if (idx==3){
        this._change_pos(3,2)
      }
    }
  }
  move_to(target:RoomPosition,opts?:FindPathOpts){
    if (!target)return;

    if (!this.can_group_move())return;

    //if (this.leader)
      //this.change_leader_pos(target);
    let opt;
    if (opts)
      opt = opts;
    else opt = {costMatrix:this.terran_cost};
    let line =searchPath(this.creeps[0],target,opt);
    let next_pos = line.path[0];
    if (!next_pos) {

      next_pos = this.creeps[0];
    }

    this.v.poly(line.path)



    for (let i = 0 ;i<this.creeps.length;i++){
      let p = {x:next_pos.x+this.format[i][0],y:next_pos.y+this.format[i][1]}
      if (this.creeps[i].x!= p.x ||this.creeps[i].y!= p.y)
        this.creeps[i].moveTo(p)
        this.terran_cost.set(p.x,p.y,255)
    }
  }

  can_group_move(){
    return !this.creeps.find(c=>c.fatigue>0)
  }
  need_heal(heal_rate:number){
    return this.creeps.map(c=>c.hits/c.hitsMax).filter(r=>r<heal_rate).length>0
  }
}

export enum Area{
  top,
  bottom,
  flag
}
