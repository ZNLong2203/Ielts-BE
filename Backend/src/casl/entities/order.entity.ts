export class Order {
  constructor(init?: Partial<Order>) {
    Object.assign(this, init);
  }
}
