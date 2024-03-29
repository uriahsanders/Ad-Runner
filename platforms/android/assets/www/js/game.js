//Game manipulation JS (main canvas layer)
//function inArray and removeFromArray in functions.js
var canvas = document.getElementById('game');
var ctx = canvas.getContext('2d');
//make game canvas full screen
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
//so common might as well reduce op codes
var height = canvas.height;
var width = canvas.width;
var data = {
    currentLevel: null, //what level are we on?
    gameIsOnline: null, //are we playing with an internet connection?
    gameIsPlaying: false, //begin as false until user clicks a level
    settings: {

    },
    /**
     *Each level will have its unique functions called to change the specifics
     *of the game depending on data.currentLevel
     *General interface forEach level in levels:
     *playerObject(); setPrototypes(); stageObject(); handleEvents(); handleStageInteractions();
     */
    levels: {
        L1: function() {
            var playerHeight = height / 20;
            var playerWidth = width / 20;
            var groundHeight = height / 100;
            var groundLocation = height - groundHeight - playerHeight; //minus height of player
            var midScreen = width / 2;
            var collides = function(a, b) { //are a and b touching?
                //rectangular collision algorithm
                return a.x < b.x + b.width &&
                    a.x + a.width > b.x &&
                    a.y < b.y + b.height &&
                    a.y + a.height > b.y;
            };
            //common booleans for "player" to condense code
            var jumpingOrFalling = function() { //use with .call(this)
                return this.currentAction === 'jumping' || this.currentAction === 'falling';
            };
            var RETURN = {}; //build object to return in steps for easier scope access
            //note: side scrolling will be acomplished by moving all stage elements in the opposite direction of the player
            //once the player has reached a certain key point; thus stage update will be handled in player update method
            RETURN.stageObject = { //object contains functions defining how the stage will change over time
                /**
                 *Map of the stage as array (each item is a "block" on the stage L -> R)
                 *the width of space taken by each block is an even portion of the canvas width
                 *Legend:
                 *-1's are empty spaces
                 *0 is the player's original location
                 *1's are obstacles to jump over
                 *2's, 3's, 4's, are platforms of increasing heights that you can jump on
                 *5's are platforms with a basic enemy on them
                 *6's are platforms with an ad enemy on them
                 *7's are original basic enemy locations
                 *8's are original ad enemy locations
                 *9's are floating banner ads which can be shot down and destroyed
                 *10 is the Boss
                 */
                map: [ //temp
                    1, -1, -1, -1, 2, -1, -1, 2, 4, 3, -1, 2, 3, 4, -1, -1, -1, 3
                ],
                obstacles: [],
                newObstacle: function(self) {
                    //Caller should define self.x, self.y, self.width, self.height, self.type
                    self.update = function() {
                        self.x += 0;
                        self.y += 0;
                    };
                    self.draw = function() {
                        ctx.fillStyle = '#000';
                        ctx.fillRect(self.x, self.y, self.width, self.height);
                    };
                    return self;
                },
                draw: function(init) {
                    //draw basic ground line
                    ctx.fillStyle = '#000';
                    ctx.fillRect(0, height, width, -groundHeight);
                    var blockWidth = width / 10; //each full screen is ten blocks
                    var blockXPos = 0; //start at left-most of map
                    var obstacleHeight = height / 15; //starting height of obstacles (abstract)
                    var block; //the map element we are currently on
                    var obj = {}; //for obstacle "self"
                    ctx.fillStyle = '#000';
                    if (init === 1) { //first time building map, so default x positions
                        for (var i = 0, len = this.map.length; i < len; ++i) {
                            block = this.map[i];
                            if (block === -1) {
                                obj.y = 0;
                                obj.height = 0;
                            } else if (block === 1) {
                                obj.y = groundLocation * 1.01 - obstacleHeight * 4;
                                obj.height = height - obstacleHeight * 4;
                            } else if (block === 2 || block === 3 || block === 4) {
                                obj.height = 3;
                                //create an obstacle with tallness relative to num
                                obj.y = height - obstacleHeight * block;
                            }
                            this.obstacles.push(this.newObstacle({
                                type: block,
                                x: blockXPos,
                                y: obj.y,
                                width: blockWidth,
                                height: obj.height
                            }));
                            blockXPos += blockWidth; //move x position over more
                        }
                    }
                    //draw each created obstacle
                    this.obstacles.forEach(function(obstacle) {
                        obstacle.draw();
                    });
                }
            };
            //returns false if the player is hitting any obstacles
            var noObstacleCollisions = function(player) {
                var obstacles = RETURN.stageObject.obstacles;
                for (var i = obstacles.length - 1; i >= 0; --i) {
                    if (collides(player, obstacles[i])) return false;
                }
                return true;
            };
            //REMEMBER: top corner is (0, 0)
            RETURN.playerObject = { //generate attributes object for a player
                name: null,
                health: 100, //temp
                points: 0,
                playerIsFacing: 'right', //right/left
                //start a little away from the farthest x (0)
                x: width / 7, //X & Y coordinates
                y: groundLocation,
                vx: 0, //horizontal velocity
                vy: 0, //vertical velocity
                ay: (height / 600) * 0.1, //vertical acceleration (slow down as you go up, speed up as you go down) [for parabolic motion]
                color: 'red',
                width: playerWidth,
                height: playerHeight,
                colliding: false, //are we hitting something?
                health: 100, //temp
                //translate keyboard event to an action
                numToAction: function(num) {
                    switch (num) {
                        case 38: //up arrow
                            return 'jumping';
                        case 39: //right arrow
                            return 'moving right';
                        case 37: //left arrow
                            return 'moving left'
                        case 32:
                            return 'shooting';
                        default:
                            return false; //keycode is not valid
                    }
                },
                //NOTE: Action properties are for managing movement and do not include shooting
                lastAction: null, //action before most recent (what did we just do?)
                currentAction: 'standing', //most recent current action
                currentActions: [], //all actions we are doing at once
                update: function() { //update player info
                    this.handleStageInteractions();
                    //player will win before reaching right side so just make sure the never go past left side of canvas
                    //also dont move them if they are at middle of screen; background will move instead
                    if (this.x + this.vx > 0 && this.x <= midScreen)
                        this.x += this.vx; //left-right
                    if (jumpingOrFalling.call(this)) {
                        this.y += this.vy; //up-down
                        this.vy += this.ay; //slow down as we go up, speed up as we go down
                    }
                    if (this.y >= groundLocation) { //when we're back where we jumped from
                        if (this.y !== groundLocation) this.y = groundLocation; //if we were lower than the ground upon landing fix that
                        if (this.vy !== 0) this.vy = 0; //we just hit the ground again so stop
                        //if we're not moving left or right when we hit the ground stop
                        if (jumpingOrFalling.call(this)) {
                            removeFromArray(this.currentActions, this.currentAction);
                            if (!(this.lastAction === 'moving right') && !(this.lastAction === 'moving left')) {
                                this.action('standing'); //reset from jumping/falling to just standing
                            }
                        }
                    }
                    //hijack this update for projectiles as well
                    this.projectiles.forEach(function(projectile) {
                        projectile.update();
                    });
                    this.projectiles = this.projectiles.filter(function(projectile) {
                        return projectile.active;
                    });
                },
                draw: function() { //draw player
                    ctx.fillStyle = this.color;
                    ctx.beginPath();
                    ctx.fillRect(this.x, this.y, this.width, this.height);
                    //hijack this update for projectiles as well
                    this.projectiles.forEach(function(projectile) {
                        projectile.draw();
                    });
                },
                //where to fire from
                fireFrom: function() { //we will fire from the middle of player atm
                    return {
                        x: this.x + this.width / 2, //this.width / 2
                        y: this.y + 10, //this.height / 2
                    };
                },
                projectiles: [],
                newProjectile: function(self) {
                    //Caller should define self.x and self.y
                    self.active = true;
                    self.speed = 5;
                    self.vx = self.speed;
                    self.vy = 0; //may need in the future
                    self.color = '#000';
                    self.width = 20;
                    self.height = 3;
                    //so we can clear projectiles once they leave sight
                    self.isWithinStage = function() {
                        return self.x >= 0 && self.x <= width &&
                            self.y >= 0 && self.y <= height;
                    };
                    self.update = function() {
                        self.x += self.vx;
                        self.y += self.vy;
                        self.active = self.active && self.isWithinStage();
                    };
                    self.draw = function() {
                        ctx.fillStyle = self.color;
                        ctx.fillRect(self.x, self.y, self.width, self.height);
                    };
                    return self;
                },
                shoot: function() {
                    this.projectiles.push(this.newProjectile({
                        x: this.fireFrom().x,
                        y: this.fireFrom().y
                    }));
                },
                //collisions, side scrolling, etc.
                handleStageInteractions: function() {
                    var thiz = this; //RETURN.playerObject
                    var obstacleHeight = height / 15; //height of obstacles
                    var lowPlatformHeight = height - obstacleHeight * 2;
                    var obstacles = RETURN.stageObject.obstacles;
                    var handlePlayerObstacleCollision = function(type, obstacle) {
                        //compensate for bottom with platforms
                        var topOfObstacle = (type === 'platform') ? obstacle.y - obstacle.height : obstacle.y;
                        //if they are above platform and jumping
                        if ((jumpingOrFalling.call(thiz)) && thiz.y <= topOfObstacle) {
                            //if we're not jumping and we are moving horizontally prevent us from continuing to fall by stoping y velocity
                            if (!inArray(thiz.currentActions, 'jumping') && (thiz.vx < 0 || thiz.vx > 0))
                                thiz.vy = 0;
                            //stand if we landed for the first time
                            //if we're not moving left or right when we hit the ground stop
                            if (jumpingOrFalling.call(thiz)) {
                                removeFromArray(thiz.currentActions, 'jumping');
                                if (!(thiz.lastAction === 'moving right') && !(thiz.lastAction === 'moving left')) {
                                    //only stand after initial landing and not moving left or right (+ 0.5 keeps us from continuing to collide slightly)
                                    if (thiz.y !== obstacle.y - thiz.height + 0.5) thiz.action('standing'); //reset from jumping to just standing
                                }
                            }
                            //verify initial landing and fix position
                            thiz.y = obstacle.y - thiz.height + 0.5;
                        } else { //we are below the platform, or running into the obstacle
                            if (type === 'platform') thiz.vy = 1; //bounce down
                            else if (type === 'obstacle' && !(thiz.y <= topOfObstacle)) { //stop when we hit it
                                //if player is moving left towards obstacle (constants used to prevent additional collisions)
                                if (thiz.vx < 0 && thiz.x > obstacle.x) thiz.x = obstacle.x + obstacle.width + 3;
                                //moving right towards obstacle
                                else if (thiz.vx > 0 && thiz.x < obstacle.x) thiz.x = obstacle.x - obstacle.width / 2 - 3;
                            }
                        }
                    };
                    obstacles.forEach(function(obstacle) {
                        //SIDE SCROLLING (move back stage as we walk)
                        //if were moving horizontally in some way even if in the air (so long as we touch no obstacles)
                        if (inArray(thiz.currentActions, 'moving right') || inArray(thiz.currentActions, 'moving left') || thiz.vx < 0 || thiz.vx > 0 || (thiz.y < groundLocation && noObstacleCollisions(thiz))) {
                            //move screen back if past center
                            if (!(thiz.x <= midScreen)) obstacle.x -= thiz.vx;
                        }
                        //PHYSICS
                        //if they are above the ground, not jumping, and not colliding with any obstacles make them fall
                        if (thiz.y < groundLocation && thiz.currentAction !== 'jumping' && noObstacleCollisions(thiz)) {
                            thiz.action('falling');
                        }
                        //OBSTACLE COLLISIONS
                        if (collides(thiz, obstacle)) { //touch obstacle
                            //obstacles to jump onto
                            if (obstacle.type === 2 || obstacle.type === 3 || obstacle.type === 4) {
                                handlePlayerObstacleCollision('platform', obstacle);
                            } else if (obstacle.type === 1) { //obstacles to jump over
                                handlePlayerObstacleCollision('obstacle', obstacle);
                            }
                        }
                        //BULLET COLLISIONS

                    });
                }
            };
            RETURN.setPrototypes = function(Player) { //set prototypes for Player and Ad classes
                Player.prototype.action = function(what) {
                    //conditional because we only need currentAction for movement
                    if (what !== 'shooting') this.currentAction = what; //what is the player doing now?
                    switch (what) { //launch initial action (then dynamics are handled in player.update())
                        case 'standing':
                            this.vx = 0;
                            this.vy = 0;
                            break;
                        case 'jumping':
                            this.vy = -(height / 130); //canvas is inverted so make velocity negative to go up
                            break;
                        case 'falling':
                            //unless we're moving left or right in which case we naturally descend
                            if(!inArray(this.currentActions, 'moving right') && !inArray(this.currentActions, 'moving left')) this.vy = height / 130;
                            break;
                        case 'moving right':
                            this.vx = height / (height / 2.7);
                            break;
                        case 'moving left':
                            this.vx = -(height / (height / 2.7));
                            break;
                        case 'shooting':
                            this.shoot();
                            break;
                    }
                }
            };
            //listen for events for this level
            RETURN.handleEvents = function(player) { //player as param because its undefined as of yet
                //if (isMobile()) { //comment out for dev on ripple emulator :(
                    //move left or right and side screen tap/hold
                    $(document).on('touchstart', '#game', function(e) {
                        //x coordinate of touch
                        var touchX = e.originalEvent.touches[0].pageX;
                        //what part of the canvas are we touching?
                        var leftSide = touchX <= .10 * width; //left 10% of width
                        var rightSide = touchX >= .90 * width; //right 10% of width
                        if (leftSide || rightSide) {
                            //if they are jumping or shooting they cant do anything but jump unless they are in the air
                            //if ((player.currentAction !== 'jumping' || (player.currentAction === 'jumping' && (player.y === groundLocation || !noObstacleCollisions(player))))) {
                                var action;
                                if (leftSide) action = 'moving left';
                                else if (rightSide) action = 'moving right';
                                player.action(action);
                                player.lastAction = action;
                                //dont add duplicate actions, since keyup is constantly called when held down
                                if (!inArray(player.currentActions, action)) {
                                    player.currentActions.push(action);
                                }
                            //}
                        }
                    });
                    //when tap is released update current actions
                    $(document).on('touchend', '#game', function() {
                        //if we're moving left or right stop when we let go of the key
                        //also make sure we're either on the ground or on a platform when we do that
                        //we dont want to break midair trajectory
                        var movingLeftOrRight = player.vx !== 0;
                        if (movingLeftOrRight && (!noObstacleCollisions(player) || player.y === groundLocation)) {
                            player.action('standing'); //stop player
                        }
                        //remove action associated with key
                        if (player.vx > 0) removeFromArray(player.currentActions, 'moving right');
                        if (player.vx < 0) removeFromArray(player.currentActions, 'moving left');
                        if (movingLeftOrRight) player.lastAction = null;
                    });
                    //jump up when swiping up
                    $(document).on('swipeup', '#game', function(e) {
                        var leftSide = e.pageX <= .10 * width; //left 10% of width
                        var rightSide = e.pageX >= .90 * width; //right 10% of width
                        //if ((player.currentAction !== 'jumping' || (player.currentAction === 'jumping' && (player.y === groundLocation || !noObstacleCollisions(player))))){
                            player.action('jumping');
                            if(leftSide) player.action('moving left');
                            else if(rightSide) player.action('moving right');
                        //}
                    });
                    //fire on middle screen tap (not touchstart to not conflict with jumping)
                    $(document).on('tap', '#game', function(e) {
                        var leftSide = e.pageX <= .10 * width; //left 10% of width
                        var rightSide = e.pageX >= .90 * width; //right 10% of width
                        if (!(leftSide || rightSide)) {
                            player.action('shooting');
                        }
                    });
                //} else {
                    $(document).keydown(function(e) {
                        //dont register movement keys if in mid-air
                        var key = e.keyCode;
                        if (player.numToAction(key) !== false) { //is key valid?
                            //if they are jumping or shooting they cant do anything but jump unless they are in the air
                            //if ((player.currentAction !== 'jumping' || (key === 38 && (player.y === groundLocation || !noObstacleCollisions(player)))) && key !== 32) { //if not jumping and not shooting
                                //do different action depending on key code of key press
                                var action = player.numToAction(key);
                                //horizontal movement requires a more static identifier for accurate landing + movement 
                                //(if they let go of horizontal movement in midair we need to know and this is how)
                                if (action === 'moving right' || action === 'moving left') player.lastAction = action;
                                player.action(action);
                                //dont add duplicate actions, since keyup is constantly called when held down
                                if (!inArray(player.currentActions, action)) {
                                    player.currentActions.push(action);
                                }
                            //}
                            if (key === 32) {
                                player.action('shooting');
                            }
                        }
                    });
                    $(document).keyup(function(e) {
                        var key = e.keyCode;
                        //if we're moving left or right stop when we let go of the key
                        //also make sure we're either on the ground or on a platform when we do that
                        //we dont want to break midair trajectory
                        var keyLeftOrRight = key === 39 || key === 37;
                        if (keyLeftOrRight && (!noObstacleCollisions(player) || player.y === groundLocation)) {
                            player.action('standing'); //stop player
                        }
                        //remove action associated with key
                        removeFromArray(player.currentActions, player.numToAction(key));
                        if (keyLeftOrRight) player.lastAction = null;
                    });
                //}
            };
            return RETURN;
        },
        //...continue levels
    }
};
/**
 *Close start screen and such and start playing the game
 *This function should contain only information that will work regardless of level
 *Specificity is gained by calling above functions (particularly those in data.levels)
 */
function startPlaying() {
    //initial stuff
    data.gameIsPlaying = true;
    $('#dom').hide(); //hide all initial html
    $('#game').show(); //show game canvas
    //now start defining classes in comment sections:
    ///////////////////////////////////////////////////////////////////////////////////
    var GameElement = function(attrs) { //basic game element that all elements inherit
        //set each property of attrs as instance data
        for (var attr in attrs) {
            this[attr] = attrs[attr];
        }
    };
    ///////////////////////////////////////////////////////////////////////////////////
    var Player = function(attrs) { //@param attrs - object :- attributes
        GameElement.call(this, attrs);
    };
    Player.prototype = Object.create(GameElement.prototype); //inherit GameElement and such
    //gene code of a player will determine it's unique abilities and upgrades and all
    Player.prototype.geneCode = function() {

    };
    //when a player loses game restart level and lose some points
    Player.prototype.loseGame = function() {

    };
    //when a player wins the game show end game screen
    Player.prototype.winGame = function() {

    };
    ///////////////////////////////////////////////////////////////////////////////////
    var Enemy = function(attrs) {
        GameElement.call(this, attrs);
    };
    Enemy.prototype = Object.create(GameElement.prototype);
    Enemy.prototype.constructor = Enemy;
    //when an enemeny is killed what do we do?
    Enemy.prototype.die = function() {

    };
    ///////////////////////////////////////////////////////////////////////////////////
    var Ad = function(attrs) { //extends enemy
        Enemy.call(this, attrs);
    };
    Ad.prototype = Object.create(Enemy.prototype);
    Ad.prototype.constructor = Ad;
    //When Ad collides with player, fill the screen and sell product for a moment
    Ad.prototype.fillScreen = function() {

    };
    //Sometimes we will want the ads to say something (sell dat product!)....
    Ad.prototype.speak = function() {

    };
    ///////////////////////////////////////////////////////////////////////////////////
    var Stage = function(attrs) {
        GameElement.call(this, attrs);
    };
    Stage.prototype = Object.create(GameElement.prototype);
    ///////////////////////////////////////////////////////////////////////////////////
    //some prototypes of Player and Ad will depend on the level so...
    var levelHandler = data.levels[data.currentLevel](); //first shorthand access to current level functions
    levelHandler.setPrototypes(Player); //set prototypes depending on current level
    var player = new Player(levelHandler.playerObject); //Add player (There is only one!)
    var stage = new Stage(levelHandler.stageObject); //create the stage
    levelHandler.handleEvents(player);
    stage.draw(1); //create the stage (1 for init)
    //update and draw simply call corresponding functions
    //NOTE: update and draw functions change internally depending on level
    var update = function() { //update all coordinates and game data
        player.update();
    };
    //NOTE: update and draw functions change internally depending on level
    var draw = function() { //draw on canvas according to game data
        ctx.clearRect(0, 0, width, height); //clear the canvas
        player.draw();
        stage.draw();
    };
    //requestAnimationFrame polyfill
    //thanks to -> Erik Möller for original polyfill
    (function() {
        var lastTime = 0;
        var vendors = ['ms', 'moz', 'webkit', 'o'];
        for (var x = vendors.length - 1; x >= 0 && !window.requestAnimationFrame; --x) {
            window.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
            window.cancelAnimationFrame = window[vendors[x] + 'CancelAnimationFrame'] || window[vendors[x] + 'CancelRequestAnimationFrame'];
        }
        window.requestAnimationFrame = window.requestAnimationFrame || function(callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var CTT = currTime + timeToCall;
            var id = window.setTimeout(function() {
                    callback(CTT);
                },
                timeToCall);
            lastTime = CTT;
            return id;
        };
        window.cancelAnimationFrame = window.cancelAnimationFrame || function(id) {
            clearTimeout(id);
        };
    }());
    //start animation loop and just keep drawing and updating
    (function animLoop() {
        //only keep animating if game is active
        if (data.gameIsPlaying) {
            requestAnimationFrame(animLoop);
            update(); //update coordinate and game data
            draw(); //redraw information of the canvas
        } else cancelAnimationFrame(animLoop);
    })();
}