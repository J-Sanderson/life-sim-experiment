var canvas = document.getElementById("world");
var ctx = canvas.getContext("2d");
var cells = 45;
var cellSize = 10;
var maxMotive = 100;
var speed = 250;

function rand(max) {
  return Math.floor(Math.random() * max);
}

function drawWorld() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (var i = 0; i < cells; i++) {
    for (var j = 0; j < cells; j++) {
      ctx.beginPath();
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 0.4;
      ctx.rect(i * cellSize, j * cellSize, cellSize, cellSize);
      ctx.stroke();
    }
  }

  items.food.draw();
  items.water.draw();
  items.bed.draw();
  creature.draw();
}

/*---------- OBJECTS ----------*/

function Position(x, y) {
  this.x = x;
  this.y = y;
}

function Brain(fullness, hydration, energy) {
  this.fullness = fullness;
  this.hydration = hydration;
  this.energy = energy;
}

function Entity(x, y, color) {
  this.position = new Position(x, y);
  this.color = color;
}

Entity.prototype = {
  constructor: Entity,
  draw: function() {
    ctx.beginPath();
    ctx.fillStyle = this.color;
    ctx.rect(
      this.position.x * cellSize,
      this.position.y * cellSize,
      cellSize,
      cellSize
    );
    ctx.fill();
  }
};

Item.prototype = Object.create(Entity.prototype);
Item.prototype.constructor = Item;

function Item(x, y, color) {
  Entity.call(this, x, y, color);
}

Creature.prototype = Object.create(Entity.prototype);
Creature.prototype.constructor = Creature;

function Creature(x, y, color, fullness, hydration, energy, goal, state) {
  Entity.call(this, x, y, color);
  this.brain = new Brain(fullness, hydration, energy);
  this.goal = goal;
  this.state = state;
}

/*---------- STATES ----------*/

function stateDrinking() {
  planDrink();
  if (creature.brain.hydration >= maxMotive) {
    creature.brain.hydration = maxMotive;
    creature.state = "moving";
  }
}

function stateEating() {
  planEat();
  if (creature.brain.fullness >= maxMotive) {
    creature.brain.fullness = maxMotive;
    creature.state = "moving";
  }
}

function stateSleeping() {
  planSleep();
  //low chance to decay other motives
  //wake up if they become very low
  if (creature.brain.hydration > 0 && Math.random() > 0.75) {
    creature.brain.hydration--;
    if (creature.brain.hydration < 10) {
      creature.state = "moving";
      creature.goal = "drink";
    }
  }
  if (creature.brain.fullness > 0 && Math.random() > 0.75) {
    creature.brain.fullness--;
    if (creature.brain.fullness < 10) {
      creature.state = "moving";
      creature.goal = "eat";
    }
  }
  if (creature.brain.energy >= maxMotive) {
    creature.brain.energy = maxMotive;
    creature.state = "moving";
  }
}

function stateMoving() {
  motiveDecay();
  switch (creature.goal) {
    case "drink":
      planMoveToItem(items.water);
      break;
    case "eat":
      planMoveToItem(items.food);
      break;
    case "rest":
      planMoveToItem(items.bed);
      break;
    case "wander":
      planMoveRandomly();
  }
  //did it find something?
  if (
    creature.position.x === items.water.position.x &&
    creature.position.y === items.water.position.y &&
    creature.goal === 'drink'
  ) {
    creature.state = "drinking";
  }
  if (
    creature.position.x === items.food.position.x &&
    creature.position.y === items.food.position.y &&
    creature.goal === 'eat'
  ) {
    creature.state = "eating";
  }
  if (
    creature.position.x === items.bed.position.x &&
    creature.position.y === items.bed.position.y &&
    creature.goal === 'rest'
  ) {
    creature.state = "sleeping";
  }
}

/*---------- PLANS ----------*/

function planMoveRandomly() {
  direction = Math.floor(Math.random() * 8 + 1);
  //TODO don't waste a turn if it can't move
  switch (direction) {
    case 1:
      //NW
      if (creature.position.x > 0 && creature.position.y > 0) {
        creature.position.x--;
        creature.position.y--;
      }
      break;
    case 2:
      //N
      if (creature.position.y > 0) {
        creature.position.y--;
      }
      break;
    case 3:
      //NE
      if (creature.position.x < cells - 1 && creature.position.y > 0) {
        creature.position.x++;
        creature.position.y--;
      }
      break;
    case 4:
      //E
      if (creature.position.x < cells - 1) {
        creature.position.x++;
      }
      break;
    case 5:
      //SE
      if (creature.position.x < cells - 1 && creature.position.y < cells - 1) {
        creature.position.x++;
        creature.position.y++;
      }
      break;
    case 6:
      //S
      if (creature.position.y < cells - 1) {
        creature.position.y++;
      }
      break;
    case 7:
      //SW
      if (creature.position.x > 0 && creature.position.y < cells - 1) {
        creature.position.x--;
        creature.position.y++;
      }
      break;
    case 8:
      //W
      if (creature.position.x > 0) {
        creature.position.x--;
      }
      break;
    default:
      console.err("Invalid movement value");
  }
}

function planMoveToItem(item) {
  if (item.position.x > creature.position.x) {
    creature.position.x++;
  }
  if (item.position.x < creature.position.x) {
    creature.position.x--;
  }
  if (item.position.y > creature.position.y) {
    creature.position.y++;
  }
  if (item.position.y < creature.position.y) {
    creature.position.y--;
  }
}

function planDrink() {
  creature.brain.hydration += 20; //drinking is fast!
}

function planEat() {
  if (creature.brain.hydration > 0) {
    creature.brain.hydration--; //eating makes you thirsty
  }
  creature.brain.fullness += 10;
}

function planSleep() {
  creature.brain.energy++;
}

/*---------- ACTION ----------*/

function tick() {
  //determine goal
  switch (getPriority()) {
    case "hydration":
      creature.goal = "drink";
      break;
    case "fullness":
      creature.goal = "eat";
      break;
    case "energy":
      creature.goal = "rest";
      break;
    default:
      creature.goal = "wander";
      break;
  }
  switch(creature.state) {
    case 'drinking':
      stateDrinking();
      break;
    case 'eating':
      stateEating();
      break;
    case 'sleeping':
      stateSleeping();
      break;
    default:
      stateMoving();
      break;
  }

  //update visible stats
  document.getElementById("full").innerHTML = creature.brain.fullness;
  document.getElementById("hydration").innerHTML = creature.brain.hydration;
  document.getElementById("energy").innerHTML = creature.brain.energy;
  document.getElementById("goal").innerHTML = creature.goal;
  document.getElementById("state").innerHTML = creature.state;
  drawWorld();
}

function motiveDecay() {
  for (motive in creature.brain) {
    //50/50 chance of decaying this turn
    if (creature.brain[motive] > 0 && Math.random() > 0.5) {
      creature.brain[motive]--;
    }
  }
}

function getPriority() {
  var lowest = maxMotive;
  var priority;
  for (motive in creature.brain) {
    if (creature.brain[motive] < lowest) {
      lowest = creature.brain[motive];
      priority = motive;
    }
  }
  if (lowest > maxMotive / 2) {
    priority = "none";
  }
  return priority;
}

//click to move creature
canvas.addEventListener("click", function(e) {
  var x = e.pageX - canvas.offsetLeft;
  var y = e.pageY - canvas.offsetTop;

  creature.position.x = Math.floor(x / 10);
  creature.position.y = Math.floor(y / 10);
  drawWorld();
});

/*---------- SETUP ----------*/

//init items
var items = {
  food: new Item(rand(cells), rand(cells), "green"),
  water: new Item(rand(cells), rand(cells), "blue"),
  bed: new Item(rand(cells), rand(cells), "purple")
};

//init creature
let creature = new Creature(
  rand(cells),
  rand(cells),
  "black",
  rand(maxMotive),
  rand(maxMotive),
  rand(maxMotive),
  "wander",
  "moving"
);

//visuals
canvas.width = cells * cellSize;
canvas.height = cells * cellSize;

drawWorld();

//move it about
var motion = setInterval(tick, speed);
