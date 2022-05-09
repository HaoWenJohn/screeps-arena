import { Area, Group } from "./Group";
import { findClosestByPath, findInRange, getObjectsByPrototype, getRange, getTicks } from "game/utils";
import { BodyPart, Flag } from "arena/prototypes";
import { CostMatrix, searchPath } from "game/path-finder";
import { Creep } from "game/prototypes";


export class A extends Group{
  combact() {
    if(getTicks()>1700){
      this.move_to(this.enemy_flag)
      return;
    }
    if (this.need_heal(0.8)){
      this.move_to(this.my_flag);
      return;
    }


    // let flee_dis = 5;
    // let ranged_enemys = findInRange(this.creeps[0],this.enemy_creeps,flee_dis);
    // if (ranged_enemys.length>0){
    //   this.flee(ranged_enemys,flee_dis)
    // }else{
    //
    // }
    let ranged_enemys = findInRange(this.creeps[0],this.enemy_creeps,10);
    if (ranged_enemys.length>0){
      this.move_to(findClosestByPath(this.creeps[0],ranged_enemys))
    }else{
      let move_count = this.creeps[0].body.reduce((sum,bp)=>bp.type=="move" && bp.hits>0?sum+1:sum,0)
      let need_move:boolean;
      need_move = move_count / this.creeps[0].body.length <=0.5;
      let tar = getObjectsByPrototype(BodyPart).filter(bp=>getRange(bp,this.center)<=25);
      if (tar.length>0 && need_move){
        tar =tar.filter(bp=>bp.type=="move")
      }
      if (tar.length>0){
        let closest_tar = findClosestByPath(this.creeps[0],tar,{costMatrix:this.terran_cost})
        this.move_to(closest_tar,{costMatrix:this.terran_cost})
      }else this.move_to(this.center)
    }

  }

}
