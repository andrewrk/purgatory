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
    door: {
      anchor: {x: 39, y: 41},
    },
    inner_platform: {},
    outer_platform: {},
  }
};
