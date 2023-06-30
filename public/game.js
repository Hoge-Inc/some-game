// setup and run Box2D.
// game, coin collector


// Section - Constants
const DEBUG = true
const NUMBER_OF_IMAGES = 3;
const PLAYER_RESIZE = .2 // 1.0 = 100%
const COIN_RESIZE = .3 // 1.0 = 100%
const GROUND_RESIZE = .3 // 1.0 = 100%
const PLAYER_MASS = 50;  // Usually in kg
const PLAYER_DENSITY = 5; // Usually in kg/m^2.
const PLAYER_FRICTION = .3; // Usual range [0,1]
const PLAYER_RESTIRUTION = .1; // (elasticity) Usual range [0,1]
const PLAYER_DAMP = .1
const GRAVITY_UNITS = 20;
const FORCE_FACTOR = 5000;
const MAX_JUMPS = 2;
const JUMP_FACTOR = FORCE_FACTOR * FORCE_FACTOR
const sleep = (milliseconds) => { return new Promise(resolve => setTimeout(resolve, milliseconds)) }
const canvas = document.getElementById('gameCanvas');
const context = canvas.getContext("2d");

// Section - IPFS Setup
const hogeincIpfs = "https://hogeinc.mypinata.cloud/ipfs/";
const ipfs = {
  image: {
    ground: hogeincIpfs + "QmNyzbXqUXzCH4NGp1QyPifsPB61YprLxBfspLGEz3dshU",
    background: hogeincIpfs + "QmdqUB643miPcNTswnT8M8ZzqqEZWqE6JnBmfrmMerRqWr",
    player: hogeincIpfs + "QmQyLXMHejPPFyXvYi3sZRtPHN2BkEEyUcaFPeoVhZiy7T",
    coin: hogeincIpfs + "QmSZAxML86Q9WqEPz7xSM5pdb1VLdMECAzynmnhw14rfKR"
  },
  sound: {
    coin: hogeincIpfs + "QmdswmBDH5AWcafemDKisWXqqg6B14bAhBtLrXSL1ZbM3t"
  },
  animation: {}
};

// Section - Sound Setup
class Sound {
    constructor(src) {
        this.sound = document.createElement("audio");
        this.sound.src = src;
        this.sound.setAttribute("preload", "auto");
        this.sound.setAttribute("controls", "none");
        this.sound.style.display = "none";
        document.body.appendChild(this.sound);
    }
    play(){
        this.sound.play();
    }
    stop(){
        this.sound.pause();
    }
}



const playerImage = new Image();
const coinImage = new Image();
const groundImage = new Image();
const coinSound = new Sound(ipfs.sound.coin);
const coinBodies = [];
const platformBodies = [];
const platforms = []; // To store all platform bodies
const numPlatforms = 5; // Number of platforms
const platformWidth = canvas.width / 6; // Platform width
const platformHeight = 5; // Platform height
const playerStartX = canvas.width - 200;
const playerStartY = canvas.height - 100;
var bodiesToDestroy = [];
var canJump = false; // for double jump
var jumps = 0;  // to track jumps


// Play sound once user interacts with the page
var userInteracted = false;
window.addEventListener('click', function() {
    userInteracted = true;
});

window.addEventListener('keydown', function() {
    userInteracted = true;
});



// Section - Load Images
var imagesLoaded = 0;
// Only start the game loop when both images are loaded
function startGameLoop() {
    imagesLoaded++;

    if(imagesLoaded == NUMBER_OF_IMAGES) { 
        requestAnimationFrame(gameLoop);
    }
}


// Section - Setup Box2D aliases
var   b2Vec2 = Box2D.Common.Math.b2Vec2
    , b2BodyDef = Box2D.Dynamics.b2BodyDef
    , b2Body = Box2D.Dynamics.b2Body
    , b2FixtureDef = Box2D.Dynamics.b2FixtureDef
    , b2World = Box2D.Dynamics.b2World
    , b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape
    , b2CircleShape = Box2D.Collision.Shapes.b2CircleShape;
// Setup the world
var world = new b2World(new b2Vec2(0, GRAVITY_UNITS), true);


// Section - Create Box2D Player
var playerBodyDef = new b2BodyDef();
playerBodyDef.type = b2Body.b2_dynamicBody;
playerBodyDef.position.Set(playerStartX, playerStartY);
var playerBody = world.CreateBody(playerBodyDef);

playerImage.onload = function() {
    playerImage.width = playerImage.width * PLAYER_RESIZE;
    playerImage.height = playerImage.height * PLAYER_RESIZE;
    var playerFixDef = new b2FixtureDef();
    playerFixDef.density = PLAYER_DENSITY;
    playerFixDef.friction = PLAYER_FRICTION;
    playerFixDef.restitution = PLAYER_RESTIRUTION;
    playerFixDef.shape = new b2PolygonShape;
    playerFixDef.shape.mass = PLAYER_MASS;
    playerFixDef.shape.SetAsBox(playerImage.width / 3, playerImage.height / 2.6);
    playerBody.CreateFixture(playerFixDef);
    playerBody.SetLinearDamping(PLAYER_DAMP);
    playerBody.SetAngularDamping(PLAYER_DAMP);
    startGameLoop();
};
playerImage.src = ipfs.image.player;


// Section - Create Box2D Coins
coinImage.onload = function() {
    var coinBodyDef = new b2BodyDef();
    coinImage.width = coinImage.width * COIN_RESIZE;
    coinImage.height = coinImage.height * COIN_RESIZE;
    var coinFixDef = new b2FixtureDef();
    let circleShape = new b2CircleShape;
    circleShape.m_radius = Math.min(coinImage.width, coinImage.height) / 2;
    coinFixDef.shape = circleShape;
    coinBodyDef.type = b2Body.b2_staticBody;
    for(let i=0; i<10; i++) {
        let posX = Math.random()*canvas.width - circleShape.m_radius - 20
        let posY = Math.random()*canvas.height - circleShape.m_radius - canvas.height/8
        coinBodyDef.position.Set(posX, posY);
        var coinBody = world.CreateBody(coinBodyDef);
        coinBody.CreateFixture(coinFixDef);
        coinBodies.push(coinBody);
    }

    startGameLoop();
};
coinImage.src = ipfs.image.coin;


// Section - Create Box2D Platforms
groundImage.onload = function() {
    groundImage.width = groundImage.width * GROUND_RESIZE;
    groundImage.height = groundImage.height * GROUND_RESIZE;
    var platformBodyDef = new b2BodyDef();
    platformBodyDef.type = b2Body.b2_staticBody;
    var platformFixDef = new b2FixtureDef();
    platformFixDef.shape = new b2PolygonShape;

    for(let i=0; i<numPlatforms; i++) {
        let posX;
        do {
            posX = Math.random() * (canvas.width - platformWidth);
        } while (i == 0 && posX > playerStartX - platformWidth && posX < playerStartX + playerImage.width);
        let posY;
        if (i == 0) {
            posY = canvas.height - playerImage.height/3 ; // Y position of the first platform is at the player's Y start position
        } else {
            posY = (canvas.height - playerImage.height/2) - playerImage.height/2 * i; // For subsequent platforms, Y position is 1.5 times the player's height multiplied by the iteration index
        }

        platformBodyDef.position.Set(posX, posY);
        platformFixDef.shape.SetAsBox(platformWidth / 2 , platformHeight); 
        var platformBody = world.CreateBody(platformBodyDef);
        platformBody.CreateFixture(platformFixDef);
        platformBodies.push(platformBody);
    }

    startGameLoop();
};
groundImage.src = ipfs.image.ground;




// Section - Create Ground
var groundBodyDef = new b2BodyDef();
groundBodyDef.type = b2Body.b2_staticBody;
groundBodyDef.position.Set(canvas.width, canvas.height);

var fixDef = new b2FixtureDef();
fixDef.shape = new b2PolygonShape;
fixDef.shape.SetAsBox(canvas.width * 1.5 , 5);

var groundBody = world.CreateBody(groundBodyDef);
groundBody.CreateFixture(fixDef);


// Section - Setup Keyboard Input
var keys = {};
window.onkeydown = function(e) {keys[e.key] = true; }
window.onkeyup = function(e) { keys[e.key] = false; }


// Section - Update Image draw
var updateDraw = function (_image, _body, _width=_image.width, _height=_image.height) {
    context.save(); // Save the current context state
    var bodyPos = _body.GetPosition();
    context.translate(bodyPos.x, bodyPos.y);
    context.rotate(_body.GetAngle());
    if (_image == playerImage) { context.drawImage(_image, -_width / 2, -_height / 2, _width, _height); }
    else { context.drawImage(_image, -_width / 2, -_height / 2, _width, _height); }
    context.restore(); // Restore the context state to what it was before we translated/rotated it
}



// Section - Contact Listener

var listener = new Box2D.Dynamics.b2ContactListener;
listener.BeginContact = function(contact) {
    if ((contact.GetFixtureA().GetBody() == playerBody && contact.GetFixtureB().GetBody() == groundBody) ||
        (contact.GetFixtureB().GetBody() == playerBody && contact.GetFixtureA().GetBody() == groundBody)) {
        canJump = true;
        jumps = 0;
    } 

    // Define coinBody based on which fixture the player is contacting
    var coinBody = (contact.GetFixtureA().GetBody() == playerBody) ?
      contact.GetFixtureB().GetBody() : contact.GetFixtureA().GetBody();

    if ((contact.GetFixtureA().GetBody() == playerBody && coinBodies.includes(coinBody)) ||
        (contact.GetFixtureB().GetBody() == playerBody && coinBodies.includes(coinBody))) {
        if(userInteracted) {
            coinSound.play();
        }
        bodiesToDestroy.push(coinBody);
        coinBodies.splice(coinBodies.indexOf(coinBody), 1);
    }
 
    if ((contact.GetFixtureA().GetBody() == playerBody && platformBodies.includes(contact.GetFixtureB().GetBody())) ||
        (contact.GetFixtureB().GetBody() == playerBody && platformBodies.includes(contact.GetFixtureA().GetBody()))) {

        let player = contact.GetFixtureA().GetBody() == playerBody ? contact.GetFixtureA() : contact.GetFixtureB();
        let platform = contact.GetFixtureA().GetBody() == playerBody ? contact.GetFixtureB() : contact.GetFixtureA();

        let playerPos = player.GetBody().GetPosition();
        let platformPos = platform.GetBody().GetPosition();

        if ( (playerPos.y -  - playerImage.width/2 <= platformPos.y + platformHeight) && 
        (playerPos.x  >= platformPos.x - platformWidth / 2 && 
         playerPos.x +  - playerImage.width <= platformPos.x + platformWidth / 2)) {
            canJump = true;
            jumps = 0;
        }
    }
}

listener.EndContact = function(contact) {
    if ((contact.GetFixtureA().GetBody() == playerBody && contact.GetFixtureB().GetBody() == groundBody) ||
        (contact.GetFixtureB().GetBody() == playerBody && contact.GetFixtureA().GetBody() == groundBody)) {
            //canJump = true;
            //jumps = 0;
    }
}

world.SetContactListener(listener);

// Section - Move fucntion
var forceVec = (direction, style = 'walk') => {
    if(style == 'jump') {
        if (direction == 'left') return new b2Vec2(-10 * JUMP_FACTOR, -1 * JUMP_FACTOR)
        if (direction == 'right') return new b2Vec2(10 * JUMP_FACTOR, -10 * JUMP_FACTOR)
        if (direction == 'up') return new b2Vec2(0, -JUMP_FACTOR)
        //if (direction == 'down') return new b2Vec2(0, 2*FORCE_FACTOR)
    } else if (style == 'walk') {
        if (direction == 'left') return new b2Vec2(-2000*FORCE_FACTOR, 0)
        if (direction == 'right') return new b2Vec2(2000*FORCE_FACTOR, 0)
        if (direction == 'up') return new b2Vec2(0, -FORCE_FACTOR)
        if (direction == 'down') return new b2Vec2(0, 2000*FORCE_FACTOR)
    }
}
var move = function(_body, direction, style = 'walk', type = '') {
    const force = forceVec(direction, style)
    if (type == '' && style == 'walk') type = 'force'
    if (type == '' && style == 'jump') type = 'impulse'
    var point = _body.GetWorldCenter();

    if(style == 'jump') {
        // Adjust the y-coordinate to apply the force a bit lower than the center
        point.y += 0.5;
    }

    if (type == 'impulse') _body.ApplyImpulse(force, _body.GetWorldCenter());
    if (type == 'force') _body.ApplyForce(force, _body.GetWorldCenter());
}


function checkMoveKeys() {
    if (keys['ArrowLeft']) move(playerBody,'left');
    if (keys['ArrowRight']) move(playerBody,'right');
    if (keys['ArrowUp']) move(playerBody,'up');
    if (keys['ArrowDown']) move(playerBody,'down');
}
function checkJumpKeys() {
    if (jumps >= MAX_JUMPS) canJump = false;
    if (canJump && jumps <= MAX_JUMPS) {
        if (keys['ArrowLeft'] && keys[' ']) {
            move(playerBody,'left','jump', 'force'); 
            move(playerBody, 'up', 'jump') 
            console.log(++jumps)
        }
        else if (keys['ArrowRight'] && keys[' ']) {
            if (jumps <= MAX_JUMPS) { move(playerBody,'right', 'jump'); }
            if (jumps == 1) { move(playerBody, 'up', 'jump', 'force') }
            console.log(++jumps)
        }
        else if (keys[' ']) {
            if (jumps <= MAX_JUMPS ) {move(playerBody,'up', 'jump'); }
            if (jumps == MAX_JUMPS - 1) { move(playerBody, 'up', 'jump') }
            console.log(++jumps)
        }
    }
}



// Section - Game Loop
processingJumps = false;
processTime = 400;
var gameLoop = async function() {
    if (DEBUG) {
        if (keys['i']) document.getElementById("debugCanvas").style.zIndex=1
        if (keys['I']) document.getElementById("debugCanvas").style.zIndex=3
        if (keys['o']) document.getElementById("debugCanvas").hidden=true
        if (keys['O']) document.getElementById("debugCanvas").hidden=false
    }

    // Key inputs
    checkMoveKeys();
    if (!processingJumps) {
        processingJumps = true;
        checkJumpKeys();
        sleep(processTime).then(() => { processingJumps = false; });
    }

    // Down force
    move(playerBody, 'down', 'walk') 

    // Clear canvas
    context.clearRect(0, 0, canvas.width, canvas.height);

    // Draw player
    updateDraw(playerImage, playerBody)

    // Draw coins
    coinBodies.forEach((coinBody, index) => {
        updateDraw(coinImage, coinBody)
    });

    // Draw platforms
    platformBodies.forEach((platformBody, index) => {
        updateDraw(groundImage, platformBody)
    });

    // Destroy all bodies marked for deletion
    for (var i = 0; i < bodiesToDestroy.length; ++i) {
        world.DestroyBody(bodiesToDestroy[i]);
    }
    bodiesToDestroy = [];

    world.Step(1 / 60, 10, 10);
    world.DrawDebugData();
    world.ClearForces();

    requestAnimationFrame(gameLoop);
};

var debugDraw = new Box2D.Dynamics.b2DebugDraw();
debugDraw.SetSprite(document.getElementById("debugCanvas").getContext("2d"));
debugDraw.SetFillAlpha(0.5);
debugDraw.SetLineThickness(1.0);
debugDraw.SetFlags(Box2D.Dynamics.b2DebugDraw.e_shapeBit | Box2D.Dynamics.b2DebugDraw.e_jointBit);

if(DEBUG)world.SetDebugDraw(debugDraw);