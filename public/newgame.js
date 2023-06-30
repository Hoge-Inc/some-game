// setup and run Box2D.
// game, coin collector

// create an instance of the engine
var engine = Engine.create();

// create an instance of the renderer
var render = Render.create({
    element: document.body,
    engine: engine,
    options: {
        width: 800,
        height: 600,
        wireframes: false,
        background: '#000000'
    }
});

// create an instance of the runner
var runner = Runner.create();

// create an instance of the mouse
var mouse = Mouse.create(render.canvas);

// create an instance of the mouse constraint
var mouseConstraint = MouseConstraint.create(engine, {
    mouse: mouse,
    constraint: {
        stiffness: 0.2,
        render: {
            visible: false
        }
    }
});

// create an instance of the world
var world = engine.world;

// add mouse constraint to the world
World.add(world, mouseConstraint);

// run the engine
Engine.run(engine);

// run the renderer
Render.run(render);

// run the runner
Runner.run(runner, engine);

// run the mouse
Mouse.run(mouse, engine);

// create a new game
var game = new Game();

// run the game
game.run();










