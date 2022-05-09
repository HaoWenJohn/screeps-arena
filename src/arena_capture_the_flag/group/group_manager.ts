import { Creep } from "game/prototypes";
import { findInRange, findPath, getObjectsByPrototype } from "game/utils";
import {  Ra_h } from "./Ra_h";
import { A } from "./A";
import { Flag } from "arena/prototypes";
import { CostMatrix, searchPath } from "game/path-finder";
import { Area } from "./Group";
import { vec_add, vec_mul_num } from "../common";

export class group_manager{
  enemy_creeps :Creep[];
  my_creeps:Creep[];
  g1:Ra_h;
  g2:Ra_h;
  g3:Ra_h;
  g4:A;
  g5:A;
  my_flag:Flag;
  enemy_flag:Flag;
  pre_enemy_group:number = 0;
  constructor(enemy_creeps :Creep[],my_creeps:Creep[]) {
    this.enemy_creeps = enemy_creeps;
    this.my_creeps = my_creeps
    this.my_flag = getObjectsByPrototype(Flag).filter(f => f.my)[0];
    this.enemy_flag = getObjectsByPrototype(Flag).filter(f => !f.my)[0]
    let healer = my_creeps.filter(c=>c.body.some(b=>b.type == "heal"))
    let attack =my_creeps.filter(c=>c.body.some(b=>b.type == "attack"))
    let archer =my_creeps.filter(c=>c.body.some(b=>b.type == "ranged_attack"))
    this.g1 = new Ra_h(archer.slice(0,2).concat(healer.slice(0,2)),enemy_creeps,Area.top);
    this.g2 = new Ra_h(archer.slice(2,4).concat(healer.slice(2,4)),enemy_creeps,Area.bottom);
    this.g3 = new Ra_h(archer.slice(4,6).concat(healer.slice(4,6)),enemy_creeps,Area.flag);
    this.g4 = new A(attack.slice(0,1),enemy_creeps,Area.top);
    this.g5 = new A(attack.slice(1,2),enemy_creeps,Area.bottom);
  }
  run(enemy_creeps :Creep[],terran_cost:CostMatrix,dynamic_cost: CostMatrix){
    this.enemy_creeps = enemy_creeps;


    // let v = new Visual();
    let enemy_group = Array.from(this.enemy_formation(this.enemy_creeps)).filter(s=>s.size>=2);
    let group_dis = enemy_group.map(g=>Array.from(g)).map(g=>{
      return vec_mul_num(g.reduce((sum,c)=>vec_add(sum,c),{x:0,y:0}),1/g.length);
    }).map(center_pos =>  searchPath(this.enemy_flag,center_pos).path.length)
      .sort((f,s)=>f-s);
    let shortest_dis =100;
    if(group_dis.length>0)
      shortest_dis = group_dis[0];
    // let idx = 0;
    // enemy_set.forEach(s=>{
    //   s.forEach(c=>v.text(String(idx),c))
    //   idx++;
    // })
     [this.g1,this.g2,this.g3,this.g4,this.g5].forEach(g=>g.run(terran_cost,dynamic_cost,shortest_dis));
    // let current_enemy_groups = Array.from(enemy_set).filter(s=>s.size>=4);
    // if (current_enemy_groups.length!=this.pre_enemy_group){
    //   current_enemy_groups.forEach(s=>{
    //     let group = combact_group.find(g=>g.free);
    //     if (group)
    //       group.set_enemys(Array.from(s))
    //   })
    //   this.pre_enemy_group = current_enemy_groups.length;
    // }


  }


  _enemy_formation(total_enemys:Creep[],c:Creep,set:Set<Creep>){
    let sur_e = findInRange(c,total_enemys,4)
    sur_e.filter(s=>!set.has(s))
      .forEach(s=>{
        set.add(s)
        this._enemy_formation(total_enemys,s,set)
      })
  }
  enemy_formation(total_enemys:Creep[]){
    let register :{[key:string]:Set<Creep>}={}

    for (let i = 0 ;i<total_enemys.length;i++){
      if (!register[total_enemys[i].id]){
        let set = new Set([total_enemys[i]]);
        this._enemy_formation(total_enemys,total_enemys[i],set)
        set.forEach(c=>{
          register[c.id]=set
        })
      }
    }
    return new Set(Object.values(register))
  }
}
