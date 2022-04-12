import { Msg, MsgBody, Subscriber } from "./common";


class SimpleMQ {

  register_list:{[key:string]:((msg:Msg)=>void)[]};
  current_message_queue:{[key:string]:Msg[]};
  next_message_queue:{[key:string]:Msg[]};
  constructor() {
    this.register_list = {};
    this.current_message_queue={};
    this.next_message_queue={};
  }

  publish(topic:string,msg_type:string,msg: MsgBody): void {
    if (!this.next_message_queue[topic]) {
      this.next_message_queue[topic]=[];
    }


    this.next_message_queue[topic].push({type:msg_type,body:msg});
  }

  register(topic:string,subscriber: Subscriber): void {

    if (!this.register_list[topic]){
      this.register_list[topic]=[];
    }
    this.register_list[topic].push(subscriber.on_message)

  }

  run(): void {
    for (let topic in this.current_message_queue){
      let messages = this.current_message_queue[topic];
      for (let on_message of this.register_list[topic]){
        messages.forEach(message=>on_message(message))
      }
    }

    this.current_message_queue = this.next_message_queue;
    this.next_message_queue = {};
  }


}
export let smq = new SimpleMQ();
