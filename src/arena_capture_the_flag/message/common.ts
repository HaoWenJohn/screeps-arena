export enum MsgType {

}

export interface Msg {
  type: string
  body: MsgBody


}

export interface MsgBody {
  [type: string]: {}
}

export interface Subscriber {
  on_message(msg: Msg): void;
}









