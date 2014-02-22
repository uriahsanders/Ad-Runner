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
	currentLevel: null,
	gameIsOnline: null, //are we playing with an internet connection?
	deviceIsMobile: null, //are we playing on a mobile device?
	gameIsPlaying: false, //begin as false until user clicks a level
	settings: {

	},
	/**
	 *Each level will have its unique functions called to change the specifics
	 *of the game depending on data.currentLevel
	 *Interface forEach level in levels:
	 *playerObject(); setPrototypes(); stageObject(); handleEvents();
	 */
	levels: {
		L1: function() {
			//some general positions ( temp, cant use vars in the future for level scope D: )
			var playerHeight = height / 20;
			var playerWidth = width / 20;
			var groundHeight = height / 100;
			var groundLocation = height - groundHeight - playerHeight; //minus height of player
			var collides = function(a, b) {
				//rectangular collision algorithm
				return a.x < b.x + b.width &&
					a.x + a.width > b.x &&
					a.y < b.y + b.height &&
					a.y + a.height > b.y;
			};
			var RETURN = {}; //build object to return in steps for easier scope access
			//note: side scrolling will be acomplished by moving all stage elements in the opposite direction of the player
			//once the player has reached a certain key point; thus stage update will be handled in player update method
			RETURN.stageObject = { //object contains functions defining how the stage will change over time
				/**
				 *Map of the stage as array (each item is a "block" on the stage L -> R)
				 *the dimensions of each "block" will be determined in the loop for hard coded entropy
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
					-1, -1, 2, -1, -1, 2, 4, 3, -1, 2, 3, 4, -1, -1, -1, 3
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
					var obstacleHeight = height / 15; //height of obstacles
					var lowPlatformHeight = height - obstacleHeight * 2;
					var middlePlatformHeight = height - obstacleHeight * 3;
					var highPlatformHeight = height - obstacleHeight * 4;
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
								obj.y = groundLocation * 1.01 - obstacleHeight * 2 / 2;
								obj.height = lowPlatformHeight;
							} else if (block === 2 || block === 3 || block === 4) {
								obj.height = 3;
								switch (block) {
									case 2:
										obj.y = lowPlatformHeight;
										break;
									case 3:
										obj.y = middlePlatformHeight;
										break;
									case 4:
										obj.y = highPlatformHeight;
								}
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
			RETURN.playerObject = { //generate attributes object for a player
				name: null,
				health: 100, //temp
				points: 0,
				playerIsFacing: 'right', //right/left
				//a quarter of a block from left
				x: width / 40, //X & Y coordinates
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
					if (this.x + this.vx > 0)
						this.x += this.vx; //left-right
					if (this.currentAction === 'jumping' || this.currentAction === 'falling') {
						this.y += this.vy; //up-down
						this.vy += this.ay; //slow down as we go up, speed up as we go down
					}
					if (this.y >= groundLocation) { //when we're back where we jumped from
						if (this.y !== groundLocation) this.y = groundLocation; //if we were lower than the ground upon landing fix that
						if (this.vy !== 0) this.vy = 0; //we just hit the ground again so stop
						//if we're not moving left or right when we hit the ground stop
						if (this.currentAction === 'jumping' || this.currentAction === 'falling') {
							if (this.currentAction === 'jumping') removeFromArray(this.currentActions, 'jumping');
							if (this.currentAction === 'falling') removeFromArray(this.currentActions, 'falling');
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
					//draw stick figure
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
					obstacles.forEach(function(obstacle) {
						//SIDE SCROLLING (move back stage as we walk)
						if (inArray(thiz.currentActions, 'moving right') || inArray(thiz.currentActions, 'moving left')) {
							obstacle.x -= thiz.vx;
						}
						//OBSTACLE COLLISIONS
						//platforms
						if (obstacle.type === 2 || obstacle.type === 3 || obstacle.type === 4) {
							//console.log(collides(thiz, obstacle));
							//they have touched the platform
							if (collides(thiz, obstacle)) {
								//if they are above platform and jumping
								if (thiz.currentAction === 'jumping' && thiz.y <= obstacle.y) {
									//if we're not jumping and we are moving horizontally prevent us from continuing to fall by stoping y velocity
									if (!inArray(thiz.currentActions, 'jumping') && (thiz.lastAction === 'moving right') || (thiz.lastAction === 'moving left'))
										thiz.vy = 0;
									//stand if we landed for the first time
									//if we're not moving left or right when we hit the ground stop
									if (thiz.currentAction === 'jumping') {
										removeFromArray(thiz.currentActions, 'jumping');
										if (!(thiz.lastAction === 'moving right') && !(thiz.lastAction === 'moving left')) {
											//only stand after initial landing and not moving left or right
											if (thiz.y !== obstacle.y - thiz.height + 0.5) thiz.action('standing'); //reset from jumping to just standing
										}
									}
									//verify initial landing and fix position
									thiz.y = obstacle.y - thiz.height + 0.5;
								} else { //we are below the platform
									thiz.vy = 1; //bounce down
								}
							}
						}
						//if they are above the ground, not jumping, and not colliding with any obstacles make them fall
						if (thiz.y < groundLocation && thiz.currentAction !== 'jumping' && (function() {
							for (var i = obstacles.length - 1; i >= 0; --i) {
								if (collides(thiz, obstacles[i])) return false;
							}
							return true;
						})()) {
							thiz.action('falling');
						}
						//obstacles to jump over
						if (obstacle.type === 1) {
							//...to be continued
						}
						//BULLET COLLISIONS

					});
				}
			};
			RETURN.setPrototypes = function(Player) { //set prototypes for Player and Ad classes
				Player.prototype.action = function(what) {
					//conditional because we only need actions for movement
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
							this.vy = height / 130;
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
				$(document).keydown(function(e) {
					//dont register movement keys if in mid-air
					var key = e.keyCode;
					if (player.numToAction(key) !== false) { //is key valid?
						if (player.currentAction !== 'jumping' && key !== 32) { //if not jumping and not shooting
							//do different action depending on key code of key press
							var action = player.numToAction(key);
							//horizontal movement requires a more static identifier for accurate landing + movement
							if (action === 'moving right' || action === 'moving left') player.lastAction = action;
							player.action(action);
							//dont add duplicate actions, since keyup is constantly called when held down
							if (!inArray(player.currentActions, action)) {
								player.currentActions.push(action);
							}
						}
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
					var obstacles = RETURN.stageObject.obstacles;
					if ((key === 39 || key === 37) && (!(function() {
						for (var i = obstacles.length - 1; i >= 0; --i) {
							if (collides(player, obstacles[i])) return false;
						}
						return true;
					})() || player.y === groundLocation)) {
						player.action('standing'); //stop player
					}
					//remove action associated with key
					removeFromArray(player.currentActions, player.numToAction(key));
					if (key === 39 || key === 37) player.lastAction = null;
				});
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
	//requestAnimationFrame polyfill by Erik Möller. fixes from Paul Irish and Tino Zijdel
	(function() {
		var lastTime = 0;
		var vendors = ['ms', 'moz', 'webkit', 'o'];
		for (var x = 0, len = vendors.length; x < len && !window.requestAnimationFrame; ++x) {
			window.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
			window.cancelAnimationFrame = window[vendors[x] + 'CancelAnimationFrame'] || window[vendors[x] + 'CancelRequestAnimationFrame'];
		}
		if (!window.requestAnimationFrame)
			window.requestAnimationFrame = function(callback, element) {
				var currTime = new Date().getTime();
				var timeToCall = Math.max(0, 16 - (currTime - lastTime));
				var id = window.setTimeout(function() {
						callback(currTime + timeToCall);
					},
					timeToCall);
				lastTime = currTime + timeToCall;
				return id;
			};
		if (!window.cancelAnimationFrame)
			window.cancelAnimationFrame = function(id) {
				clearTimeout(id);
			};
	}());
	//start animation loop and just keep drawing and updating
	(function animloop() {
		//only keep animating if game is active
		if (data.gameIsPlaying) {
			requestAnimationFrame(animloop);
			update(); //update coordinate and game data
			draw(); //redraw information of the canvas
		} else cancelAnimationFrame(animloop);
	})();
}