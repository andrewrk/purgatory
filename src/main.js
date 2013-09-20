var chem = require("chem");
var v = chem.vec2d;
var ani = chem.resources.animations;
var canvas = document.getElementById("game");
var engine = new chem.Engine(canvas);
engine.showLoadProgressBar();
engine.start();
canvas.focus();

chem.resources.on('ready', function () {
  var batch = new chem.Batch();
  var fpsLabel = engine.createFpsLabel();

  var lava = new chem.Sprite(ani.lava, {
    batch: batch,
    zOrder: 0,
    pos: v(100, 0),
  });
  var bgHud = chem.resources.images['hud_background.png'];
  var roomCenter = engine.size.scaled(0.5);
  var playerSprite = new chem.Sprite(ani.player, {
    batch: batch,
    zOrder: 4,
    pos: roomCenter.clone(),
  });
  var innerPlatform = new chem.Sprite(ani.inner_platform, {
    batch: batch,
    zOrder: 2,
    pos: roomCenter.clone(),
  });
  var outerPlatform = new chem.Sprite(ani.outer_platform, {
    batch: batch,
    zOrder: 1,
    pos: roomCenter.clone(),
  });
  var playerSpeed = 2.4;
  var doorSpeed = Math.PI / 240; // radians
  var doorPosRadius = 242;
  var doorSprite = new chem.Sprite(ani.door_active, {
    batch: batch,
    zOrder: 3,
  });
  var doorRadius = 40;
  var innerRadius = 207;
  var playerRadius = 14.5;
  var zombieRadius = 14.5;
  var levels = genLevels();
  var levelIndex = 0;
  var sawRadius = 35.5;

  var gameOver = false;

  var zombieSpeed = 0.85;

  // level state
  var doorAngle;
  var sawblades = [];
  var zombies = [];
  var orbitblades = [];

  startLevel();
  engine.on('update', function (dt, dx) {
    if (gameOver) return;

    var left = engine.buttonState(chem.button.KeyLeft) || engine.buttonState(chem.button.KeyA);
    var right = engine.buttonState(chem.button.KeyRight) || engine.buttonState(chem.button.KeyD);
    var up = engine.buttonState(chem.button.KeyUp) || engine.buttonState(chem.button.KeyW);
    var down = engine.buttonState(chem.button.KeyDown) || engine.buttonState(chem.button.KeyS);

    var desiredVector = v();
    if (left) {
      playerSprite.pos.x -= playerSpeed * dx;
      desiredVector.add(v.unit(Math.PI));
    }
    if (right) {
      playerSprite.pos.x += playerSpeed * dx;
      desiredVector.add(v.unit(0));
    }
    if (up) {
      playerSprite.pos.y -= playerSpeed * dx;
      desiredVector.add(v.unit(3 * Math.PI / 2));
    }
    if (down) {
      playerSprite.pos.y += playerSpeed * dx;
      desiredVector.add(v.unit(Math.PI / 2));
    }

    if (desiredVector.lengthSqrd() !== 0) {
      playerSprite.rotation = desiredVector.angle() + Math.PI / 2;
    }

    var posRelCenter = playerSprite.pos.minus(roomCenter);
    var outVector = posRelCenter.normalized();
    var outerPlayerPos = posRelCenter.plus(outVector.scaled(playerRadius));
    if (outerPlayerPos.length() > innerRadius) {
      var innerCirclePoint = outVector.scaled(innerRadius);
      var correction = innerCirclePoint.minus(outerPlayerPos);
      playerSprite.pos.add(correction);
    }

    doorAngle = (doorAngle + doorSpeed) % (Math.PI * 2);
    var doorUnit = v.unit(doorAngle);
    doorSprite.pos = roomCenter.plus(doorUnit.scaled(doorPosRadius)),
    doorSprite.rotation = doorUnit.angle() + Math.PI / 2;

    orbitblades.forEach(function(blade) {
      blade.rotation += blade.speed;
      blade.pos = roomCenter.plus(v.unit(blade.rotation).scaled(blade.radius));
      if (blade.pos.distance(playerSprite.pos) < playerRadius + sawRadius) {
        lose();
        return;
      }
    });
    zombies.forEach(function(zombie) {
      if (zombie.pos.distance(playerSprite.pos) < playerRadius + zombieRadius) {
        lose();
        return;
      }
      var unit = playerSprite.pos.minus(zombie.pos).normalized();
      zombie.pos.add(unit.scaled(zombieSpeed));
      zombie.rotation = unit.angle() + Math.PI / 2;
    });

    if (doorSprite.pos.distance(playerSprite.pos) < playerRadius + doorRadius) {
      win();
      return;
    }

    sawblades.forEach(function(saw) {
      if (saw.pos.distance(playerSprite.pos) < playerRadius + sawRadius) {
        lose();
        return;
      }
    });
  });
  engine.on('draw', function (context) {
    if (gameOver) {
      context.fillStyle = '#CE2200'
      context.fillRect(0, 0, engine.size.x, engine.size.y);
      return;
    }

    context.drawImage(bgHud, 0, 0);

    // draw all sprites in batch
    batch.draw(context);

    // draw a little fps counter in the corner
    fpsLabel.draw(context);
  });
  function lose() {
    gameOver = true;
  }
  function win() {
    levelIndex += 1;
    if (levelIndex >= levels.length) {
      // game over man
      gameOver = true;
      return;
    }
    startLevel();
  }
  function startLevel() {
    var level = levels[levelIndex];

    doorAngle = level.doorAngle;
    playerSprite.pos = roomCenter.clone();

    sawblades.forEach(deleteIt);
    zombies.forEach(deleteIt);
    orbitblades.forEach(deleteIt);

    sawblades = [];
    zombies = [];
    orbitblades = [];

    level.items.forEach(function(item) {
      switch (item.type) {
        case 'orbitblade':
          var blade = new chem.Sprite(ani.trap_sawblade, {
            batch: batch,
            rotation: item.startAngle,
            zOrder: 4,
          });
          blade.radius = item.radius;
          blade.speed = doorSpeed * item.speedRatio;
          orbitblades.push(blade);
          break;
        case 'sawblade':
          sawblades.push(new chem.Sprite(ani.trap_sawblade, {
            pos: item.pos.plus(roomCenter),
            batch: batch,
            zOrder: 4,
          }));
          break;
        case 'zombie':
          zombies.push(new chem.Sprite(ani.zombie, {
            pos: item.pos.plus(roomCenter),
            batch: batch,
            zOrder: 4,
          }));
          break;
      }
    });

    function deleteIt(item) {
        item.delete();
    }
  }
});


function genLevels() {
  return [
  {
    doorAngle: 0,
    items: [
      {
        type: "orbitblade",
        radius: 75,
        speedRatio: 1.1,
        startAngle: 0,
      },
      {
        type: "sawblade",
        pos: v(-100, 100),
      },
      {
        type: "zombie",
        pos: v(-100, 100),
      },
    ],
  },
  {
    doorAngle: 0,
    items: [
      {
        type: "sawblade",
        pos: v(200, -100),
      },
    ],
  },



  ];
}
