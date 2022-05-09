import { Area, Group } from "./Group";
import { findClosestByPath, findInRange, getObjectsByPrototype, getRange, getTicks } from "game/utils";
import { CostMatrix, searchPath } from "game/path-finder";
import { RoomPosition } from "game/prototypes";




export class Ra_h extends Group{
  free:boolean = true;


  can_rush_home(){
    let super_defense = this.enemy_creeps.filter(c=>c.x == this.enemy_flag.x && c.y == this.enemy_flag.y && c.hitsMax>1000).length ==0;
    let path_len = searchPath(this.creeps[0],this.enemy_flag,{costMatrix:this.terran_cost}).path.length;
    return this.creeps.length>=3 && path_len !=0 && path_len<this.enemy_group_to_enemy_flag_shortest_dis && super_defense
  }
  combact():void{

    let flee_dis;
    if (this.need_heal(0.6)){
      flee_dis = 5
    }else{
      flee_dis = 3;
    }

    if (this.can_rush_home()){

      this.move_to(this.enemy_flag)
      return;
    }


    let ranged_enemys = findInRange(this.creeps[0],this.enemy_creeps,10);

    if (ranged_enemys.length>0){
      if (getRange(this.creeps[0],this.my_flag)<25){
        this.move_to(this.my_flag);
      }else{
        let closest_enemy = findClosestByPath(this.creeps[0],ranged_enemys,{costMatrix:this.terran_cost});
        if (closest_enemy && getRange(this.creeps[0],closest_enemy)>flee_dis){
          this.move_to(closest_enemy)
        }else
          this.flee(ranged_enemys,flee_dis)
      }

    }else {
      if(getTicks()>1700){
        this.move_to(this.enemy_flag)
        return;
      }
      let ranged_enemys = findInRange(this.center,this.enemy_creeps,25);
      if (ranged_enemys.length>0){
        this.move_to(ranged_enemys[0])
      }else{
        let p :RoomPosition;
        switch (this.area){
          case Area.top:
            p = {x:64,y:33}
            break;
          case Area.bottom:
            p = {x:34,y:65}
            break;
          case Area.flag:
            p = this.center
            break;
        }
        this.move_to(p)
      }
    }
  }


}
