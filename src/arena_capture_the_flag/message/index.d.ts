


declare module 'MQ'{
  export enum MsgType {

  }
  export interface Msg<T extends MsgType>{

    body:MsgBody[T]

    //   AttackMsg
    //   |HealMsg;
    // attack:AttackMsg,
    // heal:HealMsg

  }
  export interface  MsgBody{
    [type:string]:{}
  }
  export interface Subscriber<T extends MsgType>{
    on_message(msg:Msg<T>):void;
  }

  export interface MQ {
    publish<T extends MsgType>(topic:string,msg: Msg<T>):void;
    register<T extends MsgType>(topic:string,subscriber:Subscriber<T>):void
    run():void
  }
}






