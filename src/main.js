var chem = require("chem");
var v = chem.vec2d;
var ani = chem.resources.animations;
var canvas = document.getElementById("game");
var engine = new chem.Engine(canvas);
engine.buttonCaptureExceptions[chem.button.KeyF5] = true;
engine.showLoadProgressBar();
engine.start();
canvas.focus();

chem.resources.on('ready', function () {
  var batch = new chem.Batch();
  var batchLabel = new chem.Batch();
  var fpsLabel = engine.createFpsLabel();

  var bgMusic = new Audio('music/background.ogg');
  bgMusic.loop = true;
  bgMusic.play();
  var lava = new chem.Sprite(ani.lava, {
    batch: batch,
    zOrder: 0,
    pos: v(100, 0),
  });
  var bgHud = chem.resources.images['hud_background.png'];
  var bgStart = chem.resources.images['start_screen.png'];
  var bgSuccess = chem.resources.images['success.png'];
  var roomCenter = engine.size.scaled(0.5);
  var playerSprite = new chem.Sprite(ani.player, {
    batch: batch,
    zOrder: 4,
    pos: roomCenter.clone(),
  });
  var innerPlatform = new chem.Sprite(ani.inner_platform_plain, {
    batch: batch,
    zOrder: 2,
    scale: v(1.2, 1.2),
    pos: roomCenter.clone(),
  });
  var outerPlatform = new chem.Sprite(ani.outer_platform, {
    batch: batch,
    zOrder: 1,
    scale: v(1.2, 1.2),
    pos: roomCenter.clone(),
  });
  var playerSpeed = 2.4;
  var doorSpeed = Math.PI / 240; // radians
  var doorPosRadius = 280;
  var doorSprite = new chem.Sprite(ani.door_active, {
    batch: batch,
    zOrder: 3,
  });
  var doorRadius = 40;
  var innerRadius = 207 * 1.2;
  var playerRadius = 14.5;
  var zombieRadius = 14.5;
  var levels = genLevels();
  var levelIndex = 0;
  var sawRadius = 35.5 * 0.8;

  var gameOver = false;
  var startScreen = true;

  var zombieSpeed = 0.85;

  var startDate = new Date();

  var deathCount = 0;
  var deathLabel = new chem.Label("", {
    batch: batchLabel,
    pos: v(750, 509),
    zOrder: 5,
    font: "26px sans-serif",
    fillStyle: "#ffffff",
    textBaseline: 'middle',
    textAlign: 'center',
  });

  var levelLabel = new chem.Label("", {
    batch: batchLabel,
    pos: v(750, 322),
    zOrder: 5,
    font: "26px sans-serif",
    fillStyle: "#ffffff",
    textBaseline: 'middle',
    textAlign: 'center',
  });

  var winTimeLabel = new chem.Label("", {
    pos: v(681, 524),
    font: "20px sans-serif",
    fillStyle: "#ffffff",
    textBaseline: 'middle',
    textAlign: 'center',
  });

  var timeLabel = new chem.Label("", {
    batch: batchLabel,
    pos: v(749, 138),
    zOrder: 5,
    font: "20px sans-serif",
    fillStyle: "#ffffff",
    textBaseline: 'middle',
    textAlign: 'center',
  });

  var yourTime;

  //Sound
  var sawSfx = new Audio('sfx/saw.ogg');
  sawSfx.loop = true;
  sawSfx.play();
  sawSfx.volume = 0;
  var zombieSfx = new Audio('sfx/zombie.ogg');
  zombieSfx.loop = true;
  zombieSfx.play();
  zombieSfx.volume = 0;


  // level state
  var doorAngle;
  var sawblades = [];
  var zombies = [];
  var orbitblades = [];
  var fakedoors = [];
  var sweepingBlades = [];

  startLevel();

//UPDATE
  engine.on('update', function (dt, dx) {
    if (startScreen) {
      if (engine.buttonJustPressed(chem.button.MouseLeft)) {
        startDate = new Date();
        startScreen = false;
      }
    }
    if (gameOver) return;

    var left = engine.buttonState(chem.button.KeyLeft) || engine.buttonState(chem.button.KeyA);
    var right = engine.buttonState(chem.button.KeyRight) || engine.buttonState(chem.button.KeyD);
    var up = engine.buttonState(chem.button.KeyUp) || engine.buttonState(chem.button.KeyW);
    var down = engine.buttonState(chem.button.KeyDown) || engine.buttonState(chem.button.KeyS);

    var skip = engine.buttonJustPressed(chem.button.KeyN);

    if(skip){
      win();
    }

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

    outerPlatform.rotation = doorSprite.rotation;
    

    fakedoors.forEach(function(door) {
      door.revolution += doorSpeed;
      var doorUnit = v.unit(door.revolution);
      door.pos = roomCenter.plus(doorUnit.scaled(doorPosRadius));
      door.rotation = doorUnit.angle() + Math.PI / 2;

      if (door.pos.distance(playerSprite.pos) < playerRadius + doorRadius) {
        door.setAnimation(ani.door_inactive);
        return;
      }
    });
    sawSfx.volume = 0;
    zombieSfx.volume = 0;
    orbitblades.forEach(function(blade) {
      blade.rotation += -0.05;
      blade.revolution += blade.speed;
      blade.pos = roomCenter.plus(v.unit(blade.revolution).scaled(blade.radius));
      var vol = (35 / blade.pos.distance(playerSprite.pos));
      if (vol > 1) vol = 1;
      if (vol < 0.25) vol = 0;
      if (sawSfx.volume < vol) sawSfx.volume = vol;
      if (blade.pos.distance(playerSprite.pos) < playerRadius + sawRadius) {
        lose();
        return;
      }
    });
    zombies.forEach(function(zombie) {
      var vol = (35 / zombie.pos.distance(playerSprite.pos));
      if (vol > 1) vol = 1;
      if (vol < 0.25) vol = 0;
      if (zombieSfx.volume < vol) zombieSfx.volume = vol;
      if (zombie.pos.distance(playerSprite.pos) < playerRadius + zombieRadius) {
        lose();
        return;
      }
      var unit = playerSprite.pos.minus(zombie.pos).normalized();
      zombie.pos.add(unit.scaled(zombieSpeed));
      zombie.rotation = unit.angle() + Math.PI / 2;
    });
    
    sweepingBlades.forEach(function(blade) {
        //blade.rotation = (blade.rotation - .005) % (Math.PI * 2);
        blade.rotation = (blade.rotation + blade.speed) % (Math.PI*2);
        
        
        var playerRelPos = playerSprite.pos.minus(blade.pos);
        
        
        //rotate the vector AROUND the anchor
        var rotatedPos = playerRelPos.rotated(v.unit(-blade.rotation));
        //var testPos = blade.pos.plus(rotatedPos);
        
        //get the RECTANGLE TEST POINTS (min and max)
            //rectangle dimensions: 213x43
            //anchor point: 202x19
        var min = v(-202,-19);
        var max = v(0,24);
        
        //if(engine.buttonJustPressed(chem.button.KeyH)) debugger;
        
        //POINT-RECTANGLE TEST
        if(rotatedPos.x > min.x && rotatedPos.x < max.x
            && rotatedPos.y > min.y && rotatedPos.y < max.y)
        {
            //COLLISION SUCCESSFUL
            lose();
            return;
        }

        
    });

    if (doorSprite.pos.distance(playerSprite.pos) < playerRadius + doorRadius) {
      win();
      return;
    }

    sawblades.forEach(function(saw) {
      saw.rotation += -0.05;
      var vol = (30 / saw.pos.distance(playerSprite.pos));
      if (vol > 1) vol = 1;
      if (vol < 0.25) vol = 0;
      if (sawSfx.volume < vol) sawSfx.volume = vol;
      if (saw.pos.distance(playerSprite.pos) < playerRadius + sawRadius) {
        lose();
        return;
      }
    });

    timeLabel.text = formatTime(new Date() - startDate);
    levelLabel.text = (levelIndex + 1).toString();
    deathLabel.text = (deathCount).toString();
  });
  engine.on('draw', function (context) {
    if (startScreen) {
      context.drawImage(bgStart, 0, 0);
      return;
    }
    if (gameOver) {
      context.drawImage(bgSuccess, 0, 0);
      winTimeLabel.text = formatTime(yourTime - startDate);
      winTimeLabel.draw(context);
      return;
    }

    // draw all sprites in batch
    batch.draw(context);

    context.drawImage(bgHud, 0, 0);

    batchLabel.draw(context);

    // draw a little fps counter in the corner
    fpsLabel.draw(context);
  });
  function lose() {
    deathCount += 1;
    startLevel();
  }
  function win() {
    yourTime = new Date();
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

    innerPlatform.setAnimation(level.platformAni || ani.inner_platform_plain);

    sawblades.forEach(deleteIt);
    zombies.forEach(deleteIt);
    orbitblades.forEach(deleteIt);
    fakedoors.forEach(deleteIt);
    sweepingBlades.forEach(deleteIt);

    sawblades = [];
    zombies = [];
    orbitblades = [];
    fakedoors = [];
    sweepingBlades = [];

    level.items.forEach(function(item) {
      switch (item.type) {
        case 'fakedoor':
          var door = new chem.Sprite(ani.door_active, {
            batch: batch,
            zOrder: 3,
          });
          door.revolution = item.angle;
          fakedoors.push(door);
          break;
        case 'orbitblade':
          var blade = new chem.Sprite(ani.trap_sawblade, {
            batch: batch,
            scale: v(0.8, 0.8),
            zOrder: 4,
          });
          blade.revolution = item.startAngle;
          blade.radius = item.radius;
          blade.speed = doorSpeed * item.speedRatio;

          orbitblades.push(blade);
          break;
        case 'sawblade':
          var sawblade = new chem.Sprite(ani.trap_sawblade, {
            pos: item.pos.plus(roomCenter),
            scale: v(0.8, 0.8),
            batch: batch,
            zOrder: 4,
          });

          sawblades.push(sawblade);
          break;
        case 'zombie':
          zombies.push(new chem.Sprite(ani.zombie, {
            pos: item.pos.plus(roomCenter),
            batch: batch,
            zOrder: 4,
          }));
          break;
        case 'sweepingblades':
            var blade = new chem.Sprite(ani.trap_sweeping_spikes,{
                pos: item.pos.plus(roomCenter),
                batch: batch,
                zOrder: 4,
                rotation: item.startAngle,
            });
            blade.speed = doorSpeed * item.speedRatio;
            
            sweepingBlades.push(blade);
            break;
      }
    });

    function deleteIt(item) {
        item.delete();
    }
  }
});

function formatTime(ms) {
  var sec = ms / 1000;
  var min = Math.floor(sec / 60);
  sec -= min * 60;
  sec = Math.floor(sec);
  if (sec < 10) sec = "0" + sec;
  return min + ":" + sec;
}

function genLevels() {
  return [
  {
    doorAngle: Math.PI,
    //LEVEL 1 - get to the door
    items: [],
  },
  {
    //LEVEL 2
    doorAngle: 0,
    items: [
      {
        type: "sawblade",
        pos: v(180, 100),
      },
      {
        type: "sawblade",
        pos: v(125, -200),
      },
      {
        type: "sawblade",
        pos: v(90, -50),
      },
      {
        type: "sawblade",
        pos: v(-150, 85),
      },
      {
        type: "sawblade",
        pos: v(0,150),
      },
      {
        type: "sawblade",
        pos: v(-100,-100),
      },
      {
        type: "orbitblade",
        radius: 70,
        speedRatio: 1.1,
        startAngle: 0,
      },
      {
        type: "orbitblade",
        radius: 180,
        speedRatio: 1.4,
        startAngle: Math.PI,
      },
    ],
  },
  {
    //LEVEL 3
    doorAngle: 0,
    items: [
      {
        type: "orbitblade",
        radius: 50,
        speedRatio: 1.0,
        startAngle: 0,
      },
      {
        type: "orbitblade",
        radius: 80,
        speedRatio: -1.5,
        startAngle: Math.PI,
      },
      {
        type: "orbitblade",
        radius: 130,
        speedRatio: 0.6,
        startAngle: Math.PI/2,
      },
      {
        type: "orbitblade",
        radius: 170,
        speedRatio: -2.0,
        startAngle: 2*Math.PI,
      },
      {
        type: "orbitblade",
        radius: 210,
        speedRatio: 3.0,
        startAngle: 2*Math.PI/3,
      },
    ],
  },
  {
    //LEVEL 4 - introduce zombies
    doorAngle: 0,
    items: [
      {
        type: "zombie",
        pos: v(210,0),
      },
      {
        type: "zombie",
        pos: v(20,180),
      },
      {
        type: "zombie",
        pos: v(-120,120),
      },
      {
        type: "zombie",
        pos: v(-140,-50),
      },
      {
        type: "zombie",
        pos: v(0,-200),
      },
      {
        type: "zombie",
        pos: v(180,-180),
      },
    ],
  },
  {
    //LEVEL 5 - zombies + saws
    doorAngle: 0,
    platformAni: ani.inner_platform_bones,
    items: [
      {
        type: "zombie",
        pos: v(210,0),
      },
      {
        type: "zombie",
        pos: v(-100,130),
      },
      {
        type: "zombie",
        pos: v(-20,-175),
      },
      {
        type: "orbitblade",
        radius: 100,
        speedRatio: 2.5,
        startAngle: 0,
      },
      {
        type: "orbitblade",
        radius: 180,
        speedRatio: -2.0,
        startAngle: Math.PI,
      },
      {
        type: "sawblade",
        pos: v(180, 100),
      },
      {
        type: "sawblade",
        pos: v(125, -200),
      },
      {
        type: "sawblade",
        pos: v(90, -50),
      },
    ],
  },
  // LEVEL 6 - introduce fake doors
  {
    doorAngle: Math.PI / 2,
    platformAni: ani.inner_platform_webbed,
    items: [
      {
        type: "fakedoor",
        angle: 0,
      },
      {
        type: "fakedoor",
        angle: Math.PI,
      },
      {
        type: "fakedoor",
        angle: 3 * Math.PI / 2,
      },
    ],
  },
  {
    //LEVEL 7 - DEM SWEEPING BLADES
    doorAngle:  Math.PI,
    items: [
        {
            type: "sweepingblades",
            pos: v(-100,-100),
            speedRatio: .4,
            startAngle: Math.PI,
        },
        {
            type: "sweepingblades",
            pos: v(100,100),
            speedRatio: .4,
            startAngle: 0,
        },
        {
            type: "sweepingblades",
            pos: v(-180,20),
            speedRatio: .6,
            startAngle: Math.PI/2,
        },
        {
            type: "sweepingblades",
            pos: v(200,0),
            speedRatio: -.6,
            startAngle: 3*Math.PI/2,
        },
        
        {
            type: "fakedoor",
            angle: 0,
        },
        {
            type: "fakedoor",
            angle: Math.PI/2,
        },
        {
            type: "fakedoor",
            angle: 3 * Math.PI / 2,
        },
    
    ],
  },
  {
    //LEVEL 8 - FINAL LEVEL
    doorAngle:  Math.PI,
    items: [
        {
            type: "sweepingblades",
            pos: v(200,0),
            speedRatio: .5,
            startAngle: Math.PI,
        },
        {
            type: "sweepingblades",
            pos: v(0,200),
            speedRatio: .5,
            startAngle: 3*Math.PI/2,
        },
        {
            type: "sweepingblades",
            pos: v(-200,0),
            speedRatio: .9,
            startAngle: 0,
        },
        {
            type: "sweepingblades",
            pos: v(0,-200),
            speedRatio: -.9,
            startAngle: Math.PI/2,
        },
        
        {
            type: "fakedoor",
            angle: 0,
        },
        {
            type: "fakedoor",
            angle: Math.PI/2,
        },
        {
            type: "fakedoor",
            angle: 3 * Math.PI / 2,
        },
        
        {
            type: "orbitblade",
            radius: 100,
            speedRatio: 3.0,
            startAngle: 0,
        },
        {
            type: "orbitblade",
            radius: 180,
            speedRatio: -2.5,
            startAngle: Math.PI,
        },
        
        
        
        {
            type: "zombie",
            pos: v(210,0),
        },
        {
            type: "zombie",
            pos: v(20,180),
        },
        {
            type: "zombie",
            pos: v(-150,120),
        },
        {
            type: "zombie",
            pos: v(-150,-100),
        },
        {
            type: "zombie",
            pos: v(0,-200),
        },
        {
            type: "zombie",
            pos: v(180,-180),
        },
        
        
    
    ],
  },



  ];
}
