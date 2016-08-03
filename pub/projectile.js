/**
 * Created by will on 02/08/16.
 */
var Projectile = function(initPack) {
    var self = {};
    self.id = initPack.id;
    self.x = initPack.x;
    self.y = initPack.y;
    self.w = initPack.w;
    self.h = initPack.h;

    self.draw = function() {
        ctx.fillRect(self.x, self.y, self.w, self.h);
    };

    Projectile.list[self.id] = self;

    return self;
};

Projectile.list = {};