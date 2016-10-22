import 'babel-polyfill';
import 'zone.js/dist/zone-node';
import { Subject, BehaviorSubject, Observable } from 'rxjs/Rx';
import * as lodash from 'lodash';
declare const Zone: any;


/////////////////////// PREPARE ///////////////////////
class Dispatcher<T> extends Subject<T>{
  constructor() { super() }
}
class Provider<T> extends Subject<T>{
  constructor() { super() }
}

interface Position {
  x: number
  y: number
}


/////////////////////// ACTION /////////////////////// 
class AliveAction {
  constructor(public positions: Position[]) { }
}
class NextAction {
  constructor() { }
}
type Action = AliveAction | NextAction;


/////////////////////// LIFE ///////////////////////
class Life {
  rounds: Position[]
  nextState: boolean

  constructor(
    public x: number,
    public y: number,
    public live: boolean = false,
  ) {
    this.rounds = this.generateRounds(x, y)
  }

  generateRounds(x, y): Position[] {
    const left = { x, y: y - 1 };
    const right = { x, y: y + 1 };
    const leftTop = Object.assign({}, left, { x: x - 1 });
    const centerTop = { x: x - 1, y };
    const rightTop = Object.assign({}, right, { x: x - 1 });
    const leftBottom = Object.assign({}, left, { x: x + 1 });
    const centerBottom = { x: x + 1, y };
    const rightBottom = Object.assign({}, right, { x: x + 1 });
    return [leftTop, centerTop, rightTop, left, right, leftBottom, centerBottom, rightBottom];
  }

  nextLiveState(populate: number) {
    if (populate >= 2 && populate < 4) {
      this.nextState = true
    } else {
      this.nextState = false
    }
  }

  executeNext() {
    this.live = this.nextState
  }
}


/////////////////////// LIFE CONTAINER ///////////////////////
class LifeContainer {
  private lifes: Life[]

  constructor(xCount: number, yCount: number) {
    this.lifes = []
    const xRange = lodash.range(0, xCount)
    const yRange = lodash.range(0, yCount)
    xRange.forEach(x => {
      yRange.forEach(y => {
        this.addLife(new Life(x, y))
      })
    })
  }

  addLife(life: Life): void {
    this.lifes.push(life);
  }

  vitalize(position: Position): void {
    this.lifes
      .filter(life => life.x === position.x && life.y === position.y)
      .map(life => life.live = true);
  }

  nextLifeCycle(): void {
    this.lifes.forEach(life => {
      const populate = life.rounds.reduce((p, position) => {
        const targetLife = this.select(position.x, position.y)
        return targetLife && targetLife.live ? p + 1 : p
      }, 0)
      life.nextLiveState(populate)
    })
    this.lifes.forEach(life => life.executeNext())
  }

  getLifes(): Life[] {
    return this.lifes;
  }

  select(x: number, y: number): Life | null {
    const lifes = this.lifes.filter(life => life.x === x && life.y === y)
    return lifes.length ? lifes[0] : null
  }
}


/////////////////////// MAIN ///////////////////////
Zone.current.fork({ name: 'myZone' }).runGuarded(() => {

  const lifeContainer = new LifeContainer(3, 3);

  const dispathcer$ = new Dispatcher<Action>();
  const provider$ = new BehaviorSubject<LifeContainer>(lifeContainer);


  dispathcer$
    .scan<LifeContainer>((container, action) => {
      if (action instanceof AliveAction) {
        action.positions.forEach(position => container.vitalize(position))
        return container
      } else if (action instanceof NextAction) {
        container.nextLifeCycle()
        return container
      } else {
        return container
      }
    }, lifeContainer)
    .map(container => lodash.cloneDeep(container))
    .subscribe(container => {
      provider$.next(container)
    })


  provider$
    .subscribe(container => {
      console.log(container)
    })


  dispathcer$.next(new AliveAction([{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }, { x: 99, y: 99 }]));
  dispathcer$.next(new NextAction());
  dispathcer$.next(new NextAction());
  dispathcer$.next(new NextAction());
  dispathcer$.next(new NextAction());
  dispathcer$.next(new NextAction());

});
