var canvas = document.getElementById("world");
var ctx = canvas.getContext("2d");
var cells = 15;
var cellSize = 30;
var maxMotive = 100;
var speed = 250;
var motiveDecayThresholds = {
  energy: 0.75,
  fullness: 0.5,
  hydration: 0.5,
};

function rand(max) {
  return Math.floor(Math.random() * max);
}

function drawWorld() {
  //update visible stats
  document.getElementById("full").innerHTML = creature.brain.fullness;
  document.getElementById("hydration").innerHTML = creature.brain.hydration;
  document.getElementById("energy").innerHTML = creature.brain.energy;
  document.getElementById("goal").innerHTML = JSON.stringify(creature.goals);
  document.getElementById("agoal").innerHTML = creature.activeGoal;
  document.getElementById("state").innerHTML = creature.state;

  //draw world
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

function getGoalIndex(name) {
  return creature.goals.findIndex(function (goal) {
    return goal.name === name;
  });
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
  draw: function () {
    ctx.beginPath();
    ctx.fillStyle = this.color;
    ctx.rect(
      this.position.x * cellSize,
      this.position.y * cellSize,
      cellSize,
      cellSize
    );
    ctx.fill();
  },
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
  this.goals = [];
  this.activeGoal = "";
  this.state = state;
}

/*---------- GOALS ----------*/

function prioritiseGoal(goal) {
  creature.goals.forEach(function (g) {
    if (g.priority === 1) {
      g.priority++;
    }
  });
  var index = getGoalIndex(goal);
  if (index >= 0) {
    creature.goals[index].priority = 1;
  }
  creature.state = "moving"; //test
}

function deleteGoal(goal) {
  var index = getGoalIndex(goal);
  creature.goals.splice(index, 1);
}

//TODo need to better clean up goals that aren't needed any more
var goals = {
  // filters for now just look at the top priority motivation
  drink: {
    filter: function () {
      if (getPriority() === "hydration") {
        prioritiseGoal("drink");
      }
    },
    run: function () {
      if (creature.state === "moving") {
        stateMoving();
      }
      if (creature.state === "drinking") {
        stateDrinking();
      }
      if (creature.brain.hydration >= maxMotive) {
        deleteGoal("drink");
      }
    },
  },
  eat: {
    filter: function () {
      if (getPriority() === "fullness") {
        prioritiseGoal("eat");
      }
    },
    run: function () {
      if (creature.state === "moving") {
        stateMoving();
      }
      if (creature.state === "eating") {
        stateEating();
      }
      if (creature.brain.fullness >= maxMotive) {
        deleteGoal("eat");
      }
    },
  },
  rest: {
    filter: function () {
      if (getPriority() === "energy") {
        prioritiseGoal("rest");
      }
    },
    run: function () {
      if (creature.state === "moving") {
        stateMoving();
      }
      if (creature.state === "sleeping") {
        stateSleeping();
      }
      if (creature.brain.energy >= maxMotive) {
        deleteGoal("rest");
      }
    },
  },
  wander: {
    filter: function () {
      if (getPriority() === "none") {
        prioritiseGoal("wander");
      }
    },
    run: function () {
      stateMoving();
      //this is a default goal, it should delete itself if something more important pops up!
      if (creature.goals.length > 1) {
        deleteGoal("wander");
      }
    },
  },
};

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
  //TODO can we suspend the rest goal and reinstate it once the creature has eaten/drunk?
  if (creature.brain.hydration > 0 && Math.random() > 0.75) {
    creature.brain.hydration--;
    if (creature.brain.hydration < 10) {
      creature.state = "moving";
      creature.activeGoal = "drink";
    }
  }
  if (creature.brain.fullness > 0 && Math.random() > 0.75) {
    creature.brain.fullness--;
    if (creature.brain.fullness < 10) {
      creature.state = "moving";
      creature.activeGoal = "eat";
    }
  }
  if (creature.brain.energy >= maxMotive) {
    creature.brain.energy = maxMotive;
    creature.state = "moving";
  }
}

function stateMoving() {
  // motiveDecay();
  switch (creature.activeGoal) {
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
    creature.activeGoal === "drink"
  ) {
    creature.state = "drinking";
  }
  if (
    creature.position.x === items.food.position.x &&
    creature.position.y === items.food.position.y &&
    creature.activeGoal === "eat"
  ) {
    creature.state = "eating";
  }
  if (
    creature.position.x === items.bed.position.x &&
    creature.position.y === items.bed.position.y &&
    creature.activeGoal === "rest"
  ) {
    creature.state = "sleeping";
  }
}

/*---------- PLANS ----------*/

// NOTE: plans may be where the animation is incorporated, should this layer ever be implemented
// could basic animations (thought bubbles for mood) be added in future?

function planMoveRandomly() {
  var direction = Math.floor(Math.random() * 8 + 1);
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
  motiveDecay();
  filterGoals();
  drawWorld();
}

function motiveDecay() {
  //energy
  if (creature.state !== "sleeping" && creature.brain.energy > 0 && Math.random() > motiveDecayThresholds.energy) {
    creature.brain.energy--;
  }
  //hydration
  if (creature.state !== "drinking" && creature.brain.hydration > 0 && Math.random() > motiveDecayThresholds.hydration) {
    creature.brain.hydration--;
  }
  //fullness
  if (creature.state !== "eating" && creature.brain.fullness > 0 && Math.random() > motiveDecayThresholds.fullness) {
    creature.brain.fullness--;
  }
}

function getPriority() {
  var lowest = maxMotive;
  var priority;
  for (var motive in creature.brain) {
    if (creature.brain[motive] < lowest) {
      lowest = creature.brain[motive];
      priority = motive;
    }
  }
  //in general, only make a goal a strong priority if it's 10% of the max
  //this could later be related to personality traits (lazy, likes to eat, etc)
  if (lowest > maxMotive / 10) {
    priority = "none";
  }
  if (amIBusy()) {
    priority = "continue";
  }
  return priority;
}

function amIBusy() {
  return creature.state === "eating" || creature.state === "drinking" || creature.state === "sleeping";
}

function filterGoals() {
  // TODO - this should really get anything with a threshold value, just in order of priority
  var goalName;
  var priority = getPriority();
  switch (priority) {
    case "continue":
      // no change
      break;
    case "hydration":
      if (getGoalIndex("drink") < 0) {
        creature.goals.push({ name: "drink", priority: 1, suspended: false });
      }
      break;
    case "fullness":
      if (getGoalIndex("eat") < 0) {
        creature.goals.push({ name: "eat", priority: 1, suspended: false });
      }
      break;
    case "energy":
      if (getGoalIndex("rest") < 0) {
        creature.goals.push({ name: "rest", priority: 1, suspended: false });
      }
      break;
    default:
      if (getGoalIndex("wander") < 0) {
        creature.goals.push({ name: "wander", priority: 1, suspended: false });
      }
      break;
  }
  //run filters on each goal
  creature.goals.forEach(function (goal) {
    goals[goal.name].filter();
  });
  //sort by priority
  //TODO - changing the active goal causes the creature to get stuck, fix!
  creature.goals.sort(function (a, b) {
    return a.priority - b.priority;
  });
  //show active goal
  creature.activeGoal = creature.goals[0].name;
  //and run
  goals[creature.activeGoal].run();
}

//click to move creature
canvas.addEventListener("click", function (e) {
  var x = e.pageX - canvas.offsetLeft;
  var y = e.pageY - canvas.offsetTop;

  creature.position.x = Math.floor(x / cellSize);
  creature.position.y = Math.floor(y / cellSize);
  drawWorld();
});

/*---------- SETUP ----------*/

//init items
var items = {
  food: new Item(rand(cells), rand(cells), "green"),
  water: new Item(rand(cells), rand(cells), "blue"),
  bed: new Item(rand(cells), rand(cells), "purple"),
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

//move it about
var motion = setInterval(tick, speed);
