import { Creep, RoomPosition, StructureTower } from "game/prototypes";
import { Vector } from "./common";
import { BodyPart, Flag } from "arena/prototypes";
import {
  findClosestByPath, findClosestByRange,
  findInRange,
  findPath,
  getDirection,
  getObjectById,
  getObjectsByPrototype, getRange
} from "game/utils";
import { CostMatrix, FindPathResult, PathStep, searchPath } from "game/path-finder";
import { HEAL, RANGED_ATTACK } from "game/constants";

enum Attacker_State {
  pick,
  find_heal,
  attack
}

enum Flee_Res {
  moved,
  no_need_move,
  no_path
}

abstract class StateMachine {
  c: Creep;
  cost: CostMatrix;
  threaten: number[][];
  enemy: Creep[];
  my: Creep[];
  current_map:string[][];
  next_map:string[][];
  heal:number[][];
  constructor(c: Creep, cost: CostMatrix, threaten: number[][],heal:number[][], enemy: Creep[], my: Creep[],current_map:string[][],next_map:string[][]) {
    this.c = c;
    this.cost = cost;
    this.threaten = threaten;
    this.enemy = enemy;
    this.my = my;
    this.current_map=current_map;
    this.next_map = next_map;
    this.heal = heal;
  }

  abstract run(): void;
  threaten_greater_than_heal(){
    return this.threaten[this.c.y][this.c.x]>this.heal[this.c.y][this.c.x]
  }
  move_to(target:RoomPosition){
    return move_to(this.c,target,this.my,this.current_map,this.next_map,this.cost)
  }

  _full_hits() {
    return 1-hits_rate(this.c)  < 0.0001;
  }

  find_heal(flee_dis:number) {
    if (this.threaten_greater_than_heal()){
      let flee_res = this.flee_enemys(flee_dis);
      switch (flee_res) {
        case Flee_Res.moved:
          return;
      }
    }

    let healer = findClosestByRange(this.c, this.my.filter(c => c.role == "heal"));
    if (healer){
      this.move_to(healer)
    }else {
      this.move_to(getObjectsByPrototype(Flag).filter(f => f.my)[0]);
    }
  }

  flee_enemys(dis: number): Flee_Res {
    let range_enemy = findInRange(this.c, this.enemy, dis);
    let flee_enemy = range_enemy.map(e => {
      return { pos: e, range: dis };
    });
    let cc = this.cost.clone();
    if (range_enemy.length > 0) {
      let re_find_count = 3;
      let flee_path:FindPathResult;
      let option_pos;
      let next;
      while (re_find_count--){
        flee_path = searchPath(this.c, flee_enemy, { costMatrix: cc, flee: true ,ignore:this.my});
        if (flee_path.path.length>0){

          let next_pos = flee_path.path[0];

          if (this.next_map[next_pos.y][next_pos.x]==""){

            // @ts-ignore
            let obscale:Creep = getObjectById(this.current_map[next_pos.y][next_pos.x]);
            if (obscale){

              option_pos=obscale;
              cc.set(option_pos.x,option_pos.y,255)
            }else {

              next = next_pos;
              option_pos=null;
              break;
            }
          }else {
            cc.set(next_pos.x,next_pos.y,255);
          }
        }
      }
      if (option_pos){

        next= option_pos;
      }
      if (next){

        this.next_map[next.y][next.x] = this.c.id;
        this.c.next_move_pos = next;
      }


      if (flee_path!.incomplete) {
        return Flee_Res.no_path;
      }
      if (this.c.next_move_pos) {
        return Flee_Res.moved;
      }
    }
    return Flee_Res.no_need_move;

  }
}

export class Attacker extends StateMachine {
  state: Attacker_State = Attacker_State.pick;


  run() {
    if (hits_rate(this.c) < 0.75 && this.state != Attacker_State.find_heal) {
      this.state = Attacker_State.find_heal;
    }

    if (this._full_hits() && this.state == Attacker_State.find_heal) {
      this.state = Attacker_State.pick;
    }

    switch (this.state) {
      case Attacker_State.attack:
        this.attack();
        break;
      case Attacker_State.find_heal:
        this.find_heal(5);
        break;
      case Attacker_State.pick:
        this.pick_bp();
        break;
    }
  }

  pick_bp() {
    let bp = getObjectsByPrototype(BodyPart);
    if (bp.length > 0) {
      this.move_to(bp[0])
    }
  }


  attack() {
    let enemy = findClosestByPath(this.c, this.enemy);
    if (enemy)
      this.move_to(enemy)

  }
}

enum Heal_State {
  rh,
  h
}

export class Heal extends StateMachine {
  state: Heal_State = Heal_State.h;

  run(): void {
    if (hits_rate(this.c) < 0.75 && this.state != Heal_State.rh) {
      this.state = Heal_State.rh;
    }

    if (this._full_hits() && this.state == Heal_State.rh) {
      this.state = Heal_State.h;
    }

    switch (this.state) {
      case Heal_State.h:
        this.h();
        break;
      case Heal_State.rh:
        this.rh();
        break;
    }

  }

  h() {
    if (findInRange(this.c,this.enemy,5).length>0){
      if (this.threaten[this.c.y][this.c.x]>this.heal[this.c.y][this.c.x]){
        this.flee_enemys(5)
      }
    }else
      this.find_wounded();
    // switch (flee_res) {
    //   case Flee_Res.moved:
    //     break;
    //   case Flee_Res.no_need_move:
    //     let ranged_heal = findInRange(this.c, this.my, 3).filter(c => c.hits < c.hitsMax);
    //     if (ranged_heal.length > 0) {
    //       this.move_to(ranged_heal.sort((f, s) => f.hits / f.hitsMax - s.hits / s.hitsMax)[0])
    //     } else {
    //
    //     }
    //     break;
    //   case Flee_Res.no_path:
    //     this.move_to(getObjectsByPrototype(Flag).filter(f => f.my)[0])
    //     break;
    // }


  }

  rh() {
    if (findInRange(this.c,this.enemy,5).length>0){
      if (this.threaten[this.c.y][this.c.x]>this.heal[this.c.y][this.c.x])
        this.flee_enemys(5)
    }else
      this.find_wounded();
    // switch (flee_res) {
    //   case Flee_Res.moved:
    //     break;
    //   case Flee_Res.no_path:
    //     this.find_wounded();
    //     break;
    //   case Flee_Res.no_need_move:
    //     this.move_to(getObjectsByPrototype(Flag).filter(f => f.my)[0])
    //
    //     break;
    // }


  }

  find_wounded() {
    let tar = findClosestByRange(this.c, this.my.filter(c => c.hits / c.hitsMax < 0.8));
    if (!tar) { // @ts-ignore
      tar = this.my.find(c => c.role == "ranged_attack");
    }
    if (tar)
      this.move_to(tar)

  }
}

enum Ra_State {
  find_heal,
  ra
}

export class Ra extends StateMachine {
  state: Ra_State = Ra_State.ra;

  run(): void {

    let rate = hits_rate(this.c);
    if (rate>0.5){
      if (rate<0.75  && this.threaten[this.c.y][this.c.x]>this.heal[this.c.y][this.c.x] && this.state != Ra_State.find_heal){
        this.state = Ra_State.find_heal;
      }
    }else {
      this.state = Ra_State.find_heal;
    }


    if (this._full_hits() && this.state == Ra_State.find_heal) {

      this.state = Ra_State.ra;
    }

    switch (this.state) {
      case Ra_State.find_heal:
        this.find_heal(5);
        break;
      case  Ra_State.ra:
        this.ra();
        break;

    }
  }

  ra() {
    let closest_enemy = findClosestByPath(this.c, this.enemy, { ignore: this.my });

    if (closest_enemy) {

      let range = getRange(this.c, closest_enemy);

      if (range > 3){

        this.move_to(closest_enemy)
        return;
      }

      else if (range == 0) {

        return;
      }
      if (this.threaten[this.c.y][this.c.x]>this.heal[this.c.y][this.c.x]){
        let flee_res = this.flee_enemys(3);
        switch (flee_res) {
          case Flee_Res.moved:

            break;
          case Flee_Res.no_need_move:

            break;
          case Flee_Res.no_path:

            this.move_to(getObjectsByPrototype(Flag).filter(f => f.my)[0])
            break;
        }
      }

    }else {

      this.move_to(getObjectsByPrototype(Flag).filter(f=>!f.my)[0])

    }
  }

}

function hits_rate(c: Creep): number {
  return c.hits / c.hitsMax;
}
function move_to(c:Creep,p:RoomPosition,my_creeps:Creep[],current_map:string[][],next_map:string[][],cost:CostMatrix,){
  let re_find_count =3;
  let cc = cost.clone();

  while (re_find_count-->0){
    if (c.id=="27"){
      console.log("1")
    }
    let path = searchPath(c,p,{ignore:my_creeps,costMatrix:cc,heuristicWeight:1.2});
    if (path.path.length>0){
      let next_pos = path.path[0];
      if (c.id=="27"){
        console.log(`next pos :${next_pos.x},${next_pos.y}`)
      }
      // @ts-ignore
      let obscale:Creep = getObjectById(current_map[next_pos.y][next_pos.x]);
      if (obscale) {
        if (c.id=="27"){
          console.log(`exist obscale!`)
        }
        cc.set(obscale.x, obscale.y, 255);
      }else {
        if (next_map[next_pos.y][next_pos.x]==""){
          if (c.id=="27"){
            console.log(`regist pos!`)
          }
          next_map[next_pos.y][next_pos.x] = c.id;
          c.next_move_pos = next_pos;
          break;
        }else{
          if (c.id=="27"){
            console.log(`pos had been registed!`)
          }
          cc.set(next_pos.x, next_pos.y, 255);
        }
      }
    }

  }




}
