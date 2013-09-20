// the main source file which depends on the rest of your source files.
exports.main = 'src/main';

exports.spritesheet = {
  defaults: {
    delay: 0.05,
    loop: false,
    // possible values: a Vec2d instance, or one of:
    // ["center", "topleft", "topright", "bottomleft", "bottomright",
    //  "top", "right", "bottom", "left"]
    anchor: "center"
  },
  animations: {
    player: {
      anchor: {x: 60, y: 104},
    },
    door_active: {
      anchor: {x: 39, y: 41},
    },
    door_inactive: {
      anchor: {x: 39, y: 41},
    },
    inner_platform: {},
    outer_platform: {},
    lava: {
      delay: 0.50,
      anchor: 'topleft',
      loop: true,
      frames: [
        "lava/lava_1.png",
        "lava/lava_2.png",
        "lava/lava_3.png",
        "lava/lava_4.png",
        "lava/lava_5.png",
        "lava/lava_4.png",
        "lava/lava_3.png",
        "lava/lava_2.png",
        "lava/lava_1.png"
      ]
    },
    trap_sawblade: {},
  }
};
