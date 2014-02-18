//Game manipulation JS (main canvas layer)
//function inArray and removeFromArray in functions.js
var canvas = document.getElementById('game');
var ctx = canvas.getContext('2d');
//make game canvas full screen
canvas.width = document.width;
canvas.height = document.height;
//some basic positions ( temp, cant use vars in the future for level scope D: )
var groundHeight = canvas.height / 6;
var groundLocation = canvas.height - groundHeight - 30;
var jumpHeight = canvas.height / 1.6;
var data = {
	highScore: null,
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
		L1: {
			playerObject: { //generate attributes object for a player
				name: null,
				health: 100, //temp
				playerIsFacing: 'right', //right/left
				x: 40, //X & Y coordinates
				y: groundLocation,
				vx: 0, //horizontal velocity
				vy: 0, //vertical velocity
				color: '#000',
				width: 50,
				height: 150,
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
					//contantly do everything above the switch regardless of action
					this.x += this.vx; //left-right
					this.y += this.vy; //up-down
					if (this.y <= jumpHeight) { //if we get too high
						this.vy = 3; //start falling down again (canvas in inverted in y so positive means going down)
					} else if (this.y >= groundLocation) { //when we're back where we jumped from
						this.vy = 0; //we just hit the ground again so stop
						//if we're not moving left or right when we hit the ground stop
						if (this.currentAction === 'jumping') {
							removeFromArray(this.currentActions, 'jumping');
							if (!(this.lastAction === 'moving right') && !(this.lastAction === 'moving left')) {
								this.action('standing'); //reset from jumping to just standing
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
					ctx.strokeStyle = this.color;
					//draw stick figure
					ctx.beginPath();
					ctx.arc(this.x, this.y, 30, 0, 2 * Math.PI); //head
					ctx.stroke();
					//hijack this update for projectiles as well
					this.projectiles.forEach(function(projectile) {
						projectile.draw();
					});
				},
				fireFrom: function() { //we will fire from the middle of player atm
					return {
						x: this.x + 30, //this.width / 2
						y: this.y - 15, //this.height / 2
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
					self.isWithinStage = function() {
						return self.x >= 0 && self.x <= canvas.width &&
							self.y >= 0 && self.y <= canvas.height;
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
				}
			},
			stageObject: { //object contains functions defining how the stage will change over time
				update: function() {

				},
				draw: function() {
					ctx.strokeStyle = '#000';
					ctx.rect(0, canvas.height, canvas.width, -groundHeight);
					ctx.stroke();
				}
			},
			setPrototypes: function(Player, Ad) { //set prototypes for Player and Ad classes
				Player.prototype.action = function(what) {
					//conditional because we only need actions for movement
					if (what !== 'shooting') this.currentAction = what; //what is the player doing now?
					switch (what) { //launch initial action (then dynamics are handled in player.update())
						case 'standing':
							this.vx = 0;
							this.vy = 0;
							break;
						case 'jumping':
							this.vy = -3; //canvas is inverted so make velocity negative to go up
							break;
						case 'moving right':
							this.vx = 2;
							break;
						case 'moving left':
							this.vx = -2;
							break;
						case 'shooting':
							this.shoot();
							break;
					}
				}
			},
			//listen for events for this level
			handleEvents: function(player) { //player as param because its undefined as of yet
				$(document).keydown(function(e) {
					//dont register movement keys if in mid-air
					var key = e.keyCode;
					if (player.numToAction(key) !== false) { //is key valid?
						if (player.currentAction !== 'jumping' && key !== 32) { // not jumping and not shooting
							//all trues in this conditional allow another action to happen at the same time
							//if (player.currentAction === 'standing' || player.currentAction === 'moving right' || player.currentAction === 'moving left') {
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
					//also make sure we're on the ground when we do that
					if (player.y === groundLocation && (key === 39 || key === 37)) {
						player.action('standing'); //stop player
					}
					//remove action associated with key
					removeFromArray(player.currentActions, player.numToAction(key));
					if (key === 39 || key === 37) player.lastAction = null;
				});
			}
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
	Player.prototype.constructor = Player;
	Player.prototype.geneCode = function() {

	};
	///////////////////////////////////////////////////////////////////////////////////
	var Enemy = function(attrs) {
		GameElement.call(this, attrs);
	};
	Enemy.prototype = Object.create(GameElement.prototype);
	Enemy.prototype.constructor = Enemy;
	///////////////////////////////////////////////////////////////////////////////////
	var Ad = function(attrs) { //extends enemy
		Enemy.call(this, attrs);
	};
	Ad.prototype = Object.create(Enemy.prototype);
	Ad.prototype.constructor = Ad;
	//When Ad collides with player, fill the screen and sell product for a moment
	Ad.prototype.fillScreen = function() {

	};
	//Sometimes we will want the ads to say something....
	Ad.prototype.speak = function() {

	};
	///////////////////////////////////////////////////////////////////////////////////
	var Stage = function(attrs) {
		GameElement.call(this, attrs);
	};
	Stage.prototype = Object.create(GameElement.prototype);
	Stage.prototype.constructor = Stage;
	///////////////////////////////////////////////////////////////////////////////////
	//some prototypes of Player and Ad will depend on the level so...
	var levelHandler = data.levels[data.currentLevel]; //first shorthand access to current level functions
	levelHandler.setPrototypes(Player); //set prototypes depending on current level
	var player = new Player(levelHandler.playerObject); //Add player (There is only one!)
	var stage = new Stage(levelHandler.stageObject); //create the stage
	levelHandler.handleEvents(player);
	//update and draw simply call corresponding functions
	//NOTE: update and draw functions change internally depending on level
	var update = function() { //update all coordinates and game data
		player.update();
		stage.update();
	};
	//NOTE: update and draw functions change internally depending on level
	var draw = function() { //draw on canvas according to game data
		ctx.clearRect(0, 0, canvas.width, canvas.height); //clear the canvas
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